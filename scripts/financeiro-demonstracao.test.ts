// Os testes nativos do Node verificam regras financeiras sem iniciar navegador ou banco.
import test from "node:test";
import assert from "node:assert/strict";
// Importações por extensão permitem executar o TypeScript diretamente com Node 24.
import { balance, buildReport, daysLate, dueDateFor, financialState, payInvoice, shiftMonth, validateReceiptDate, type Ledger } from "../lib/demonstracao/billing"; // Inclui a validação de data compartilhada com a interface.
import { createDemo } from "../lib/demonstracao/demo";

// Uma data fixa torna as verificações reproduzíveis em qualquer dia ou computador.
const TODAY = "2026-10-22";

test("vencimento mantém o dia original após fevereiro e atravessa a virada do ano", () => {
  assert.equal(dueDateFor("2027-02", 31), "2027-02-28"); // Mês curto usa seu último dia.
  assert.equal(dueDateFor("2028-02", 31), "2028-02-29"); // Ano bissexto tem vinte e nove dias.
  assert.equal(dueDateFor("2027-03", 31), "2027-03-31"); // O dia escolhido não vira 28 permanentemente.
  assert.equal(shiftMonth("2026-12", 1), "2027-01"); // Competência avança também o ano.
  assert.throws(() => dueDateFor("2026-10", 32)); // Rejeita dia fora do calendário recorrente.
});

test("quitação atrasada conserva histórico, não duplica próxima competência e mantém outra dívida", () => {
  const initial = createDemo(TODAY); // Ana deve setembro e outubro.
  const next = payInvoice(initial, "demo-ana-2026-09", 7000, TODAY, "Pix"); // Liquida apenas a cobrança mais antiga.
  assert.equal(balance(next.invoices.find((item) => item.id === "demo-ana-2026-09")!, next.receipts), 0); // Saldo de setembro fica zero.
  assert.equal(next.invoices.length, initial.invoices.length); // Outubro já existia e não foi duplicado.
  assert.equal(financialState(next, "demo-ana", TODAY).paid, false); // Outubro ainda precisa ser pago.
  assert.equal(initial.receipts.length, 2); // O estado inicial não sofreu mutação.
  assert.throws(() => payInvoice(next, "demo-ana-2026-09", 7000, TODAY, "Pix")); // Repetir baixa da mesma cobrança quitada é rejeitado.
});

test("quitação do mês prepara o próximo vencimento no dia escolhido e fica Pago", () => {
  const initial = createDemo(TODAY); // Carla possui apenas outubro pendente.
  const next = payInvoice(initial, "demo-carla-2026-10", 8000, TODAY, "Dinheiro"); // Recebimento ocorre depois do vencimento original.
  const future = next.invoices.find((item) => item.id === "demo-carla-2026-11"); // Procura a nova competência criada.
  assert.equal(future?.dueDate, "2026-11-05"); // Não usa 22 de novembro nem soma trinta dias ao pagamento.
  assert.equal(financialState(next, "demo-carla", TODAY).paid, true); // Cobrança futura não faz o aluno parecer inadimplente.
  assert.equal(financialState(next, "demo-carla", "2026-11-05").paid, false); // No próximo vencimento passa a Não pago.
  assert.equal(financialState(next, "demo-carla", "2026-11-05").overdue.length, 0); // Vence hoje sem atraso de um dia.
  assert.equal(daysLate(future!.dueDate, "2026-11-06"), 1); // Atraso começa no dia seguinte.
});

test("pagamento parcial reduz saldo sem quitar nem antecipar a próxima cobrança", () => {
  const initial = createDemo(TODAY); // Diego já tem quarenta reais recebidos.
  const next = payInvoice(initial, "demo-diego-2026-10", 2000, TODAY, "Cartão"); // Recebe mais vinte reais de uma mensalidade de cento e vinte.
  assert.equal(balance(next.invoices.find((item) => item.id === "demo-diego-2026-10")!, next.receipts), 6000); // Ainda faltam sessenta reais.
  assert.equal(financialState(next, "demo-diego", TODAY).paid, false); // Parcial continua Não pago.
  assert.equal(next.invoices.length, initial.invoices.length); // Próxima competência só é preparada na quitação.
  assert.throws(() => payInvoice(next, "demo-diego-2026-10", 6001, TODAY, "Pix")); // Impede receber mais que o saldo sem tratamento específico.
  assert.throws(() => payInvoice(next, "demo-diego-2026-10", 0, TODAY, "Pix")); // Impede recebimento nulo.
});

