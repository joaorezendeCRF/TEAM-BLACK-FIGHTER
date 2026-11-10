"use server"; // Somente funções deste arquivo podem receber pedidos autenticados de leitura e edição.
// Sessão é revalidada em cada ação e novamente sob bloqueio no adaptador MySQL.
import { obterUsuarioAutenticado } from "@/lib/autorizacao";
// Reutiliza o ambiente de testes já aprovado para os cadastros.
import { cadastrosHabilitados } from "@/lib/alunos/persistencia";
// Adaptador concentra histórico privado, concorrência e atualização atômica.
import { atualizarFicha, carregarFicha, ErroFicha } from "@/lib/alunos/edicao";
// Logs aceitam apenas código técnico e referência, nunca o conteúdo da ficha.
import { registrarFalha } from "@/lib/logs";
// Lista e indicadores recebem os dados atuais após o commit.
import { revalidatePath } from "next/cache";
// Lê somente a ficha selecionada, sem enviar dados restritos de todos os alunos à página.
export async function carregarFichaAluno(matricula: string) {
  // A etapa atual continua limitada aos registros fictícios.
  if (!cadastrosHabilitados()) return { ok: false as const, message: "Edição indisponível neste ambiente." };
  // Não examina ficha ou professor antes de revalidar a sessão.
  const autor = await obterUsuarioAutenticado();
  // Um visitante não recebe informações sobre a existência de matrículas.
  if (!autor) return { ok: false as const, message: "Acesso não autorizado." };
  // Falhas inesperadas são substituídas por uma orientação segura.
  try {
    // A transação também registra o acesso aos dados restritos.
    const ficha = await carregarFicha(matricula, autor);
    // O retorno é exclusivo do pedido autenticado que selecionou esta matrícula.
    return { ok: true as const, ficha };
  } catch (erro) {
    // Mensagens de regra são constantes controladas no adaptador, sem dados do formulário.
    if (erro instanceof ErroFicha) return { ok: false as const, message: erro.message };
    // Apenas um código conhecido sai do objeto de erro para o diagnóstico.
    const referencia = await registrarFalha("consultar_ficha", erro);
    // Não devolve SQL, nomes, saúde ou contatos em mensagens de falha.
    return { ok: false as const, message: "Não foi possível abrir a ficha. Referência: " + referencia };
  }
}
// Salva alterações apenas depois de revisão explícita do usuário na própria ficha.
export async function editarAluno(matricula: string, versao: number, input: Record<string, unknown>, confirmaTeste: boolean) {
  // Não permite reutilizar esta função para dados reais nesta etapa de homologação.
  if (confirmaTeste !== true || !cadastrosHabilitados()) return { ok: false, message: "Confirme a revisão dos dados fictícios." };
  // Identidade não vem de campo oculto ou identificador enviado pelo formulário.
  const autor = await obterUsuarioAutenticado();
  // Sessão expirada impede toda a operação.
  if (!autor) return { ok: false, message: "Acesso não autorizado." };
  // O adaptador valida campos e autorização antes da escrita transacional.
  try {
    // O valor monetário é calculado no servidor conforme a troca de plano.
    const resultado = await atualizarFicha(matricula, versao, input, autor);
    // Atualiza somente depois de histórico e grupos atuais terem sido confirmados.
    revalidatePath("/dashboard/alunos");
    // Retorna confirmação sem o conteúdo da ficha.
    return resultado;
  } catch (erro) {
    // Conflito de versão e estrutura pendente precisam de orientação clara ao professor.
    if (erro instanceof ErroFicha) return { ok: false, message: erro.message };
    // O sanitizador ignora payload, mensagem crua, stack e SQL.
    const referencia = await registrarFalha("editar_aluno", erro);
    // Falhas conservam o formulário para correção e não anunciam alteração concluída.
    return { ok: false, message: "Não foi possível salvar. Confira os campos, o CPF e a situação da matrícula. Referência: " + referencia };
  }
}
