// As faixas e os prazos vêm da imagem fornecida pelo usuário; não promovem alunos automaticamente.
export const GRADES = [
  { id: "branca", name: "Branca", color: "#ffffff", ink: "#202020", months: 3 }, // Primeiro nível indicado.
  { id: "amarela", name: "Amarela", color: "#f4ed00", ink: "#282400", months: 4 }, // Amarela: quatro meses na referência.
  { id: "vermelha", name: "Vermelha", color: "#d92b12", ink: "#ffffff", months: 8 }, // Terceira posição na nova ordem; preserva o prazo antes informado para essa faixa.
  { id: "verde", name: "Verde", color: "#29a83c", ink: "#092c10", months: 6 }, // Texto escuro mantém contraste no verde da referência.
  { id: "azul", name: "Azul", color: "#4020df", ink: "#ffffff", months: 7 }, // Texto claro mantém contraste no azul.
  { id: "roxa", name: "Roxa", color: "#7c3aed", ink: "#ffffff", months: null }, // Nova sexta faixa; o usuário ainda não informou seu prazo de referência.
  { id: "marrom", name: "Marrom", color: "#8B4513", ink: "#ffffff", months: 12 }, // Nome e cor marrom seguem o ajuste solicitado; os doze meses continuam apenas como referência.
  { id: "preta", name: "Preta", color: "#17191d", ink: "#ffffff", months: null }, // A imagem não informa prazo para preta.
] as const;

// Restringe a graduação aos identificadores da referência fornecida.
export type GradeId = (typeof GRADES)[number]["id"];
// Representa cada aluno fictício e suas condições de matrícula, sem dados sensíveis.
export type Student = {
  id: string; // Identificador estável para relacionar cobranças e recebimentos.
  name: string; // Nome apresentado nas telas e na impressão.
  active: boolean; // Situação cadastral independente de qualquer pagamento.
  grade: GradeId; // Faixa exibida com a cor correspondente.
  weeklyClasses: 2 | 3 | 5; // Frequência contratada em aulas por semana.
  monthlyCents: number; // Mensalidade em centavos para evitar erro de arredondamento.
  dueDay: number | null; // Dia recorrente escolhido no primeiro pagamento; null indica escolha pendente.
};

// Cada competência possui uma cobrança própria; o histórico nunca é zerado ou apagado.
export type Invoice = {
  id: string; // Chave única formada por aluno e competência nesta demonstração.
  studentId: string; // Aluno responsável pela cobrança.
  month: string; // Competência no formato AAAA-MM.
  dueDate: string; // Vencimento no formato AAAA-MM-DD, comparável sem conversão de fuso.
  amountCents: number; // Valor contratado preservado mesmo se o plano mudar depois.
};

// O recebimento é separado da cobrança para manter pagamentos parciais e histórico.
export type Receipt = {
  id: string; // Identificador do recebimento fictício.
  invoiceId: string; // Cobrança à qual este valor foi destinado.
  amountCents: number; // Quantia efetivamente simulada, em centavos.
  paidOn: string; // Data local informada pelo fluxo de pagamento.
  method: "Pix" | "Dinheiro" | "Cartão"; // Meio registrado, sem integração bancária nesta etapa.
};

// Agrupa o estado imutável usado pela interface de demonstração.
export type Ledger = {
  students: Student[]; // Cadastro fictício, separado dos Excel reais.
  invoices: Invoice[]; // Mensalidades geradas, incluindo as já quitadas.
  receipts: Receipt[]; // Livro de recebimentos simulados nesta sessão.
};

