// Os testes nativos verificam agendamento e resultados sem usar dados reais ou acessar banco.
import test from "node:test";
import assert from "node:assert/strict";
// Reutiliza somente os alunos fictícios já conhecidos da demonstração.
import { createDemo } from "../lib/demonstracao/demo";
// Verifica as regras realmente chamadas pelo formulário e pelo contexto compartilhado.
import { scheduleFight, finishFight, completedFightEntries, type FightInput, type RecordedResult } from "../lib/demonstracao/fights";
// Agregação e ordenação devem refletir exclusivamente resultados concluídos.
import { athleteStandings, createDemoFights, rankAthletes } from "../lib/demonstracao/ranking";
// O calendário fixo torna os casos reproduzíveis independentemente da data de execução.
const today = "2026-10-22";
const students = createDemo(today).students; // Não contém CPF, telefone ou saúde de pessoas reais.
const input: FightInput = { studentId: "demo-hugo", opponent: "Adversário Exemplo", date: today, location: "Arena Fictícia" }; // Confronto do atleta ainda sem histórico.

test("agendamento preserva os campos e não altera o ranking antes do resultado", () => {
  const records = scheduleFight([], { ...input, date: "2026-11-01" }, students, today, "nova-1"); // Uma luta futura continua pendente.
  assert.deepEqual(records[0], { ...input, date: "2026-11-01", id: "nova-1", result: null, cancellation: null }); // Mantém atleta, adversário, data e local.
  assert.deepEqual(completedFightEntries(records), []); // Agenda não equivale a luta concluída.
  assert.equal(athleteStandings(students, createDemoFights()).find((row) => row.student.id === input.studentId)?.fights, 0); // Hugo continua sem resultados.
});

test("vitória conclui uma única participação, atualiza o ranking e preserva o agendamento anterior", () => {
  const scheduled = scheduleFight([], input, students, today, "nova-1"); // Pode agendar e finalizar uma luta do dia atual.
  const snapshot = structuredClone(scheduled); // Confere que a origem não será reescrita.
  const finished = finishFight(scheduled, "nova-1", "vitoria", today); // Registra a vitória do atleta da academia.
  const standings = athleteStandings(students, [...createDemoFights(), ...completedFightEntries(finished)]); // Integra o evento uma única vez.
  const athlete = standings.find((row) => row.student.id === input.studentId)!; // Localiza o mesmo aluno por ID.
  assert.deepEqual([athlete.fights, athlete.wins, athlete.losses], [1, 1, 0]); // Vitória aumenta total e vitórias, sem criar derrota.
  assert.equal(rankAthletes(standings, "sem-lutas").some((row) => row.student.id === input.studentId), false); // Sai de Nunca lutaram depois da conclusão.
  assert.deepEqual(scheduled, snapshot); // O histórico anterior é imutável.
  assert.throws(() => finishFight(finished, "nova-1", "derrota", today), /já possui/); // Não altera decisão confirmada silenciosamente.
});

test("derrota é contada corretamente e resultados futuros ou inválidos são recusados", () => {
  const scheduled = scheduleFight([], input, students, today, "nova-1"); // Parte de uma participação pendente.
  const loss = finishFight(scheduled, "nova-1", "derrota", today); // O resultado continua ligado à mesma chave.
  const athlete = athleteStandings(students, completedFightEntries(loss)).find((row) => row.student.id === input.studentId)!; // Isola a nova participação dos exemplos históricos.
  assert.deepEqual([athlete.fights, athlete.wins, athlete.losses, athlete.winRate], [1, 0, 1, 0]); // Derrota não aparece como ausência de participação.
  const future = scheduleFight([], { ...input, date: "2026-11-01" }, students, today, "futura"); // Próxima luta ainda não pode receber resultado.
  assert.throws(() => finishFight(future, "futura", "vitoria", today), /a partir da data/); // Bloqueia resultado antecipado.
  assert.throws(() => finishFight(scheduled, "nova-1", "invalido" as RecordedResult, today), /vitória, empate ou derrota/); // Apenas vitória, empate e derrota são decisões válidas; outros valores continuam recusados.
  assert.throws(() => finishFight(scheduled, "ausente", "vitoria", today), /não encontrado/); // Não inventa registro para suprir referência inválida.
});

test("campos, datas e envios repetidos são validados sem descartar registros", () => {
  const existing = scheduleFight([], input, students, today, "nova-1"); // Registro válido a preservar.
  assert.throws(() => scheduleFight(existing, input, students, today, "nova-2"), /já foi registrado/); // Mesmos dados não geram contagem duplicada.
  assert.throws(() => scheduleFight([], { ...input, studentId: "ausente" }, students, today, "x"), /atleta cadastrado/); // Exige vínculo com aluno conhecido.
  assert.throws(() => scheduleFight([], { ...input, opponent: "  " }, students, today, "x"), /adversário e local/); // Espaços não preenchem um campo obrigatório.
  assert.throws(() => scheduleFight([], { ...input, date: "2027-02-31" }, students, today, "x"), /data válida/); // Data impossível não vira março automaticamente.
  assert.throws(() => scheduleFight([], { ...input, date: "2026-10-21" }, students, today, "x"), /data válida/); // Passado não entra como luta futura.
  assert.equal(existing.length, 1); // Nenhuma tentativa inválida apagou a lista existente.
});

test("Menos lutas ordena participantes crescentemente e Nunca lutaram mostra apenas ausência", () => {
  const standings = athleteStandings(students, createDemoFights()); // Inclui sete participantes e Hugo sem lutas.
  const fewer = rankAthletes(standings, "menos-lutas"); // O filtro é independente da ordenação por vitórias.
  assert.deepEqual(fewer.map((row) => row.fights), [4, 6, 7, 9, 10, 12, 15]); // Ausência não ocupa a primeira posição dos que já participaram.
  assert.deepEqual(rankAthletes(standings, "sem-lutas").map((row) => row.student.id), ["demo-hugo"]); // Somente quem não possui resultado concluído.
  assert.equal(standings.length, 8); // A filtragem não remove alunos da origem.
});
