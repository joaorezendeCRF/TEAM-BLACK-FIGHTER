// Tipos e calendário são compartilhados com os cálculos verificados do financeiro.
import { dueDateFor, shiftMonth, type Ledger, type Student } from "./billing";

// Gera somente cadastros fictícios; os Excel reais permanecem fora da aplicação.
export function createDemo(today: string): Ledger {
  const month = today.slice(0, 7); // Usa a competência da data local fornecida pelo servidor.
  const students: Student[] = [
    { id: "demo-ana", name: "Ana Exemplo", active: true, grade: "branca", weeklyClasses: 2, monthlyCents: 7000, dueDay: 10 }, // Simula duas mensalidades pendentes.
    { id: "demo-bruno", name: "Bruno Exemplo", active: true, grade: "amarela", weeklyClasses: 3, monthlyCents: 8000, dueDay: 10 }, // Exemplo já quitado.
    { id: "demo-carla", name: "Carla Exemplo", active: true, grade: "vermelha", weeklyClasses: 3, monthlyCents: 8000, dueDay: 5 }, // Exemplo de dívida do mês.
    { id: "demo-diego", name: "Diego Exemplo", active: true, grade: "verde", weeklyClasses: 5, monthlyCents: 12000, dueDay: 15 }, // Simula recebimento parcial.
    { id: "demo-elisa", name: "Elisa Exemplo", active: true, grade: "azul", weeklyClasses: 5, monthlyCents: 12000, dueDay: 28 }, // Exemplo de vencimento futuro em parte do mês.
    { id: "demo-felipe", name: "Felipe Exemplo", active: false, grade: "roxa", weeklyClasses: 2, monthlyCents: 7000, dueDay: 8 }, // Inativo pode preservar dívida anterior.
    { id: "demo-gabriela", name: "Gabriela Exemplo", active: true, grade: "marrom", weeklyClasses: 3, monthlyCents: 8000, dueDay: Number(today.slice(8)) }, // Exemplo de vencimento hoje.
    { id: "demo-hugo", name: "Hugo Exemplo", active: true, grade: "preta", weeklyClasses: 5, monthlyCents: 12000, dueDay: null }, // Primeiro pagamento permite escolher o dia.
  ];
  // Prepara uma cobrança atual por aluno, com preço próprio preservado.
  const invoices = students.map((student) => ({ id: `${student.id}-${month}`, studentId: student.id, month, dueDate: student.dueDay ? dueDateFor(month, student.dueDay) : today, amountCents: student.monthlyCents }));
  const previous = shiftMonth(month, -1); // Competência anterior permite demonstrar múltiplos meses vencidos.
  invoices.push({ id: `demo-ana-${previous}`, studentId: "demo-ana", month: previous, dueDate: dueDateFor(previous, 10), amountCents: 7000 }); // Dívida anterior de Ana.
  const next = shiftMonth(month, 1); // Bruno já quitou o mês atual, portanto acompanha a próxima cobrança.
  invoices.push({ id: `demo-bruno-${next}`, studentId: "demo-bruno", month: next, dueDate: dueDateFor(next, 10), amountCents: 8000 }); // Demonstra próximo vencimento sem reabrir o mês pago.
  return {
    students, // Não contém CPF, telefone, saúde ou nomes dos arquivos reais.
    invoices, // Nenhuma cobrança é persistida nesta primeira etapa.
    receipts: [
      { id: "recibo-1", invoiceId: `demo-bruno-${month}`, amountCents: 8000, paidOn: today, method: "Pix" }, // Liquidação integral fictícia.
      { id: "recibo-2", invoiceId: `demo-diego-${month}`, amountCents: 4000, paidOn: today, method: "Dinheiro" }, // Recebimento parcial de quarenta reais.
    ],
  };
}