// Retorna a data do Brasil; não usa o fuso do computador que executa o servidor.
export function todayInBrazil(): string {
  // O formato sueco é ISO e mantém zeros iniciais, com o fuso explicitamente escolhido.
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

// Avança ou retrocede competências sem somar trinta dias a um vencimento.
export function shiftMonth(month: string, offset: number): string {
  const [year, number] = month.split("-").map(Number); // Separa ano e mês civil.
  const date = new Date(Date.UTC(year, number - 1 + offset, 1)); // UTC evita efeitos de horário de verão.
  return date.toISOString().slice(0, 7); // Devolve apenas AAAA-MM.
}

// Ajusta 29/30/31 ao fim de meses curtos sem esquecer o dia originalmente escolhido.
export function dueDateFor(month: string, preferredDay: number): string {
  // Só permite dias inteiros do calendário recorrente.
  if (!Number.isInteger(preferredDay) || preferredDay < 1 || preferredDay > 31) throw new Error("Escolha um dia entre 1 e 31.");
  const [year, number] = month.split("-").map(Number); // Obtém o ano e o mês-alvo.
  const lastDay = new Date(Date.UTC(year, number, 0)).getUTCDate(); // Dia zero do mês seguinte é o último do atual.
  const actualDay = Math.min(preferredDay, lastDay); // Limita somente este vencimento.
  return `${month}-${String(actualDay).padStart(2, "0")}`; // Mantém representação ISO consistente.
}

// Calcula o saldo a partir dos recebimentos, sem modificar o valor da cobrança.
export function balance(invoice: Invoice, receipts: Receipt[]): number {
  const paid = receipts.filter((item) => item.invoiceId === invoice.id).reduce((sum, item) => sum + item.amountCents, 0); // Soma só as alocações desta cobrança.
  return invoice.amountCents - paid; // Zero representa quitação; valor positivo representa pendência.
}

// Compara datas civis por UTC apenas para contar dias, evitando frações por mudança de fuso.
export function daysLate(dueDate: string, today: string): number {
  return Math.max(0, Math.floor((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${dueDate}T00:00:00Z`)) / 86_400_000)); // Vencimento de hoje ainda não é atraso.
}

// Lista as cobranças abertas de um aluno, da mais antiga para a mais recente.
export function openInvoices(ledger: Ledger, studentId: string): Invoice[] {
  return ledger.invoices.filter((invoice) => invoice.studentId === studentId && balance(invoice, ledger.receipts) > 0).sort((a, b) => a.dueDate.localeCompare(b.dueDate)); // Trabalha em uma lista nova.
}

// O status binário responde à dívida exigível hoje; uma mensalidade futura não muda Pago prematuramente.
export function financialState(ledger: Ledger, studentId: string, today: string) {
  const open = openInvoices(ledger, studentId); // Reúne saldos, inclusive pagamentos parciais.
  const overdue = open.filter((invoice) => invoice.dueDate < today); // Exclui vencimentos de hoje.
  const dueNow = open.filter((invoice) => invoice.dueDate <= today); // Inclui parcelas que já podem ser cobradas.
  const hasSettledInvoice = ledger.invoices.some((invoice) => invoice.studentId === studentId && balance(invoice, ledger.receipts) === 0); // Não chama de Pago quem ainda não realizou nenhuma quitação.
  return {
    paid: dueNow.length === 0 && hasSettledInvoice, // Exige quitação real na simulação e ausência de dívida exigível hoje.
    overdue, // Permite mostrar dias e valor em atraso sem confundir com matrícula inativa.
    open, // Inclui o próximo vencimento futuro para acompanhamento.
    overdueCents: overdue.reduce((sum, invoice) => sum + balance(invoice, ledger.receipts), 0), // Soma apenas saldo vencido.
  };
}

// Confere uma data civil real antes de registrar um recebimento; vencimento e recebimento são independentes.
export function validateReceiptDate(paidOn: string, referenceToday: string): void {
  // Exige o formato do campo de calendário, sem aceitar conversões ambíguas de texto.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(paidOn)) throw new Error("Informe uma data de recebimento válida.");
  // Usa UTC apenas para conferir o calendário, sem deslocar o dia escolhido pelo professor.
  const timestamp = Date.parse(`${paidOn}T00:00:00Z`);
  // Impede datas inexistentes, como 31 de fevereiro, mesmo que o JavaScript normalize o mês.
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== paidOn) throw new Error("Informe uma data de recebimento válida.");
  // Um recebimento já realizado pode ser retroativo, mas não pode estar no futuro.
  if (paidOn > referenceToday) throw new Error("A data do recebimento não pode ser futura.");
// Finaliza a validação sem alterar cobranças ou recebimentos.
}

// Registra um pagamento na simulação, devolvendo novo estado sem alterar o anterior.
export function payInvoice(ledger: Ledger, invoiceId: string, amountCents: number, paidOn: string, method: Receipt["method"], firstDueDay?: number, referenceToday: string = todayInBrazil()): Ledger {
  // Valida a data antes de criar qualquer evento; a interface informa a mesma data brasileira usada na tela.
  validateReceiptDate(paidOn, referenceToday);
  const invoice = ledger.invoices.find((item) => item.id === invoiceId); // Localiza a competência escolhida.
  if (!invoice) throw new Error("Mensalidade não encontrada."); // Evita baixa sem cobrança correspondente.
  const student = ledger.students.find((item) => item.id === invoice.studentId); // Confirma o vínculo cadastral.
  if (!student) throw new Error("Aluno não encontrado."); // Interrompe se o vínculo estiver inconsistente.
  const remaining = balance(invoice, ledger.receipts); // Recalcula o saldo na hora da operação.
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0 || amountCents > remaining) throw new Error("Informe um valor maior que zero e até o saldo da mensalidade."); // Impede excesso e baixa repetida de cobrança quitada.
  const preferredDay = student.dueDay ?? firstDueDay; // Só consulta a escolha inicial se ainda não existe dia fixado.
  if (preferredDay === undefined) throw new Error("Escolha o dia do vencimento mensal."); // Exige decisão no primeiro pagamento.
  dueDateFor(invoice.month, preferredDay); // Valida o dia antes de registrar qualquer efeito.
  const receipt: Receipt = { id: `recibo-${ledger.receipts.length + 1}`, invoiceId, amountCents, paidOn, method }; // Cria evento de recebimento independente.
  const students = ledger.students.map((item) => item.id === student.id ? { ...item, dueDay: preferredDay } : item); // Guarda o dia escolhido, sem mexer em outros alunos.
  let invoices = [...ledger.invoices]; // Copia cobranças para preservar o estado anterior.
  // Só prepara a competência seguinte após quitação integral e para matrícula ativa.
  if (amountCents === remaining && student.active) {
    const month = shiftMonth(invoice.month, 1); // Avança pela competência original, mesmo se o pagamento atrasou.
    const id = `${student.id}-${month}`; // A mesma competência possui sempre a mesma chave.
    if (!invoices.some((item) => item.id === id)) invoices = [...invoices, { id, studentId: student.id, month, dueDate: dueDateFor(month, preferredDay), amountCents: student.monthlyCents }]; // Não duplica uma mensalidade já gerada.
  }
  return { students, invoices, receipts: [...ledger.receipts, receipt] }; // Mantém todos os recebimentos e cobranças anteriores.
}

// Agrupa inadimplência para identificar maior atraso e gerar listas imprimíveis.
function debtRows(ledger: Ledger, invoices: Invoice[], today: string) {
  return ledger.students.map((student) => {
    const overdue = invoices.filter((invoice) => invoice.studentId === student.id && invoice.dueDate < today && balance(invoice, ledger.receipts) > 0).sort((a, b) => a.dueDate.localeCompare(b.dueDate)); // Busca só dívidas efetivamente vencidas.
    return {
      student, // Inclui identificação, graduação e situação para a apresentação.
      count: overdue.length, // Conta competências em dívida, não recebimentos.
      oldest: overdue[0]?.dueDate ?? null, // Mantém ausência explícita para aluno sem atraso.
      days: overdue[0] ? daysLate(overdue[0].dueDate, today) : 0, // Mede desde a mais antiga com saldo.
      cents: overdue.reduce((sum, invoice) => sum + balance(invoice, ledger.receipts), 0), // Soma o valor ainda não recebido.
    };
  }).filter((row) => row.count > 0).sort((a, b) => b.days - a.days || b.cents - a.cents || a.student.name.localeCompare(b.student.name, "pt-BR")); // Ordena por antiguidade, depois dívida e nome.
}

// Reúne indicadores cuja base está explícita: cadastro total e vencimentos do mês selecionado.
export function buildReport(ledger: Ledger, month: string, today: string) {
  const monthly = ledger.invoices.filter((invoice) => invoice.dueDate.startsWith(month)); // Filtra por mês civil do vencimento.
  const expected = monthly.reduce((sum, invoice) => sum + invoice.amountCents, 0); // Total exigível das cobranças deste mês.
  const remaining = monthly.reduce((sum, invoice) => sum + balance(invoice, ledger.receipts), 0); // Saldo do mês inclui valores ainda não vencidos.
  return {
    students: ledger.students.length, // Total de pessoas, não de mensalidades.
    active: ledger.students.filter((student) => student.active).length, // Conta a situação cadastral.
    inactive: ledger.students.filter((student) => !student.active).length, // Não depende de estar Pago ou Não pago.
    allRemaining: ledger.invoices.reduce((sum, invoice) => sum + balance(invoice, ledger.receipts), 0), // Inclui todas as competências já geradas, inclusive futuras.
    expected, // Valor previsto das cobranças com vencimento no mês escolhido.
    received: expected - remaining, // Recebido dessas cobranças; não é fluxo de caixa por data de pagamento.
    remaining, // Quanto ainda falta receber das mesmas cobranças.
    monthly, // Relação completa do mês para tela e impressão.
    overdue: debtRows(ledger, ledger.invoices, today), // Inadimplência geral, incluindo matrículas inativas.
    monthlyOverdue: debtRows(ledger, monthly, today), // Atrasos apenas de vencimentos no mês escolhido.
  };
}

// Formata centavos apenas na apresentação; os cálculos continuam usando inteiros.
export function money(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); // Exibe real com separadores brasileiros.
}

// Evita conversão de fuso ao mostrar uma data civil.
export function displayDate(date: string): string {
  return date.split("-").reverse().join("/"); // Converte AAAA-MM-DD em DD/MM/AAAA.
}
