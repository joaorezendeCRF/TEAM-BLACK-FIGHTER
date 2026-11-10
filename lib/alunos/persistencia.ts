// Cadastro e metadados privados nunca podem ser importados por um componente cliente.
import "server-only";
// Identificadores aleatórios não dependem de CPF, nome ou documentos pessoais.
import { randomUUID } from "node:crypto";
// Reutiliza o pool do banco atual, sem manter outra cópia de credenciais.
import pool from "@/lib/mysql";
// Tipos do driver descrevem resultados sem enviar SQL ao navegador.
import type { RowDataPacket } from "mysql2";
// Tipos de conexão permitem repetir a autorização dentro da transação.
import type { PoolConnection, Pool } from "mysql2/promise";
// O serviço anterior concentra a validação completa do contrato da matrícula.
import type { CadastroActor, CadastroNormalizado } from "./cadastro";
// Modalidade e preço vêm do catálogo aprovado, nunca de valor livre enviado pelo navegador.
import { obterPlano } from "../planos";
// A conferência de metadados mantém compatibilidade até o SQL ser executado manualmente.
import { estruturaFichaDisponivel } from "./estrutura";
// A lista intencionalmente exclui os campos pessoais e as respostas de saúde.
import type { AlunoResumo, PainelAlunos, ProfessorOpcao } from "./tipos";
// A chave local habilita apenas o ambiente de testes já aprovado; produção permanece uma etapa separada.
export const cadastrosHabilitados = () => process.env.TBF_CADASTROS_TESTE === "1";
// Cada gravação revalida a conta autora e o professor antes de inserir dependências.
export async function conferirAutor(conexao: PoolConnection, autor: CadastroActor, professorId?: number) {
  // Auditoria e metadados de arquivo usam a mesma referência UTC em qualquer conexão do pool.
  await conexao.query("SET time_zone = '+00:00'");
  // A ordem por ID reduz a possibilidade de bloqueios cruzados entre matrículas.
  const [contas] = await conexao.execute<RowDataPacket[]>("SELECT id, perfil, ativo FROM professores WHERE id IN (?, ?) ORDER BY id FOR SHARE", [autor.id, professorId ?? autor.id]);
  // A identidade provém da sessão, e o perfil pode ter mudado desde o carregamento da tela.
  const atual = contas.find((conta) => conta.id === autor.id);
  // Perfis desconhecidos, removidos ou inativos interrompem a transação inteira.
  if (!atual?.ativo || !["admin_principal", "administrador", "professor"].includes(atual.perfil)) throw new Error("Acesso indisponível.");
  // Matrícula só aceita um professor ativo, sem confiar no nome enviado no formulário.
  if (professorId && !contas.some((conta) => conta.id === professorId && conta.ativo && conta.perfil === "professor")) throw new Error("Professor indisponível.");
}
// Auditoria guarda apenas ação, identificadores e autoria, sem copiar informações pessoais.
export async function auditar(conexao: PoolConnection, atorId: number, alvoId: string, entidade: string, acao: string) {
  // Os valores da ação são constantes escolhidas pelas funções internas do servidor.
  await conexao.execute("INSERT INTO tbf_auditoria_alunos (id, ator_id, alvo_id, entidade, acao) VALUES (?, ?, ?, ?, ?)", [randomUUID(), atorId, alvoId, entidade, acao]);
}
// Insere aluno, matrícula, emergência, responsável e segurança como uma única unidade.
export async function registrarAluno(data: CadastroNormalizado, autor: CadastroActor, executor: Pick<Pool, "getConnection"> = pool): Promise<{ id: string }> {
  // Identificadores internos não revelam informações do aluno.
  const id = randomUUID(), matricula = randomUUID();
  // Os três grupos já foram normalizados pelo serviço no servidor.
  const { basic: b, safety: s, guardian: g } = data;
  // O catálogo fixa os preços em centavos; não existe campo de preço aceito do cliente.
  const plano = obterPlano(b.plan);
  // Só obtém conexão depois de conferir o catálogo, evitando vazamento de conexão em plano inválido.
  const conexao = await executor.getConnection();
  // Uma falha em qualquer relacionamento reverte toda a matrícula.
  try {
    // A migração é manual; a ausência de estrutura mantém os planos normais anteriores disponíveis.
    const estruturaPronta = await estruturaFichaDisponivel(conexao);
    // As datas civis são strings; o instante de auditoria é gravado em UTC.
    await conexao.query("SET time_zone = '+00:00'");
    // Nenhum cadastro parcial deve ficar visível.
    await conexao.beginTransaction();
    // Revalida autor e professor no mesmo instante protegido da gravação.
    await conferirAutor(conexao, autor, Number(b.teacherId));
    // Não tenta gravar personal numa estrutura antiga nem o converte em normal silenciosamente.
    if (plano.modalidade === "personal" && !estruturaPronta) throw new Error("Execute o SQL de planos e edição antes de cadastrar personal.");
    // Esta etapa aceita exclusivamente testes identificados pela coluna ambiente_teste.
    await conexao.execute("INSERT INTO tbf_alunos (id, nome, cpf, nascimento, telefone, email, endereco, inscricao_em, treinou_antes, experiencia, criado_por, ambiente_teste) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)", [id, b.name, b.cpf, b.birth, b.phone, b.email || null, b.address, b.registration, b.trained === "sim", b.trainedDetails || null, autor.id]);
    // Matrícula preserva preço e faixa daquela ocasião e não gera recebimento financeiro.
    await conexao.execute("INSERT INTO tbf_matriculas (id, aluno_id, professor_id, matricula_em, aulas_semana, mensalidade_centavos, faixa, situacao, necessita_responsavel, criado_por" + (estruturaPronta ? ", modalidade" : "") + ") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?" + (estruturaPronta ? ", ?" : "") + ")", [matricula, id, Number(b.teacherId), b.enrolled, plano.aulas, plano.centavos, b.grade, b.status, Boolean(g), autor.id, ...(estruturaPronta ? [plano.modalidade] : [])]);
    // Emergência tem finalidade própria, independente do responsável legal.
    await conexao.execute("INSERT INTO tbf_emergencias (aluno_id, nome_vinculo, telefone, atualizado_por) VALUES (?, ?, ?, ?)", [id, b.emergency, b.emergencyPhone, autor.id]);
    // Só existe representante quando necessário na data da matrícula ou explicitamente informado.
    if (g) await conexao.execute("INSERT INTO tbf_responsaveis_matricula (matricula_id, nome, vinculo, documento_tipo, documento, telefone) VALUES (?, ?, ?, ?, ?, ?)", [matricula, g.name, g.relation, g.documentType, g.document, g.phone]);
    // Saúde fica em tabela separada, sem aparecer na lista comum de cadastros.
    await conexao.execute("INSERT INTO tbf_seguranca_matricula (matricula_id, tem_condicao, condicao_detalhes, usa_medicamento, medicamento_detalhes, tem_lesao, lesao_detalhes, declarado_em, registrado_por) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", [matricula, s.condition === "sim", s.conditionDetails || null, s.medication === "sim", s.medicationDetails || null, s.injury === "sim", s.injuryDetails || null, b.enrolled, autor.id]);
    // Registra o ato sem incluir o conteúdo de nenhum campo sensível.
    await auditar(conexao, autor.id, id, "aluno", "cadastro_teste");
    // Todos os registros tornam-se visíveis juntos.
    await conexao.commit();
    // O retorno não repete CPF, telefone ou saúde.
    return { id };
  } catch (erro) {
    // CPF repetido ou qualquer falha deixa o estado anterior intacto.
    await conexao.rollback();
    // A camada pública substitui a exceção por uma orientação sem detalhes do banco.
    throw erro;
  } finally {
    // Não mantém conexões presas depois de uma recusa ou de um erro.
    conexao.release();
  }
}
// Carrega somente informações necessárias à tela de alunos autenticada.
export async function carregarPainelAlunos(): Promise<PainelAlunos> {
  // O modo desabilitado não consulta as novas tabelas.
  if (!cadastrosHabilitados()) return { habilitado: false, edicaoDisponivel: false, alunos: [], professores: [] };
  // Falhas do banco são apresentadas como indisponibilidade, nunca como lista falsamente vazia.
  try {
    // Consulta apenas metadados; nunca executa migração automaticamente.
    const edicaoDisponivel = await estruturaFichaDisponivel();
    // Professores ativos alimentam o seletor por ID.
    const [professores] = await pool.execute<(RowDataPacket & ProfessorOpcao)[]>("SELECT id, nome FROM professores WHERE ativo = 1 AND perfil = 'professor' ORDER BY nome");
    // Campos restritos não fazem parte do SELECT nem do objeto enviado ao navegador.
    const [linhas] = await pool.execute<RowDataPacket[]>("SELECT a.id, a.nome, a.ambiente_teste, m.id AS matriculaId, m.faixa, m.situacao, m.aulas_semana AS aulas, m.mensalidade_centavos AS centavos, " + (edicaoDisponivel ? "m.modalidade" : "'normal'") + " AS modalidade, p.nome AS professor, (SELECT COUNT(*) FROM tbf_documentos_versoes d WHERE d.matricula_id = m.id AND d.estado = 'disponivel') AS documentos FROM tbf_alunos a INNER JOIN tbf_matriculas m ON m.aluno_id = a.id INNER JOIN professores p ON p.id = m.professor_id ORDER BY a.nome, m.matricula_em DESC");
    // Evita devolver propriedades extras do driver para componentes cliente.
    const alunos: AlunoResumo[] = linhas.map((linha) => ({ id: linha.id, nome: linha.nome, matriculaId: linha.matriculaId, faixa: linha.faixa, situacao: linha.situacao, aulas: Number(linha.aulas), modalidade: linha.modalidade, centavos: Number(linha.centavos), professor: linha.professor, documentos: Number(linha.documentos), teste: Boolean(linha.ambiente_teste) }));
    // A consulta só é chamada após autenticação perto do conteúdo da página.
    return { habilitado: true, edicaoDisponivel, alunos, professores: professores.map(({ id, nome }) => ({ id, nome })) };
  } catch {
    // Não imprime dados, credenciais nem erros SQL nos logs.
    return { habilitado: true, edicaoDisponivel: false, alunos: [], professores: [], indisponivel: true };
  }
}
