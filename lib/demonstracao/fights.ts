// Os vínculos esportivos usam os mesmos identificadores dos alunos, sem criar cadastros por nome.
import type { Student } from "./billing";
// Resultados concluídos mantêm o formato já aceito pelo cálculo de ranking.
import type { AthleteFight } from "./ranking";
// O catálogo controla combinações de modalidade, resultado e método declarado.
import { REGULAMENTOS, exigeReferencia, metodosPermitidos, type DecisaoLuta, type RecordedResult, type RegulamentoLuta } from "./decisoes-luta";

// Mantém o contrato importado pelos consumidores do registro.
export type { RecordedResult } from "./decisoes-luta";
// Mantém os dados mínimos que devem ser preenchidos antes de agendar um confronto.
export type FightInput = {
  studentId: string; // Identificador do atleta selecionado entre os alunos fictícios.
  opponent: string; // Nome do adversário informado no formulário.
  date: string; // Data civil da luta no formato AAAA-MM-DD.
  location: string; // Nome e endereço/local do confronto conforme informado.
  regulamento?: RegulamentoLuta; // Agendamentos legados seguem o padrão competitivo de ringue.
};
// Um resultado nulo significa agendada ou aguardando decisão, sem aumentar o ranking.
export type FightRecord = FightInput & {
  id: string; // Chave única criada uma única vez ao confirmar o agendamento.
  result: RecordedResult | null; // Só existe quando há encerramento confirmado.
  decisao?: DecisaoLuta; // Exemplos anteriores podem não possuir método especificado.
  cancellation: { reason: string; cancelledOn: string } | null; // Conserva motivo e data do cancelamento sem representar derrota.
};

// Rejeita campos vazios e datas impossíveis antes de comparar dias civis.
function validDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value; // A ida e volta impede que 31/02 seja convertido silenciosamente em março.
}

// Cria uma lista nova, preservando todos os confrontos já registrados nesta visita.
export function scheduleFight(records: readonly FightRecord[], input: FightInput, students: readonly Student[], today: string, id: string): FightRecord[] {
  if (!students.some((student) => student.id === input.studentId)) throw new Error("Selecione um atleta cadastrado."); // Não aceita nome sem vínculo com um aluno.
  if (!validDate(today) || !validDate(input.date) || input.date < today) throw new Error("Informe uma data válida de hoje em diante."); // A tela de agendamento não inventa uma luta passada.
  const opponent = input.opponent.trim(); // Remove apenas espaços externos, sem corrigir nomes por suposição.
  const location = input.location.trim(); // Mantém o local original informado pelo professor.
  if (!opponent || opponent.length > 120 || !location || location.length > 200) throw new Error("Preencha adversário e local dentro dos limites indicados."); // Mesma regra aplicada aos campos da interface.
  if (!id || records.some((record) => record.id === id)) throw new Error("O registro da luta já existe."); // Impede sobrescrever um evento existente.
  const sameText = (left: string, right: string) => left.toLocaleLowerCase("pt-BR") === right.toLocaleLowerCase("pt-BR"); // Desconsidera caixa apenas para detectar envio duplicado.
  if (records.some((record) => record.studentId === input.studentId && record.date === input.date && sameText(record.opponent, opponent) && sameText(record.location, location))) throw new Error("Este confronto já foi registrado para o atleta."); // Dois cliques não geram duas participações iguais.
  // Aceita somente regimes conhecidos, sem perder a compatibilidade com a agenda anterior.
  if (input.regulamento !== undefined && !Object.hasOwn(REGULAMENTOS, input.regulamento)) throw new Error("Selecione o regulamento da luta.");
  return [...records, { ...input, id, opponent, location, result: null, cancellation: null }]; // Agendamento ainda não representa vitória, derrota ou luta concluída.
}

// Conclui uma luta apenas uma vez e somente na data prevista ou depois dela.
export function finishFight(records: readonly FightRecord[], id: string, result: RecordedResult, today: string, decisao?: DecisaoLuta): FightRecord[] {
  const target = records.find((record) => record.id === id); // Localiza o registro que o professor está conferindo.
  if (!target) throw new Error("Registro de luta não encontrado."); // Não cria evento automaticamente ao finalizar.
  if (target.cancellation) throw new Error("Uma luta cancelada não pode receber resultado."); // Cancelamento não é participação concluída.
  if (target.result !== null) throw new Error("Esta luta já possui resultado registrado."); // Preserva a decisão anterior, sem substituição silenciosa.
  // Rejeita valores inválidos antes de consultar os métodos permitidos.
  if (result !== "vitoria" && result !== "empate" && result !== "derrota" && result !== "sem-decisao") throw new Error("Escolha vitória, empate ou derrota, ou registre sem decisão.");
  if (!validDate(today) || target.date > today) throw new Error("O resultado só pode ser registrado a partir da data da luta."); // Uma luta futura continua na lista de próximas lutas.
  // Mantém chamadas legadas de vitória e derrota por pontos e exige método nos fluxos especiais.
  const metodo = decisao?.metodo ?? "pontos";
  // Um empate competitivo deve passar pelo desempate da modalidade antes de registrar o resultado.
  if (!metodosPermitidos(target.regulamento ?? "ringue", result).includes(metodo)) throw new Error("O método selecionado não é permitido para esse resultado e regulamento.");
  // Referência é curta e pode apontar para a súmula ou a declaração da arbitragem.
  const referencia = decisao?.referencia?.trim() ?? "";
  // W.O., empate e sem decisão exigem informação explícita da organização.
  if (referencia.length > 500 || (exigeReferencia(metodo) && !referencia)) throw new Error("Informe a decisão da arbitragem, com até 500 caracteres.");
  // Conserva o agendamento original e grava o método no mesmo resultado.
  return records.map((record) => record.id === id ? { ...record, result, decisao: { metodo, referencia } } : record);
}

