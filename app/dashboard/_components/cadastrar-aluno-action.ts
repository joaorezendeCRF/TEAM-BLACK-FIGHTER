// O formulário chama somente esta ação executada no servidor.
"use server";
// A sessão ativa é revalidada a cada cadastro, incluindo professores com acesso geral.
import { obterUsuarioAutenticado } from "@/lib/autorizacao";
// A data civil brasileira não pode ser escolhida pelo navegador para contornar validações.
import { todayInBrazil } from "@/lib/demonstracao/billing";
// As validações de CPF, telefone, datas e responsável já preparadas são reutilizadas.
import { prepareStudentRegistration } from "@/lib/alunos/cadastro";
// Adaptador grava todos os grupos juntos e registra autoria sem payload pessoal.
import { cadastrosHabilitados, registrarAluno } from "@/lib/alunos/persistencia";
// A consulta parametrizada fornece a identidade do professor sem confiar no texto do formulário.
import pool from "@/lib/mysql";
// Falhas são registradas por código técnico e referência, sem formulário ou informação pessoal.
import { registrarFalha } from "@/lib/logs";
// Tipo das linhas retornadas pelo driver.
import type { RowDataPacket } from "mysql2";
// Atualiza a lista depois da confirmação transacional.
import { revalidatePath } from "next/cache";
// Só registros explicitamente confirmados como fictícios podem ser gravados nesta fase.
export async function cadastrarAluno(input: Record<string, unknown>, confirmaTeste: boolean) {
  // A confirmação e a chave de ambiente são conferidas no servidor.
  if (confirmaTeste !== true || !cadastrosHabilitados()) return { ok: false, message: "Confirme o uso exclusivo de dados fictícios." };
  // Valida a sessão antes de consultar professor ou examinar campos pessoais.
  const autor = await obterUsuarioAutenticado();
  // Visitantes não recebem informações sobre disponibilidade de contas ou cadastros.
  if (!autor) return { ok: false, message: "Acesso não autorizado." };
  // Entradas recebidas em tempo de execução não são necessariamente objetos válidos.
  if (!input || typeof input !== "object" || Array.isArray(input)) return { ok: false, message: "Dados inválidos." };
  // O serviço e o adaptador repetem a conferência de professor ativo.
  try {
    // Identificador precisa ser textual e decimal antes de chegar à consulta.
    if (typeof input.teacherId !== "string" || !/^[1-9]\d*$/.test(input.teacherId) || !Number.isSafeInteger(Number(input.teacherId))) return { ok: false, message: "Selecione um professor ativo." };
    // O nome da conta não é aceito como fundamento de autorização ou vínculo.
    const [professores] = await pool.execute<RowDataPacket[]>("SELECT nome FROM professores WHERE id = ? AND ativo = 1 AND perfil = 'professor' LIMIT 1", [Number(input.teacherId)]);
    // Conta ausente ou inativa não pode receber novas matrículas.
    if (!professores[0]) return { ok: false, message: "Professor indisponível para matrícula." };
    // O nome confiável atende a validação compartilhada com a antiga prévia.
    const resultado = await prepareStudentRegistration({ ...input, teacher: professores[0].nome }, todayInBrazil(), {
      // A configuração permite apenas a etapa de cadastros de teste.
      enabled: cadastrosHabilitados(),
      // O serviço permanece testável sem incluir conexão de logs no núcleo de validação.
      reportError: (erro) => registrarFalha("cadastro_aluno", erro),
      // Reutiliza a identidade recém-verificada, nunca um identificador do formulário.
      authenticatedActor: async () => autor,
      // A consulta já confirmou o professor; o adaptador repetirá sob bloqueio.
      activeTeacher: async () => true,
      // Nenhum dado sensível é incluído na resposta do adaptador.
      registerAtomically: registrarAluno,
    });
    // Atualiza a tela somente quando a matrícula inteira foi gravada.
    if (resultado.ok) revalidatePath("/dashboard/alunos");
    // O serviço retorna apenas confirmação e identificador interno do aluno.
    return resultado;
  } catch (erro) {
    // A referência identifica a ocorrência sem revelar seu conteúdo bruto.
    const referencia = await registrarFalha("cadastro_aluno", erro);
    // Não revela conteúdo do formulário, erros SQL ou credenciais.
    return { ok: false, message: "Não foi possível registrar. Confira os campos e tente novamente. Referência: " + referencia };
  }
}
