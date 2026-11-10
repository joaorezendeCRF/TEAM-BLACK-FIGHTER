// Os testes executam regras esportivas reais usando exclusivamente cadastros fictícios.
import test from "node:test";
// Asserções estritas detectam alteração indevida do histórico ou da classificação.
import assert from "node:assert/strict";
// A lista de alunos é a mesma utilizada na demonstração visual.
import { createDemo } from "../lib/demonstracao/demo";
// Exercita as regras chamadas pelo formulário e pelo provedor compartilhado.
import { cancelFight, completedFightEntries, createDemoFightRecords, finishFight, scheduleFight } from "../lib/demonstracao/fights";
// A classificação percentual deve considerar somente participações concluídas.
import { athleteStandings, rankAthletes } from "../lib/demonstracao/ranking";
// Datas fixas permitem verificar também a virada de ano sem depender do relógio.
const today = "2026-12-30";
const students = createDemo(today).students; // Nenhum registro real participa da suíte.
// Uma pendência futura permite cancelar mesmo antes da data do evento.
const input = { studentId: "demo-hugo", opponent: "Rival Exemplo", date: "2027-01-02", location: "Arena Fictícia" };

// Cancelar deve guardar justificativa e nunca aparecer como derrota.
test("cancelamento conserva confronto, exige motivo e não altera ranking", () => {
  const pending = scheduleFight([], input, students, today, "futura"); // Cria somente um confronto fictício.
  const snapshot = structuredClone(pending); // A lista original precisa ser preservada.
  assert.throws(() => cancelFight(pending, "futura", "  ", today), /motivo/); // Espaços não justificam o cancelamento.
  assert.throws(() => cancelFight(pending, "futura", "a".repeat(501), today), /500/); // Limite também existe fora da interface.
  const cancelled = cancelFight(pending, "futura", "  Evento adiado pela organização.  ", today); // Limpa somente espaços externos.
  assert.deepEqual(cancelled[0], { ...pending[0], cancellation: { reason: "Evento adiado pela organização.", cancelledOn: today } }); // Dados originais continuam íntegros.
  assert.deepEqual(completedFightEntries(cancelled), []); // Cancelamento não conta como participação esportiva.
  assert.deepEqual(pending, snapshot); // A lista de origem não foi alterada.
  assert.throws(() => cancelFight(cancelled, "futura", "Outro motivo", today), /pendente/); // Não substitui a justificativa anterior.
  assert.throws(() => finishFight(cancelled, "futura", "derrota", "2027-01-02"), /cancelada/); // Não transforma cancelamento em derrota.
});

// Decisões concluídas e vínculos inexistentes continuam protegidos.
test("não cancela resultado concluído ou referência ausente", () => {
  const pending = scheduleFight([], { ...input, date: today }, students, today, "do-dia"); // Pode concluir uma luta do dia atual.
  const finished = finishFight(pending, "do-dia", "vitoria", today); // Vitória deve permanecer registrada.
  assert.throws(() => cancelFight(finished, "do-dia", "Correção", today), /pendente/); // Cancelar não apaga resultado.
  assert.throws(() => cancelFight(pending, "ausente", "Evento adiado", today), /não encontrado/); // Não inventa eventos ausentes.
  assert.throws(() => cancelFight(pending, "do-dia", "Evento adiado", "2026-02-30"), /Data/); // Data impossível é recusada.
});

// A apresentação preenchida deve continuar consistente com a data e os vínculos atuais.
test("exemplos incluem agenda, resultados e cancelamentos sem duplicar IDs", () => {
  const records = createDemoFightRecords(today); // Gera exemplos adicionais e claramente fictícios.
  assert.equal(new Set(records.map((record) => record.id)).size, records.length); // Cada evento tem sua própria chave.
  assert.ok(records.every((record) => students.some((student) => student.id === record.studentId))); // Nenhum aluno é inventado por referência inválida.
  assert.equal(records.filter((record) => record.result === null && !record.cancellation).length, 2); // Duas próximas lutas.
  assert.equal(records.filter((record) => record.cancellation).length, 1); // Um cancelamento com justificativa.
  assert.equal(completedFightEntries(records).length, 3); // Só os três resultados entram no ranking.
  assert.ok(records.filter((record) => record.result === null).every((record) => record.date.startsWith("2027-"))); // O calendário atravessa o ano corretamente.
});

