// Registra somente origem, código conhecido e referência aleatória das falhas.
import { registrarFalha } from "@/lib/logs";
// Revalida a sessão ativa em cada listagem e envio de documentos.
import { obterUsuarioAutenticado } from "@/lib/autorizacao";
// O serviço protege vínculo, versões e objetos privados.
import { listarDocumentos, anexarDocumento } from "@/lib/alunos/documentos";
// Limita o corpo inteiro antes de interpretar o multipart em memória.
import { LIMITE_DOCUMENTO } from "@/lib/alunos/arquivos-privados";
// APIs de arquivo usam o runtime Node.js, sem depender de disco em execução de borda.
// Cache Components utiliza Node.js por padrão e não aceita configuração runtime por segmento.
// Todas as respostas desta API privada impedem cache no navegador ou intermediários.
const resposta = (dados: unknown, status = 200) => Response.json(dados, { status, headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
// Retorna todos os metadados autorizados da matrícula selecionada.
export async function GET(request: Request) {
  // A lista de alunos previamente aberta não substitui a verificação atual da sessão.
  const autor = await obterUsuarioAutenticado();
  // Visitantes não podem consultar metadados de anexos.
  if (!autor) return resposta({ mensagem: "Acesso não autorizado." }, 401);
  // Falhas não revelam SQL, chaves de objeto ou caminhos privados.
  try {
    // O serviço confirma matrícula e autor, e audita esta consulta.
    return resposta({ documentos: await listarDocumentos(new URL(request.url).searchParams.get("matricula") ?? "", autor) });
  } catch (erro) {
    // Não copia o identificador da matrícula ou o conteúdo dos documentos para o diagnóstico.
    const referencia = await registrarFalha("listar_documentos", erro);
    // A mesma mensagem cobre vínculo ausente, configuração indisponível ou recusa.
    return resposta({ mensagem: "Não foi possível consultar os documentos. Referência: " + referencia }, 400);
  }
}
// Recebe apenas um arquivo, um vínculo e uma classificação por solicitação.
export async function POST(request: Request) {
  // A origem precisa corresponder ao host do próprio sistema, protegendo o envio com cookie.
  const origem = request.headers.get("origin"), host = request.headers.get("host");
  // Exige Origin em operações mutáveis; não confia em hosts encaminhados pelo cliente.
  // Uma origem malformada também deve resultar em recusa controlada, sem exceção fora do tratamento.
  let origemValida = false;
  // O navegador precisa ter enviado o formulário a partir do próprio host do sistema.
  try { origemValida = Boolean(origem && host && new URL(origem).host === host); } catch { origemValida = false; }
  // Rejeita a requisição antes de consultar a sessão ou ler bytes.
  if (!origemValida) return resposta({ mensagem: "Origem de envio inválida." }, 403);
  // A sessão é conferida antes de ler o corpo potencialmente grande.
  const autor = await obterUsuarioAutenticado();
  // Conta ausente ou inativa não pode enviar arquivos.
  if (!autor) return resposta({ mensagem: "Acesso não autorizado." }, 401);
  // O multipart contém no máximo um documento e uma pequena margem para os campos.
  const limiteCorpo = LIMITE_DOCUMENTO + 65536;
  // Falhas de leitura e estrutura geram respostas públicas controladas.
  try {
    // O tipo precisa ser multipart; JSON e outros corpos são recusados.
    const tipo = request.headers.get("content-type") ?? "";
    // Content-Length é uma otimização; o limite também é conferido durante a leitura.
    if (!tipo.startsWith("multipart/form-data;") || Number(request.headers.get("content-length") ?? 0) > limiteCorpo) return resposta({ mensagem: "Use um arquivo de até 5 MB." }, 413);
    // Um corpo ausente não pode ser interpretado como envio válido.
    const leitor = request.body?.getReader();
    // Exige bytes reais antes da interpretação do formulário.
    if (!leitor) return resposta({ mensagem: "Arquivo ausente." }, 400);
    // Acumulação é limitada em bytes, inclusive quando Content-Length está ausente.
    const partes: Uint8Array[] = [];
    // A contagem evita materializar corpos ilimitados em memória.
    let tamanho = 0;
    // A leitura termina ao atingir o fim ou ultrapassar o limite.
    while (true) {
      // Cada bloco é inspecionado antes de entrar no acumulador.
      const trecho = await leitor.read();
      // Fim do corpo conclui a coleta limitada.
      if (trecho.done) break;
      // Soma os bytes recebidos sem confiar na extensão ou no tipo declarado.
      tamanho += trecho.value.length;
      // Uma solicitação excessiva é encerrada imediatamente.
      if (tamanho > limiteCorpo) { await leitor.cancel(); return resposta({ mensagem: "Use um arquivo de até 5 MB." }, 413); }
      // Mantém somente blocos dentro do limite estabelecido.
      partes.push(trecho.value);
    }
    // Só interpreta o formulário depois de limitar integralmente seu tamanho.
    const dados = await new Response(Buffer.concat(partes), { headers: { "Content-Type": tipo } }).formData();
    // Lista fechada bloqueia parâmetros duplicados e arquivos adicionais.
    const campos = ["matricula", "tipo", "arquivo", "confirmaTeste"];
    // Cada campo deve aparecer exatamente uma vez, sem entradas arbitrárias.
    if ([...dados.keys()].some((chave) => !campos.includes(chave)) || campos.some((chave) => dados.getAll(chave).length !== 1)) return resposta({ mensagem: "Envio inválido." }, 400);
    // O arquivo não deve ser substituído por texto e os metadados não podem ser arquivos.
    const arquivo = dados.get("arquivo"), matricula = dados.get("matricula"), classificacao = dados.get("tipo");
    // Exige confirmação explícita de documento fictício para esta fase.
    if (!(arquivo instanceof File) || typeof matricula !== "string" || typeof classificacao !== "string" || dados.get("confirmaTeste") !== "sim") return resposta({ mensagem: "Confirme o envio de documento fictício." }, 400);
    // O serviço identifica o formato pelo conteúdo e confere o limite novamente.
    await anexarDocumento(matricula, classificacao, new Uint8Array(await arquivo.arrayBuffer()), autor);
    // Não devolve nome original, caminho, chave ou conteúdo do documento.
    return resposta({ mensagem: "Documento anexado. Assinatura ainda não conferida." }, 201);
  } catch (erro) {
    // O logger extrai apenas um código de categoria e descarta os demais dados da exceção.
    const referencia = await registrarFalha("anexar_documento", erro);
    // Nenhum payload sensível ou mensagem do banco aparece em logs ou respostas.
    return resposta({ mensagem: "Não foi possível anexar. Use PDF, PNG ou JPEG de até 5 MB e tente novamente. Referência: " + referencia }, 400);
  }
}
