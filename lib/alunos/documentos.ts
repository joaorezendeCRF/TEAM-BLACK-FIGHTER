// Metadados e caminhos de armazenamento só existem na camada de servidor.
import "server-only";
// UUIDs identificam versão, grupo lógico e objeto sem utilizar nomes pessoais.
import { randomUUID } from "node:crypto";
// Resolução de caminhos impede usar uma pasta pública como armazenamento privado.
import path from "node:path";
// O pool pertence ao mesmo banco aprovado para as sete tabelas.
import pool from "@/lib/mysql";
// Tipagem das consultas e verificações transacionais.
import type { RowDataPacket } from "mysql2";
// Cada operação repete autorização e registra somente o ato na auditoria.
import { auditar, cadastrosHabilitados, conferirAutor } from "./persistencia";
// A identidade sempre vem da sessão ativa do servidor.
import type { CadastroActor } from "./cadastro";
// Lista somente metadados autorizados, sem expor chaves privadas.
import type { DocumentoResumo } from "./tipos";
// Mantém a escrita imutável, cópias e conferência de integridade separadas do banco.
import { guardarDuasCopias, identificarArquivo, lerCopiaIntegra, resumoArquivo } from "./arquivos-privados";
// Somente estes tipos administrativos podem ser classificados pelo formulário.
export const TIPOS_DOCUMENTO = ["termo_assinado", "ficha_assinada", "outro"] as const;
// O ambiente local usa duas raízes configuradas fora do código publicado e fora do projeto.
function pastasPrivadas() {
  // A aplicação recusa configuração ausente, em vez de usar public como alternativa.
  const raiz = process.env.TBF_DOCUMENTOS_DIR ?? "", copia = process.env.TBF_DOCUMENTOS_COPIA_DIR ?? "";
  // Evita raízes relativas ou pastas que poderiam ser incluídas no código ou no build.
  const foraDoProjeto = (pasta: string) => {
    // Caminho privado é configuração de execução, não dependência a ser incluída no build.
    const absoluto = path.resolve(/* turbopackIgnore: true */ pasta).toLowerCase();
    // A referência ao projeto serve somente à validação de isolamento de armazenamento.
    const projeto = path.resolve(/* turbopackIgnore: true */ process.cwd()).toLowerCase();
    // Recusa a raiz do projeto e qualquer descendente, inclusive public e .next.
    return path.isAbsolute(pasta) && absoluto !== projeto && !absoluto.startsWith(projeto + path.sep);
  };
  // Cada origem precisa ser externa ao projeto e diferente da outra.
  if (!foraDoProjeto(raiz) || !foraDoProjeto(copia) || path.resolve(/* turbopackIgnore: true */ raiz).toLowerCase() === path.resolve(/* turbopackIgnore: true */ copia).toLowerCase()) throw Object.assign(new Error("Armazenamento não configurado."), { code: "TBF_CONFIG_ARMAZENAMENTO" });
  // Não envia estes caminhos ao navegador.
  return { raiz, copia };
}
// UUID válido reduz entradas ambíguas antes das consultas parametrizadas.
export const uuidValido = (id: string) => /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(id);
// A listagem só ocorre após revalidar o autor dentro da transação de leitura auditada.
export async function listarDocumentos(matricula: string, autor: CadastroActor): Promise<DocumentoResumo[]> {
  // O modo de testes habilitado e o identificador são condições obrigatórias.
  if (!cadastrosHabilitados() || !uuidValido(matricula)) throw new Error("Acesso indisponível.");
  // Mantém autorização, seleção e registro de acesso juntos.
  const conexao = await pool.getConnection();
  // Falhas não retornam uma lista parcialmente autorizada.
  try {
    // Inicia a consulta protegida que também grava o ato de acesso.
    await conexao.beginTransaction();
    // Confere existência, situação e perfil atual da conta autora.
    await conferirAutor(conexao, autor);
    // A matrícula precisa pertencer ao conjunto de testes liberado nesta etapa.
    const [matriculas] = await conexao.execute<RowDataPacket[]>("SELECT m.id FROM tbf_matriculas m INNER JOIN tbf_alunos a ON a.id = m.aluno_id WHERE m.id = ? AND a.ambiente_teste = 1", [matricula]);
    // O mesmo retorno genérico evita divulgar a existência de outros registros.
    if (!matriculas.length) throw new Error("Matrícula indisponível.");
    // Não seleciona objeto privado, hash, nome original nem conteúdo do arquivo.
    const [linhas] = await conexao.execute<RowDataPacket[]>("SELECT id, versao, tipo, mime, tamanho_bytes, DATE_FORMAT(criado_em, '%Y-%m-%dT%H:%i:%sZ') AS criado, estado FROM tbf_documentos_versoes WHERE matricula_id = ? ORDER BY criado_em DESC, versao DESC", [matricula]);
    // Registra o acesso sem anexar os dados consultados ao evento.
    await auditar(conexao, autor.id, matricula, "documentos", "listar");
    // Confirma a leitura autorizada e seu registro de auditoria.
    await conexao.commit();
    // Apenas metadados necessários são serializados para a tela.
    return linhas.map((linha) => ({ id: linha.id, versao: Number(linha.versao), tipo: linha.tipo, mime: linha.mime, tamanho: Number(linha.tamanho_bytes), criado: linha.criado, estado: linha.estado }));
  } catch (erro) {
    // Uma recusa não deixa um evento parcial ou resultado autorizado pela metade.
    await conexao.rollback();
    // A rota traduz a falha para mensagem pública.
    throw erro;
  } finally {
    // A conexão sempre volta ao pool.
    conexao.release();
  }
}
// Registra pendência, cria as duas cópias e publica a versão somente após conferir os bytes.
export async function anexarDocumento(matricula: string, tipo: string, bytes: Uint8Array, autor: CadastroActor) {
  // Tamanho e assinatura são conferidos independentemente do tipo declarado pelo navegador.
  const mime = identificarArquivo(bytes);
  // Nenhum dado é escrito quando formato, classificação ou vínculo são inválidos.
  if (!cadastrosHabilitados() || !uuidValido(matricula) || !TIPOS_DOCUMENTO.some((item) => item === tipo) || !mime) throw Object.assign(new Error("Arquivo inválido. Use PDF, PNG ou JPEG de até 5 MB."), { code: "TBF_ARQUIVO_INVALIDO" });
  // A configuração privada precisa existir antes de criar metadados pendentes.
  const { raiz, copia } = pastasPrivadas();
  // A chave é exclusiva por versão e jamais incorpora o nome enviado pelo usuário.
  const id = randomUUID(), chave = randomUUID() + ".bin", hash = resumoArquivo(bytes);
  // A primeira transação reserva a versão sob bloqueio da matrícula.
  const conexao = await pool.getConnection();
  // Mesmo uma falha de arquivo deixará um estado identificável para reconciliação.
  try {
    // Impede duas solicitações de escolherem o mesmo número de versão.
    await conexao.beginTransaction();
    // Revalida a conta no instante da reserva.
    await conferirAutor(conexao, autor);
    // O bloqueio serializa versões apenas daquela matrícula.
    const [matriculas] = await conexao.execute<RowDataPacket[]>("SELECT m.id FROM tbf_matriculas m INNER JOIN tbf_alunos a ON a.id = m.aluno_id WHERE m.id = ? AND a.ambiente_teste = 1 FOR UPDATE", [matricula]);
    // Não permite anexar a matrícula ausente ou fora do ambiente de testes.
    if (!matriculas.length) throw new Error("Matrícula indisponível.");
    // Limita envios durante os testes sem apagar qualquer versão anterior.
    const [quantidade] = await conexao.execute<RowDataPacket[]>("SELECT COUNT(*) AS total FROM tbf_documentos_versoes WHERE matricula_id = ?", [matricula]);
    // Evita crescimento acidental de armazenamento por envios repetidos.
    if (Number(quantidade[0]?.total) >= 100) throw new Error("Limite de versões de teste atingido.");
    // Cada tipo de documento possui seu grupo lógico e sequência próprios.
    const [anteriores] = await conexao.execute<RowDataPacket[]>("SELECT documento_id, versao FROM tbf_documentos_versoes WHERE matricula_id = ? AND tipo = ? ORDER BY versao DESC LIMIT 1", [matricula, tipo]);
    // Uma falha anterior também ocupa versão; seu número nunca é reutilizado.
    const grupo = anteriores[0]?.documento_id ?? randomUUID(), versao = Number(anteriores[0]?.versao ?? 0) + 1;
    // O estado pendente ainda não permite abertura do arquivo.
    await conexao.execute("INSERT INTO tbf_documentos_versoes (id, documento_id, matricula_id, versao, tipo, objeto_privado, mime, tamanho_bytes, sha256, estado, enviado_por) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendente', ?)", [id, grupo, matricula, versao, tipo, chave, mime, bytes.length, hash, autor.id]);
    // Registra a tentativa com autoria, sem nome original ou conteúdo.
    await auditar(conexao, autor.id, id, "documento", "envio_pendente");
    // A reserva sobrevive a uma falha posterior de disco ou interrupção do processo.
    await conexao.commit();
  } catch (erro) {
    // Uma falha anterior à reserva não deixa metadados parciais.
    await conexao.rollback();
    // O chamador recebe somente uma orientação pública.
    throw erro;
  } finally {
    // Não mantém uma conexão presa enquanto escreve os arquivos.
    conexao.release();
  }
  // Arquivos e banco não compartilham uma transação; os estados tornam essa fronteira explícita.
  try {
    // Cria arquivos exclusivos e confere original e cópia após a sincronização.
    await guardarDuasCopias(raiz, copia, chave, bytes);
    // Publicação revalida a conta antes de disponibilizar a nova versão.
    const publicacao = await pool.getConnection();
    // Uma revogação entre envio e publicação mantém o registro indisponível.
    try {
      // Atualização e auditoria de publicação precisam ser confirmadas juntas.
      await publicacao.beginTransaction();
      // A conta autora precisa continuar ativa.
      await conferirAutor(publicacao, autor);
      // Só a reserva original pode mudar de pendente para disponível.
      await publicacao.execute("UPDATE tbf_documentos_versoes SET estado = 'disponivel' WHERE id = ? AND estado = 'pendente'", [id]);
      // Registrar disponibilidade não implica conferir a assinatura da pessoa.
      await auditar(publicacao, autor.id, id, "documento", "disponibilizar");
      // Confirma que a versão pode ser aberta por sessões autorizadas.
      await publicacao.commit();
    } catch (erro) {
      // Um erro de publicação não apaga objetos já gravados nem versões anteriores.
      await publicacao.rollback();
      // A etapa externa marca a tentativa como falha rastreável.
      throw erro;
    } finally {
      // Libera a conexão inclusive em revogação de acesso.
      publicacao.release();
    }
    // O cliente não recebe chave de armazenamento ou hash.
    return { id };
  } catch (erro) {
    // Preserva metadados de falha e qualquer objeto parcial para diagnóstico/reconciliação.
    await pool.execute("UPDATE tbf_documentos_versoes SET estado = 'falha' WHERE id = ? AND estado = 'pendente'", [id]);
    // Nunca afirma que um arquivo incompleto foi anexado com sucesso.
    throw erro; // O código técnico original permite diagnosticar disco cheio ou acesso negado, sem exibir a exceção ao usuário.
  }
}
// Abre somente uma versão disponível depois de autorização e conferência de integridade.
export async function abrirDocumento(id: string, autor: CadastroActor) {
  // Identificadores e modo são novamente conferidos no acesso direto pela URL.
  if (!cadastrosHabilitados() || !uuidValido(id)) throw new Error("Documento indisponível.");
  // A conexão mantém autoria validada durante a leitura e seu registro de acesso.
  const conexao = await pool.getConnection();
  // Uma falha nunca entrega bytes antes de terminar as verificações.
  try {
    // Leitura autorizada e auditoria são confirmadas juntas.
    await conexao.beginTransaction();
    // Revalida conta ativa e perfil no servidor, não apenas no layout.
    await conferirAutor(conexao, autor);
    // Só documentos já publicados de cadastros de teste são elegíveis.
    const [linhas] = await conexao.execute<RowDataPacket[]>("SELECT d.objeto_privado, d.sha256, d.tamanho_bytes, d.mime, d.versao, d.tipo FROM tbf_documentos_versoes d INNER JOIN tbf_matriculas m ON m.id = d.matricula_id INNER JOIN tbf_alunos a ON a.id = m.aluno_id WHERE d.id = ? AND d.estado = 'disponivel' AND a.ambiente_teste = 1", [id]);
    // Mesma falha para identificador inexistente ou indisponível.
    if (!linhas[0]) throw new Error("Documento indisponível.");
    // O caminho vem exclusivamente dos metadados reservados pelo servidor.
    const documento = linhas[0], { raiz, copia } = pastasPrivadas();
    // Caso a principal falhe, somente uma segunda cópia com hash íntegro será aceita.
    const leitura = await lerCopiaIntegra(raiz, copia, documento.objeto_privado, documento.sha256, Number(documento.tamanho_bytes));
    // Diferencia recuperação de cópia sem registrar o conteúdo do arquivo.
    await auditar(conexao, autor.id, id, "documento", leitura.recuperado ? "abrir_copia_recuperacao" : "abrir");
    // A auditoria fica registrada antes de enviar os bytes.
    await conexao.commit();
    // MIME foi validado na entrada e é usado com nosniff e sandbox na rota.
    return { bytes: leitura.bytes, mime: String(documento.mime), versao: Number(documento.versao), tipo: String(documento.tipo) };
  } catch (erro) {
    // Recusa ou falha de integridade não deixa um acesso registrado como concluído.
    await conexao.rollback();
    // A rota responde sem SQL ou caminhos internos.
    throw erro;
  } finally {
    // Libera a conexão ao final da leitura ou da recusa.
    conexao.release();
  }
}