// O maior percentual de derrotas deve vir primeiro e ausência de luta deve vir por último.
test("Derrotas por luta usa frações exatas e não privilegia quem nunca lutou", () => {
  const standings = athleteStandings(students.slice(0, 3), [
    { id: "a1", studentId: students[0].id, result: "derrota" }, // Ana perde uma de duas lutas.
    { id: "a2", studentId: students[0].id, result: "vitoria" }, // Completa cinquenta por cento de derrotas.
    { id: "b1", studentId: students[1].id, result: "derrota" }, // Bruno perde sua única luta; Carla permanece sem participação.
  ]);
  assert.deepEqual(rankAthletes(standings, "derrotas").map((row) => row.student.id), [students[1].id, students[0].id, students[2].id]); // Bruno 100%, Ana 50%, Carla sem lutas.
  const exact = { ...standings[0], fights: 3, losses: 1 }; // Um terço supera 333 milésimos, embora ambos apareçam como 33,3%.
  const rounded = { ...standings[1], fights: 1000, losses: 333 }; // O arredondamento da tela não pode mudar a ordenação.
  assert.equal(rankAthletes([rounded, exact], "derrotas")[0].student.id, exact.student.id); // Compara frações originais, sem arredondar.
});

// W.O. confirmado altera o resultado sem criar um combate disputado.
test("W.O. exige referência, entra nas decisões e não aumenta combates", () => {
  // A fixture de Hugo não tem histórico anterior e permite ver exatamente o efeito de uma decisão.
  const pendente = scheduleFight([], { ...input, date: today, regulamento: "ringue" }, students, today, "wo");
  // Ausência sem confirmação não pode virar vitória.
  assert.throws(() => finishFight(pendente, "wo", "vitoria", today, { metodo: "wo" }), /arbitragem/);
  // Decisão confirmada guarda o método e a referência no mesmo confronto.
  const concluida = finishFight(pendente, "wo", "vitoria", today, { metodo: "wo", referencia: "Súmula fictícia" });
  // W.O. entra no percentual sem incrementar o número de combates.
  const atleta = athleteStandings(students, completedFightEntries(concluida)).find((row) => row.student.id === input.studentId)!;
  // A contagem mantém vitória, ausência e volume de combates separados.
  assert.deepEqual([atleta.wins, atleta.walkoverWins, atleta.fights, atleta.winRate], [1, 1, 0, 1]);
  // A ordenação percentual reconhece a decisão mesmo quando o atleta não disputou nenhum combate.
  assert.equal(rankAthletes([atleta, ...athleteStandings(students.slice(0, 1), [])], "aproveitamento")[0].student.id, input.studentId);
});

// Modalidade competitiva bloqueia empate e métodos de ringue no tatame.
test("tatame recusa KO e empate, e sem decisão não entra no ranking", () => {
  // Confronto do dia atual pode receber uma decisão quando o método é compatível.
  const pendente = scheduleFight([], { ...input, date: today, regulamento: "tatame" }, students, today, "tatame");
  // Não transforma igualdade na competição em empate final.
  assert.throws(() => finishFight(pendente, "tatame", "empate", today, { metodo: "empate", referencia: "Placar fictício" }), /regulamento/);
  // A decisão de tatame não usa KO como resultado legal de ringue.
  assert.throws(() => finishFight(pendente, "tatame", "vitoria", today, { metodo: "ko" }), /regulamento/);
  // A decisão excepcional declarada pela organização permanece no histórico.
  const encerrada = finishFight(pendente, "tatame", "sem-decisao", today, { metodo: "sem-decisao", referencia: "Decisão fictícia da organização" });
  // Sem decisão não cria vitória, derrota ou empate no ranking.
  assert.deepEqual(completedFightEntries(encerrada), []);
});