test("primeiro pagamento exige e preserva a escolha do dia feita pelo aluno", () => {
  const initial = createDemo(TODAY); // Hugo ainda não escolheu vencimento recorrente.
  assert.throws(() => payInvoice(initial, "demo-hugo-2026-10", 12000, TODAY, "Pix")); // Não assume o dia sem escolha.
  const next = payInvoice(initial, "demo-hugo-2026-10", 12000, TODAY, "Pix", 31); // Escolha explícita no primeiro pagamento.
  assert.equal(next.students.find((item) => item.id === "demo-hugo")?.dueDay, 31); // Mantém o dia recorrente, não o ajuste de novembro.
  assert.equal(next.invoices.find((item) => item.id === "demo-hugo-2026-11")?.dueDate, "2026-11-30"); // Novembro usa o último dia disponível.
});

test("relatório concilia previsto, recebido e restante; inclui dívida de inativo", () => {
  const ledger = createDemo(TODAY); // Oito alunos e dez cobranças entre setembro, outubro e novembro.
  const report = buildReport(ledger, "2026-10", TODAY); // Seleciona vencimentos do mês solicitado.
  assert.equal(report.students, 8); // Total cadastral não é contagem de cobranças.
  assert.equal(report.active, 7); // Sete matrículas ativas.
  assert.equal(report.inactive, 1); // Inativo permanece no cadastro e na inadimplência.
  assert.equal(report.expected, 74000); // Soma independente dos oito preços: 70+80+80+120+120+70+80+120 = 740.
  assert.equal(report.received, 12000); // Oitenta de Bruno e quarenta de Diego.
  assert.equal(report.remaining, 62000); // Previsto menos recebido, sem inventar pagamentos.
  assert.equal(report.allRemaining, 77000); // Inclui setenta reais de setembro e oitenta da próxima mensalidade de Bruno.
  assert.equal(report.overdue[0].student.id, "demo-ana"); // A mensalidade de setembro é a mais antiga.
  assert.ok(report.overdue.some((row) => row.student.id === "demo-felipe")); // Dívida de inativo não desaparece.
  assert.equal(report.monthlyOverdue.some((row) => row.student.id === "demo-gabriela"), false); // Vencimento hoje não é atraso.
  assert.equal(buildReport(ledger, "2027-01", TODAY).expected, 0); // Mês sem cobranças geradas tem total zero explícito.
});

test("uma mensalidade futura sem recebimento anterior não é exibida como Pago", () => {
  const ledger = createDemo(TODAY); // Elisa ainda não realizou pagamento na demonstração.
  const state = financialState(ledger, "demo-elisa", TODAY); // O vencimento será no dia 28.
  assert.equal(state.paid, false); // Exige quitação para declarar Pago.
  assert.equal(state.overdue.length, 0); // Ainda assim não dispara atraso antes do vencimento.
});

test("um mês futuro gerado não aumenta a previsão de outubro e preço histórico fica preservado", () => {
  const initial = createDemo(TODAY); // Captura os preços originais.
  const changed: Ledger = { ...initial, students: initial.students.map((student) => student.id === "demo-carla" ? { ...student, monthlyCents: 9000 } : student) }; // Simula nova condição para períodos futuros.
  const next = payInvoice(changed, "demo-carla-2026-10", 8000, TODAY, "Pix"); // Outubro conserva os oitenta reais contratados.
  assert.equal(next.invoices.find((item) => item.id === "demo-carla-2026-10")?.amountCents, 8000); // Histórico não é recalculado pelo preço novo.
  assert.equal(next.invoices.find((item) => item.id === "demo-carla-2026-11")?.amountCents, 9000); // Próxima competência utiliza o novo valor.
  assert.equal(buildReport(next, "2026-10", TODAY).expected, 74000); // Nova competência não contamina o total de outubro.
});

