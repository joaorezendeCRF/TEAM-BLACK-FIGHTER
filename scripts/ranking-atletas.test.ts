// O executor nativo verifica agregação e ordenação sem abrir banco ou usar resultados reais.
import test from "node:test";
// As asserções estritas conferem totais, frações e preservação das listas originais.
import assert from "node:assert/strict";
// A lista de faixas e os exemplos são os mesmos usados nas telas da academia.
import { GRADES, type Student } from "../lib/demonstracao/billing";
// Todos os alunos usados nesta suíte são fictícios e não têm CPF, contato ou saúde.
import { createDemo } from "../lib/demonstracao/demo";
// Os testes exercitam exatamente as funções consumidas pelo componente de ranking.
import { athleteStandings, createDemoFights, rankAthletes, type AthleteFight } from "../lib/demonstracao/ranking";
// A data fixa torna os exemplos reproduzíveis sem depender do relógio do computador.
const students = createDemo("2026-10-22").students;
// A nova ordem substitui o catálogo anterior, sem migrar registros reais de graduação.
test("as faixas seguem exclusivamente a nova lista e a hierarquia solicitada", () => {
  assert.deepEqual(GRADES.map((grade) => grade.name), ["Branca", "Amarela", "Vermelha", "Verde", "Azul", "Roxa", "Marrom", "Preta"]); // Laranja foi retirada e Roxa ocupa a sexta posição.
  assert.equal(GRADES.find((grade) => grade.id === "roxa")?.months, null); // Não inventa um prazo para a faixa nova.
  const ordered = rankAthletes(athleteStandings(students, []), "faixa"); // Faixa continua independente de resultado esportivo.
  assert.deepEqual(ordered.map((row) => row.student.grade), ["preta", "marrom", "roxa", "azul", "verde", "vermelha", "amarela", "branca"]); // Confere a hierarquia inversa na tabela.
});
// Confere a mudança centralizada de graduação, que se propaga a cartões, tabelas e relatório.
test("a sétima faixa se chama Marrom e usa cor marrom com texto branco", () => {
  // O identificador novo é usado por todos os vínculos fictícios da aplicação.
  assert.deepEqual(GRADES[6], { id: "marrom", name: "Marrom", color: "#8B4513", ink: "#ffffff", months: 12 });
  // Gabriela demonstra a faixa alterada sem mudar a posição de hierarquia.
  assert.equal(students.find((student) => student.id === "demo-gabriela")?.grade, "marrom");
});
// Os totais precisam bater com os eventos, inclusive para quem ainda não competiu.
test("conta vitórias, derrotas e empates e distingue atleta sem lutas", () => {
  // Cria resumos dos exemplos usados na interface para conferir a consistência da demonstração.
  const standings = athleteStandings(students, createDemoFights());
  // A líder de volume possui quinze participações e onze vitórias.
  const leader = standings.find((standing) => standing.student.id === "demo-gabriela")!;
  // Os três resultados precisam somar exatamente o total exibido.
  assert.deepEqual([leader.fights, leader.wins, leader.losses, leader.draws], [15, 11, 3, 1]);
  // O percentual usa a fração original, sem arredondamento antecipado.
  assert.equal(leader.winRate, 11 / 15);
  // Ausência de participação é diferente de ter lutado e perdido.
  assert.equal(standings.find((standing) => standing.student.id === "demo-hugo")?.winRate, null);
});
// Cada critério deve produzir a liderança correspondente sem vincular desempenho à faixa.
test("os três critérios possuem líderes próprios e preservam os resumos originais", () => {
  // A ordem original acompanha o cadastro, não a classificação escolhida.
  const standings = athleteStandings(students, createDemoFights());
  // A cópia permite detectar alteração indevida da lista durante a ordenação.
  const previous = structuredClone(standings);
  // O maior volume pertence a Gabriela, com quinze participações.
  assert.equal(rankAthletes(standings, "lutas")[0].student.id, "demo-gabriela");
  // O melhor percentual pertence a Elisa, com seis vitórias em sete participações.
  assert.equal(rankAthletes(standings, "aproveitamento")[0].student.id, "demo-elisa");
  // A faixa preta lidera a graduação mesmo sem resultado competitivo fictício.
  assert.equal(rankAthletes(standings, "faixa")[0].student.id, "demo-hugo");
  // A faixa marrom vem imediatamente depois da preta na hierarquia.
  assert.equal(rankAthletes(standings, "faixa")[1].student.grade, "marrom");
  // Trocar os critérios não reordena nem altera os dados de origem.
  assert.deepEqual(standings, previous);
});
// A ordem de percentuais não pode favorecer ausência de dados ou arredondamento prematuro.
test("percentual usa a fração exata, desempata por vitórias e coloca sem lutas no final", () => {
  // Os três atletas de exemplo usam nomes diferentes e a mesma faixa para isolar o cálculo.
  const sample: Student[] = students.slice(0, 3).map((student) => ({ ...student, grade: "branca" }));
  // Os dois primeiros atletas têm o mesmo percentual com quantidades de vitórias distintas.
  const fights: AthleteFight[] = [
    // Uma vitória e uma derrota produzem cinquenta por cento para Ana.
    { id: "a1", studentId: sample[0].id, result: "vitoria" },
    // A derrota faz parte do total do primeiro atleta.
    { id: "a2", studentId: sample[0].id, result: "derrota" },
    // Duas vitórias em quatro lutas mantêm cinquenta por cento para Bruno.
    { id: "b1", studentId: sample[1].id, result: "vitoria" },
    // A segunda vitória representa maior volume no desempate.
    { id: "b2", studentId: sample[1].id, result: "vitoria" },
    // As duas derrotas completam as quatro participações de Bruno.
    { id: "b3", studentId: sample[1].id, result: "derrota" },
    // O terceiro atleta permanece sem lutas registradas.
    { id: "b4", studentId: sample[1].id, result: "derrota" },
  ];
  // O empate percentual favorece mais vitórias; Carla fica no final por ausência de resultados.
  assert.deepEqual(rankAthletes(athleteStandings(sample, fights), "aproveitamento").map((standing) => standing.student.id), [sample[1].id, sample[0].id, sample[2].id]);
  // Estas duas frações aparecem como 33,3% na tela, mas um terço é maior que 333 milésimos.
  const exact = { student: sample[0], fights: 3, walkoverWins: 0, walkoverLosses: 0, wins: 1, losses: 2, draws: 0, winRate: 1 / 3 };
  // O segundo atleta tem mais vitórias, para detectar desempate incorreto após arredondar o percentual.
  const rounded = { student: sample[1], fights: 1000, walkoverWins: 0, walkoverLosses: 0, wins: 333, losses: 667, draws: 0, winRate: 333 / 1000 };
  // A fração realmente maior deve vencer antes de considerar o total de vitórias no desempate.
  assert.equal(rankAthletes([rounded, exact], "aproveitamento")[0].student.id, sample[0].id);
});
// Registros inválidos não devem criar resultados ou atletas silenciosamente.
test("rejeita lutas repetidas, vínculos ausentes e resultados inválidos sem alterar entradas", () => {
  // Usa uma única participação válida como base para as tentativas inválidas.
  const fight: AthleteFight = { id: "teste-luta", studentId: students[0].id, result: "empate" };
  // A cópia do cadastro confirma ausência de mutações após as validações.
  const previous = structuredClone(students);
  // A mesma participação não pode aumentar artificialmente os totais.
  assert.throws(() => athleteStandings(students, [fight, fight]), /repetido/);
  // Uma luta não pode inventar o cadastro de um atleta ausente.
  assert.throws(() => athleteStandings(students, [{ ...fight, studentId: "inexistente" }]), /correspondente/);
  // A barreira em execução rejeita resultado fora do conjunto previsto pela demonstração.
  assert.throws(() => athleteStandings(students, [{ ...fight, result: "invalido" as AthleteFight["result"] }]), /inválido/);
  // Identificadores duplicados de alunos também impedem agregação ambígua.
  assert.throws(() => athleteStandings([students[0], students[0]], []), /repetido/);
  // Nenhuma validação alterou os cadastros de origem.
  assert.deepEqual(students, previous);
});
