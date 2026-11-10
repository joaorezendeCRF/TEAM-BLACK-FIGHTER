// Confere a integração de empates com calendário, ranking e preservação do histórico.
import test from "node:test";
// Asserções estritas com dados inteiramente fictícios, sem conexão de banco.
import assert from "node:assert/strict";
// Os exemplos reutilizam os alunos disponíveis na interface.
import { createDemo } from "../lib/demonstracao/demo";
// O registro deve aceitar empate como decisão concluída única.
import { scheduleFight, finishFight, completedFightEntries, cancelFight } from "../lib/demonstracao/fights";
// O percentual é calculado sobre todas as participações concluídas.
import { athleteStandings, rankAthletes } from "../lib/demonstracao/ranking";
const today = "2026-10-23"; // Data fixa torna a verificação reproduzível.
const students = createDemo(today).students; // Não utiliza pessoas ou resultados reais.
test("empate conclui uma participação e não vira vitória, derrota ou cancelamento", () => {
  const pending = scheduleFight([], { studentId: students[0].id, regulamento: "evento" as const, opponent: "Rival Fictício", date: today, location: "Arena Fictícia" }, students, today, "empate-teste"); // Agenda um evento do dia.
  const finished = finishFight(pending, "empate-teste", "empate", today, { metodo: "empate", referencia: "Súmula fictícia do evento" }); // Conclui exatamente o registro selecionado.
  const row = athleteStandings(students, completedFightEntries(finished))[0]; // Agrega o resultado usando a mesma regra da tela.
  assert.deepEqual([row.fights, row.wins, row.losses, row.draws], [1, 0, 0, 1]); // Empate conta no total e na coluna própria.
  assert.equal(pending[0].result, null); // A origem não é reescrita.
  assert.throws(() => finishFight(finished, "empate-teste", "vitoria", today), /já possui/); // Não sobrescreve decisão concluída.
  assert.throws(() => cancelFight(finished, "empate-teste", "Motivo fictício", today), /pendente/); // Cancelamento não apaga empate.
  const future = scheduleFight([], { ...pending[0], date: "2026-10-24" }, students, today, "futura"); // Luta futura continua protegida.
  assert.throws(() => finishFight(future, "futura", "empate", today), /a partir/); // Recusa empate antes da luta.
});
test("Empates por luta ordena frações exatas e mantém sem lutas no final", () => {
  const rows = athleteStandings(students.slice(0, 3), [
    { id: "a1", studentId: students[0].id, result: "empate" }, // Ana empata uma de duas lutas.
    { id: "a2", studentId: students[0].id, result: "vitoria" }, // Totaliza cinquenta por cento de empates.
    { id: "b1", studentId: students[1].id, result: "empate" }, // Bruno empata sua única luta; Carla nunca lutou.
  ]);
  assert.deepEqual(rankAthletes(rows, "empates").map((row) => row.student.id), [students[1].id, students[0].id, students[2].id]); // Cem por cento, cinquenta por cento, sem lutas.
  const exact = { ...rows[0], fights: 3, draws: 1 }; // Um terço é maior que 333 milésimos.
  const rounded = { ...rows[1], fights: 1000, draws: 333 }; // Ambos se exibem como 33,3%, mas não podem empatar na ordenação.
  assert.equal(rankAthletes([rounded, exact], "empates")[0].student.id, exact.student.id); // A exibição arredondada não muda o resultado.
});