// Integra somente resultados concluídos à classificação, usando a própria chave do registro.
export function completedFightEntries(records: readonly FightRecord[]): AthleteFight[] {
  // Cancelamentos e decisões sem vencedor nem empate ficam somente no histórico do registro.
  return records.flatMap((record) => {
    // Apenas resultados classificáveis seguem para o agregador.
    if (record.result === null || record.result === "sem-decisao" || record.cancellation) return [];
    // W.O. conta como resultado oficial, separado da quantidade de combates disputados.
    return [{ id: record.id, studentId: record.studentId, result: record.result, walkover: record.decisao?.metodo === "wo" }];
  });
}

// Cancela uma pendência conservando todos os dados anteriores e exigindo justificativa.
export function cancelFight(records: readonly FightRecord[], id: string, reason: string, today: string): FightRecord[] {
  const target = records.find((record) => record.id === id); // Busca por chave estável, sem depender de nomes iguais.
  if (!target) throw new Error("Registro de luta não encontrado."); // Não cria evento para compensar um vínculo ausente.
  if (target.result !== null || target.cancellation) throw new Error("Somente uma luta pendente pode ser cancelada."); // Protege resultados concluídos e cancelamentos anteriores.
  const trimmed = reason.trim(); // Espaços externos não preenchem a justificativa.
  if (!trimmed || trimmed.length > 500) throw new Error("Informe o motivo do cancelamento, com até 500 caracteres."); // Motivo obrigatório antes de confirmar.
  if (!validDate(today)) throw new Error("Data de cancelamento inválida."); // O histórico exige data civil válida.
  return records.map((record) => record.id === id ? { ...record, cancellation: { reason: trimmed, cancelledOn: today } } : record); // Nenhum confronto é excluído ou reescrito na origem.
}

// Agenda ilustrativa adicional, inteiramente fictícia, para o proprietário conhecer as telas preenchidas.
export function createDemoFightRecords(today: string): FightRecord[] {
  if (!validDate(today)) throw new Error("Data da demonstração inválida."); // Datas relativas exigem um dia inicial válido.
  const dateAt = (offset: number) => new Date(Date.parse(`${today}T00:00:00Z`) + offset * 86_400_000).toISOString().slice(0, 10); // UTC mantém dias civis na virada de mês e ano.
  return [
    { id: "agenda-demo-ana", studentId: "demo-ana", opponent: "Rival Fictícia A", date: dateAt(-6), location: "Copa de Demonstração", result: "vitoria", cancellation: null }, // Vitória adicional ilustra o ranking integrado.
    { id: "agenda-demo-bruno", studentId: "demo-bruno", opponent: "Rival Fictício B", date: dateAt(-4), location: "Arena de Demonstração", result: "derrota", cancellation: null }, // Derrota também aparece na classificação percentual.
    { id: "agenda-demo-diego", studentId: "demo-diego", opponent: "Rival Fictício C", date: dateAt(-1), location: "Torneio Fictício", result: "vitoria", cancellation: null }, // Outro resultado permite comparar atletas.
    { id: "agenda-demo-carla", studentId: "demo-carla", opponent: "Rival Fictícia D", date: dateAt(4), location: "Festival de Demonstração", result: null, cancellation: null }, // Futuro pode ser cancelado, sem antecipar resultado.
    { id: "agenda-demo-elisa", studentId: "demo-elisa", opponent: "Rival Fictícia E", date: dateAt(10), location: "Ginásio Fictício", result: null, cancellation: null }, // A segunda pendência demonstra a ordem cronológica.
    { id: "agenda-demo-felipe", studentId: "demo-felipe", opponent: "Rival Fictício F", date: dateAt(2), location: "Evento de Demonstração", result: null, cancellation: { reason: "Exemplo fictício: evento cancelado pela organização.", cancelledOn: today } }, // O motivo fica visível sem entrar no total do ranking.
  ]; // Hugo continua sem participações para demonstrar Nunca lutaram.
}