// Confere o calendário sem depender da validação nativa do campo de data.
test("recebimento rejeita datas ausentes, inexistentes e futuras", () => {
  // Cada valor inválido deve ser recusado antes de produzir qualquer evento financeiro.
  for (const date of ["", "22/10/2026", "2026-02-30", "2026-13-01", "2026-10-23"]) {
    // Usa uma referência fixa para o teste continuar reproduzível em outros dias.
    assert.throws(() => validateReceiptDate(date, TODAY));
  // Finaliza a matriz de datas inválidas.
  }
  // Fevereiro bissexto continua sendo uma data civil válida.
  assert.doesNotThrow(() => validateReceiptDate("2024-02-29", TODAY));
  // O recebimento do próprio dia também pode ser registrado.
  assert.doesNotThrow(() => validateReceiptDate(TODAY, TODAY));
// Finaliza o cenário de calendário.
});

// Data do recebimento não muda a competência nem o dia recorrente contratado.
test("recebimento retroativo preserva data informada, vencimento e histórico", () => {
  // Usa somente os alunos fictícios da demonstração.
  const initial = createDemo(TODAY);
  // Registra hoje uma quantia recebida no dia vinte, sem alterar a competência de outubro.
  const next = payInvoice(initial, "demo-carla-2026-10", 8000, "2026-10-20", "Pix", undefined, TODAY);
  // O histórico precisa mostrar a data efetiva escolhida pelo professor.
  assert.equal(next.receipts.at(-1)?.paidOn, "2026-10-20");
  // A mesma cobrança deve continuar vinculada ao recebimento.
  assert.equal(next.receipts.at(-1)?.invoiceId, "demo-carla-2026-10");
  // A cobrança seguinte mantém o dia cinco escolhido, sem herdar o dia de recebimento.
  assert.equal(next.invoices.find((item) => item.id === "demo-carla-2026-11")?.dueDate, "2026-11-05");
  // O preço e o vencimento da cobrança quitada não são reescritos.
  assert.equal(next.invoices.find((item) => item.id === "demo-carla-2026-10")?.dueDate, "2026-10-05");
  // A situação financeira deve validar a quitação quando não há outras dívidas exigíveis.
  assert.equal(financialState(next, "demo-carla", TODAY).paid, true);
  // Nenhum evento do estado inicial foi alterado ou removido.
  assert.equal(initial.receipts.length, 2);
// Finaliza o cenário de recebimento retroativo.
});

// Reproduz o exemplo da captura: uma baixa não quita automaticamente todas as competências.
test("Ana fica Pago somente depois de quitar setembro e outubro", () => {
  // Começa com duas mensalidades de setenta reais ainda em aberto.
  const initial = createDemo(TODAY);
  // O primeiro recebimento quita especificamente setembro.
  const september = payInvoice(initial, "demo-ana-2026-09", 7000, "2026-10-20", "Pix", undefined, TODAY);
  // Confirma que a baixa de setembro foi efetivada.
  assert.equal(balance(september.invoices.find((item) => item.id === "demo-ana-2026-09")!, september.receipts), 0);
  // Outubro ainda impede a classificação geral Pago.
  assert.equal(financialState(september, "demo-ana", TODAY).paid, false);
  // O segundo recebimento quita a competência que permanecia pendente.
  const october = payInvoice(september, "demo-ana-2026-10", 7000, TODAY, "Dinheiro", undefined, TODAY);
  // Sem outras dívidas exigíveis, a interface deve classificar a aluna como Pago.
  assert.equal(financialState(october, "demo-ana", TODAY).paid, true);
  // O próximo vencimento continua dez de novembro, sem apagar as duas baixas anteriores.
  assert.equal(october.invoices.find((item) => item.id === "demo-ana-2026-11")?.dueDate, "2026-11-10");
  // O histórico contém os dois recebimentos iniciais e os dois lançamentos novos.
  assert.equal(october.receipts.length, 4);
// Finaliza a reprodução da situação relatada.
});

// A falha de data não pode gerar uma baixa, mesmo que valor e aluno estejam corretos.
test("data inválida não altera saldos ou histórico", () => {
  // Mantém o estado de origem para conferir que o erro não deixou efeitos parciais.
  const initial = createDemo(TODAY);
  // Uma data futura é recusada antes de construir o novo estado.
  assert.throws(() => payInvoice(initial, "demo-carla-2026-10", 8000, "2026-10-23", "Pix", undefined, TODAY));
  // A cobrança da demonstração continua integralmente em aberto.
  assert.equal(balance(initial.invoices.find((item) => item.id === "demo-carla-2026-10")!, initial.receipts), 8000);
  // O histórico inicial continua com os mesmos dois eventos fictícios.
  assert.equal(initial.receipts.length, 2);
// Finaliza a proteção contra baixa parcial em falha de validação.
});

