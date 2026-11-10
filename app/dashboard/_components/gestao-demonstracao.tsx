"use client"; // Habilita filtros, navegação e pagamentos simulados no navegador.

// Hooks controlam a sessão de demonstração, a data brasileira e o diálogo de pagamento.
import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
// Importa as regras financeiras em um único lugar para tela e relatórios concordarem.
import { GRADES, balance, buildReport, daysLate, displayDate, financialState, money, payInvoice, todayInBrazil, type GradeId, type Invoice, type Receipt } from "@/lib/demonstracao/billing";
// A demonstração não utiliza nenhum registro dos alunos reais.
import { createDemo } from "@/lib/demonstracao/demo";
// Restringe todos os seletores visuais a este módulo, preservando as telas existentes.
import "./gestao.css";
// Compartilha os identificadores de navegação com as páginas protegidas no servidor.
import type { SecaoGestao } from "@/lib/navegacao-gestao";
// Demonstra o histórico esportivo abaixo dos cartões de graduação sem consultar dados reais.
import RankingAtletas from "./ranking-atletas";
// Agenda confrontos e compartilha resultados concluídos com o ranking da visita.
import FightRegister from "./fight-register";
// A prévia de matrícula fica isolada dos alunos e cobranças existentes, sem gravação no banco.
import CadastroAluno from "./cadastro-aluno";
// Cadastros persistidos ficam isolados da demonstração financeira e esportiva.
import AlunosPersistidos from "./alunos-persistidos";
// O resumo autorizado não inclui CPF, telefone ou saúde.
import type { PainelAlunos } from "@/lib/alunos/tipos";
// Confirmações visuais expiram em cinco segundos; os recebimentos permanecem no histórico.
import { useTemporaryMessage } from "./use-temporary-message";

// Define apenas as seções já disponíveis nesta etapa, sem links sem função.
type View = SecaoGestao;
// Os únicos temas oferecidos são os fundos branco e preto solicitados pelo usuário.
type Theme = "light" | "dark";
// Os rótulos são reutilizados pela navegação e pelo cabeçalho.
const sections: { id: View; label: string; number: string }[] = [
  { id: "alunos", label: "Alunos", number: "01" }, // Primeira opção conforme a ordem pedida pelo usuário.
  { id: "graduacoes", label: "Graduações", number: "02" }, // Faixas aparecem imediatamente depois dos alunos.
  { id: "pagamentos", label: "Pagamentos", number: "03" }, // Financeiro ocupa a terceira posição.
  // O quinto módulo fica antes do gerenciamento administrativo já existente.
  { id: "lutas", label: "Registro de lutas", number: "05" },
  { id: "relatorios", label: "Relatórios", number: "04" }, // Relatórios e impressão encerram o menu.
];

// Ícones vetoriais simples permanecem nítidos nos dois temas, sem depender de arquivos externos.
function ThemeIcon({ theme }: { theme: Theme }) {
  return (
    // Apresenta os dados e controles deste agrupamento da demonstração.
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {/* O tema branco usa sol; o tema preto usa lua, acompanhados também de texto no botão. */}
      {theme === "light" ? <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></> : <path d="M20.8 13.2A8.8 8.8 0 0 1 10.8 3.2a8.8 8.8 0 1 0 10 10Z" />}
    </svg>
  );
}

// Apresenta a cor da faixa com nome legível, sem depender apenas da cor.
function GradeBadge({ id }: { id: GradeId }) {
  const grade = GRADES.find((item) => item.id === id)!; // O tipo GradeId garante um dos oito níveis existentes.
  return <span className="grade-badge" style={{ background: grade.color, color: grade.ink }}>{grade.name}</span>; // Cores são dados internos controlados, não texto livre de usuário.
}

// Mantém matrícula ativa/inativa separada da situação financeira e repete o selo do site principal.
function EnrollmentStatus({ active }: { active: boolean }) {
  // O texto garante identificação além da cor, tanto no tema branco quanto no preto.
  return <span className={`enrollment-status ${active ? "active" : "inactive"}`}>{active ? "Ativo" : "Inativo"}</span>;
// Finaliza o componente compartilhado de situação cadastral.
}

// Compartilha o padrão dos números-resumo sem duplicar a estrutura visual.
function Metric({ label, value, detail, emphasis = false }: { label: string; value: string | number; detail: string; emphasis?: boolean }) {
  return (
    // Agrupa os controles ou indicadores desta seção, preservando o alinhamento no computador e no celular.
    <div className={`metric ${emphasis ? "metric-emphasis" : ""}`}>
      {/* Rótulo explica o significado do valor, inclusive na impressão. */}
      <span>{label}</span>
      {/* Valores monetários e contagens usam alinhamento numérico consistente. */}
      <strong>{value}</strong>
      {/* Detalhe registra a base do indicador para não confundir previsão com saldo. */}
      <small>{detail}</small>
    </div>
  );
}

// Mostra inadimplência agrupada, reutilizada nos dois recortes do relatório.
function DebtTable({ rows }: { rows: ReturnType<typeof buildReport>["overdue"] }) {
  return rows.length === 0 ? <p className="empty">Nenhum aluno em atraso neste recorte.</p> : (
    // Agrupa os controles ou indicadores desta seção, preservando o alinhamento no computador e no celular.
    <div className="table-wrap">
      {/* Apresenta os registros completos com cabeçalho e linhas, sem alterar o estado financeiro. */}
      <table role="table" data-mobile-cards>
        {/* Identifica o significado das colunas antes dos registros da tabela. */}
        <thead role="rowgroup"><tr role="row"><th role="columnheader">Aluno / faixa</th><th role="columnheader">Mais antigo</th><th role="columnheader">Dias de atraso</th><th role="columnheader">Mensalidades</th><th role="columnheader" className="numeric">Valor vencido</th></tr></thead>
        {/* Agrupa as linhas calculadas a partir dos exemplos fictícios desta visita. */}
        <tbody role="rowgroup">
          {/* A ordem já foi calculada por antiguidade, saldo e nome. */}
          {rows.map((row) => <tr role="row" key={row.student.id}>
            {/* Exibe o valor calculado na coluna correspondente sem alterar cobranças ou recebimentos. */}
            <td role="cell" data-label="Aluno / faixa"><span className="student-name">{row.student.name}</span><GradeBadge id={row.student.grade} /></td>
            {/* Exibe o valor calculado na coluna correspondente sem alterar cobranças ou recebimentos. */}
            <td role="cell" data-label="Mais antigo">{displayDate(row.oldest!)}</td>
            {/* Exibe o valor calculado na coluna correspondente sem alterar cobranças ou recebimentos. */}
            <td role="cell" data-label="Dias de atraso">{row.days} dias</td>
            {/* Exibe o valor calculado na coluna correspondente sem alterar cobranças ou recebimentos. */}
            <td role="cell" data-label="Mensalidades">{row.count}</td>
            {/* Exibe o valor calculado na coluna correspondente sem alterar cobranças ou recebimentos. */}
            <td role="cell" data-label="Valor vencido" className="numeric">{money(row.cents)}</td>
          </tr>)}
        </tbody>
      </table>
    </div>
  );
}

// Monta a interface local da primeira etapa, com simulação somente em memória.
export default function Dashboard({ initialToday, view, painelAlunos }: { initialToday: string; view: View; painelAlunos?: PainelAlunos }) {
  const [today, setToday] = useState(initialToday); // Data brasileira inicial, consistente com a renderização do servidor.
  const [ledger, setLedger] = useState(() => createDemo(initialToday)); // Gera os oito exemplos uma vez por sessão.
  const [theme, setTheme] = useState<Theme>("dark"); // Fundo preto acompanha o sistema principal até recuperar a preferência salva.
  const [search, setSearch] = useState(""); // Busca somente pelo nome, sem expor dados sensíveis.
  const [filter, setFilter] = useState("todos"); // Permite localizar pendentes ou atrasados rapidamente.
  const [month, setMonth] = useState(initialToday.slice(0, 7)); // O relatório começa no mês atual e pode ser alterado.
  const [animate, setAnimate] = useState(true); // O usuário pode desligar a pulsação dos avisos.
  const [paying, setPaying] = useState<Invoice | null>(null); // Identifica a competência que será paga, sem gravar nada ao abrir.
  const [amount, setAmount] = useState(""); // Mantém o valor digitado separado do valor financeiro em centavos.
  const [method, setMethod] = useState<Receipt["method"]>("Pix"); // Registra a forma de pagamento simulada.
  const [receivedOn, setReceivedOn] = useState(initialToday); // Permite informar o dia efetivo em que o professor recebeu, sem mudar a competência.
  const [firstDay, setFirstDay] = useState(Number(initialToday.slice(8))); // Sugere o dia de hoje para o primeiro vencimento.
  const [message, setMessage] = useTemporaryMessage(); // Confirma ações sem interromper a navegação.
  const [error, setError] = useState(""); // Exibe validações dentro do diálogo.
  const dialog = useRef<HTMLDialogElement>(null); // Diálogo nativo mantém foco, Escape e acessibilidade.
  const report = buildReport(ledger, month, today); // Os relatórios usam exatamente o mesmo estado dos pagamentos.
  const currentReport = buildReport(ledger, today.slice(0, 7), today); // Os cartões da tela principal sempre usam o mês atual.
  const selectedStudent = paying ? ledger.students.find((student) => student.id === paying.studentId) : undefined; // Obtém o aluno da cobrança selecionada.
  const selectedBalance = paying ? balance(paying, ledger.receipts) : 0; // Atualiza o teto permitido para o pagamento.

  // Recupera somente a preferência de aparência, sem guardar alunos ou recebimentos no navegador.
  useEffect(() => {
    let savedTheme: Theme = "dark"; // Preferência ausente ou inválida mantém o fundo preto.
    try {
      savedTheme = window.localStorage.getItem("tbf-gestao-theme") === "light" ? "light" : "dark"; // Aceita apenas os dois valores previstos.
    } catch {
      // Bloqueio do armazenamento não impede abrir ou usar a demonstração.
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Sincroniza apenas a preferência visual armazenada neste navegador.
    setTheme(savedTheme); // Mantém o botão selecionado de acordo com a aparência restaurada.
  }, []);

  // Aplica a escolha imediatamente e tenta preservá-la para o próximo acesso neste navegador.
  function changeTheme(nextTheme: Theme) {
    setTheme(nextTheme); // Atualiza a seleção acessível dos botões de sol e lua.
    try {
      window.localStorage.setItem("tbf-gestao-theme", nextTheme); // Armazena apenas aparência, nunca dados financeiros.
    } catch {
      // Se o navegador bloquear a preferência, a mudança ainda funciona durante a sessão.
    }
  }

  // A data é revista a cada minuto para que avisos mudem após a virada do dia no Brasil.
  useEffect(() => {
    const timer = window.setInterval(() => setToday(todayInBrazil()), 60_000); // Não reinicia os exemplos ao mudar a data.
    return () => window.clearInterval(timer); // Evita manter temporizadores após fechar a página.
  }, []);

  // O diálogo nativo bloqueia a interação com o fundo e devolve o foco quando fecha.
  useEffect(() => {
    if (paying && !dialog.current?.open) dialog.current?.showModal(); // Abrir não representa confirmação do pagamento.
    if (!paying && dialog.current?.open) dialog.current.close(); // Fecha após confirmar ou cancelar.
  }, [paying]);

  // Preenche a proposta de baixa com o saldo exato da competência escolhida.
  function openPayment(invoice: Invoice) {
    setPaying(invoice); // Preserva a identificação da cobrança, inclusive se for de mês anterior.
    setAmount((balance(invoice, ledger.receipts) / 100).toFixed(2)); // Sugere quitação integral, mas aceita parcial.
    setReceivedOn(today); // Sugere hoje em cada abertura, permitindo selecionar uma data de recebimento anterior.
    setFirstDay(Number(today.slice(8))); // O aluno pode ajustar a sugestão no primeiro pagamento.
    setError(""); // Remove erro de uma tentativa anterior sem apagar histórico financeiro.
  }

  // Valida e aplica o recebimento fictício apenas após confirmação do formulário.
  function submitPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); // Evita recarregar a página e perder o estado da demonstração.
    if (!paying) return; // Não existe operação sem uma competência selecionada.
    try {
      const cents = Math.round(Number(amount.replace(",", ".")) * 100); // Converte o valor para centavos antes dos cálculos.
      const updated = payInvoice(ledger, paying.id, cents, receivedOn, method, firstDay, today); // Valida data, valor e cobrança sem deslocar o ciclo mensal.
      const remaining = balance(paying, updated.receipts); // Distingue quitação desta competência de pagamento parcial.
      const state = financialState(updated, paying.studentId, today); // Mantém outras competências pendentes quando houver saldo exigível.
      const otherDue = state.open.filter((invoice) => invoice.id !== paying.id && invoice.dueDate <= today); // Conta apenas outras mensalidades já exigíveis.
      const outcome = remaining === 0 ? "quitada" : `com pagamento parcial; resta ${money(remaining)}`; // Confirma o efeito sobre a mensalidade escolhida.
      const pending = otherDue.length ? ` Ainda há ${otherDue.length} outra(s) mensalidade(s) vencida(s) ou com vencimento hoje; a situação geral continua Não pago.` : state.paid ? " Situação geral: Pago. O saldo futuro corresponde ao próximo vencimento." : " A situação geral continua Não pago até quitar o saldo."; // Não confunde próxima cobrança com falha na baixa.
      setLedger(updated); // A alteração afeta pagamentos e relatórios imediatamente.
      setMessage(`Competência ${paying.month.split("-").reverse().join("/")} ${outcome} para ${selectedStudent?.name}. Recebido: ${money(cents)} em ${displayDate(receivedOn)}.${pending}`); // Confirma data efetiva, valor e quitação sem apagar outras dívidas.
      setPaying(null); // Fecha o diálogo somente depois do sucesso da operação.
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível registrar o pagamento."); // Mantém o diálogo aberto para correção.
    }
  }

  // Combina a busca textual e o filtro de situação sem modificar os cadastros.
  const visibleStudents = ledger.students.filter((student) => {
    const state = financialState(ledger, student.id, today); // Usa a mesma definição de atraso da impressão.
    const matchesFilter = filter === "todos" || (filter === "atrasados" && state.overdue.length > 0) || (filter === "nao-pago" && !state.paid) || (filter === "pago" && state.paid); // Diferencia atraso de vencimento hoje.
    return student.name.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR")) && matchesFilter; // Pesquisa não altera alunos nem recebimentos.
  });

  return (
    // Agrupa os controles ou indicadores desta seção, preservando o alinhamento no computador e no celular.
    <div data-theme={theme} className={`gestao-modulos ${animate ? "alerts-animated" : ""}`}>
      {/* Reúne o conteúdo do módulo dentro da navegação protegida do sistema principal. */}
      <main className="main-content">
        {/* Cabeçalho informa claramente data e caráter fictício dos registros. */}
        <header className="page-header no-print">
          {/* O título acompanha a seção, preservando o conteúdo funcional de cada tela. */}
          <div><p className="eyebrow">TEAM BLACK FIGHTER / GESTÃO</p><h1>{sections.find((section) => section.id === view)?.label}</h1></div>
          {/* Dois botões explícitos evitam dúvida sobre qual ícone corresponde a cada fundo. */}
          <div className="header-tools"><div className="theme-switch" role="group" aria-label="Cor de fundo"><button type="button" aria-label="Tema branco" aria-pressed={theme === "light"} onClick={() => changeTheme("light")}><ThemeIcon theme="light" /><span>Branco</span></button><button type="button" aria-label="Tema preto" aria-pressed={theme === "dark"} onClick={() => changeTheme("dark")}><ThemeIcon theme="dark" /><span>Preto</span></button></div><span className="date-chip">{displayDate(today)}</span></div>
        </header>
        {/* Agrupa os controles ou indicadores desta seção, preservando o alinhamento no computador e no celular. */}
        <div className="demo-banner no-print"><span className="demo-tag">{view === "alunos" && painelAlunos?.habilitado ? "TESTES NO BANCO" : "DEMONSTRAÇÃO"}</span>{view === "alunos" && painelAlunos?.habilitado ? "Use somente dados fictícios. Alunos, matrículas e documentos permanecem salvos após fechar o navegador." : "Dados fictícios. Pagamentos são simulações e reiniciam ao recarregar ou trocar de tela."}</div>
        {/* Explica o significado dos dados exibidos para evitar confusão entre matrícula, faixa e pagamento. */}
        <p className="action-message no-print" role="status" aria-live="polite">{message}</p>

        {/* Tela dedicada a pagamentos, independente da situação cadastral do aluno. */}
        {view === "pagamentos" && <section aria-label="Controle de mensalidades">
          {/* Agrupa os controles ou indicadores desta seção, preservando o alinhamento no computador e no celular. */}
          <div className="section-intro"><div><h2>Cada mensalidade, no seu lugar.</h2><p>Receba, acompanhe o próximo vencimento e veja quem precisa de atenção.</p></div><span className="period-tag">MÊS ATUAL · {today.slice(0, 7).split("-").reverse().join("/")}</span></div>
          {/* Agrupa os controles ou indicadores desta seção, preservando o alinhamento no computador e no celular. */}
          <div className="metrics-grid">
            {/* Apresenta os dados e controles deste agrupamento da demonstração. */}
            <Metric label="Previsto no mês" value={money(currentReport.expected)} detail="Cobranças com vencimento neste mês" />
            {/* Apresenta os dados e controles deste agrupamento da demonstração. */}
            <Metric label="Recebido dessas cobranças" value={money(currentReport.received)} detail="Recebimentos vinculados ao mês" />
            {/* Apresenta os dados e controles deste agrupamento da demonstração. */}
            <Metric label="Falta receber no mês" value={money(currentReport.remaining)} detail="Inclui valores ainda não vencidos" emphasis />
            {/* Apresenta os dados e controles deste agrupamento da demonstração. */}
            <Metric label="Alunos em atraso" value={currentReport.overdue.length} detail="Mensalidades vencidas com saldo" />
          </div>
          {/* Agrupa os controles ou indicadores desta seção, preservando o alinhamento no computador e no celular. */}
          <div className="content-panel">
            {/* Agrupa os controles ou indicadores desta seção, preservando o alinhamento no computador e no celular. */}
            <div className="panel-heading"><div><h2>Mensalidades</h2><p>Pago ou não pago. Com o histórico sempre preservado.</p></div><label className="motion-control"><input type="checkbox" checked={animate} onChange={(event) => setAnimate(event.target.checked)} />Alerta pulsando</label></div>
            {/* Agrupa os controles ou indicadores desta seção, preservando o alinhamento no computador e no celular. */}
            <div className="filter-row">
              {/* Associa o rótulo ao campo e atualiza apenas o estado temporário digitado. */}
              <label className="search-label">Buscar aluno<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Digite o nome do aluno" /></label>
              {/* Associa o rótulo ao campo e atualiza apenas o estado temporário digitado. */}
              <label>Situação<select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="todos">Todos os alunos</option><option value="atrasados">Em atraso</option><option value="nao-pago">Não pago</option><option value="pago">Pago</option></select></label>
            </div>
            {/* Agrupa os controles ou indicadores desta seção, preservando o alinhamento no computador e no celular. */}
            <div className="table-wrap"><table role="table" data-mobile-cards>
              {/* Identifica o significado das colunas antes dos registros da tabela. */}
              <thead role="rowgroup"><tr role="row"><th role="columnheader">Aluno / graduação</th><th role="columnheader">Plano</th><th role="columnheader">Vencimento</th><th role="columnheader">Pagamento</th><th role="columnheader" className="numeric">Saldo a pagar</th><th role="columnheader"><span className="sr-only">Ação</span></th></tr></thead>
              {/* Agrupa as linhas calculadas a partir dos exemplos fictícios desta visita. */}
              <tbody role="rowgroup">
                {/* Exibe a condição ou percorre os registros fictícios desta seção; nenhuma informação é persistida. */}
                {visibleStudents.map((student) => {
                  const state = financialState(ledger, student.id, today); // Calcula situação sem alterar ativo/inativo.
                  const focus = state.open[0]; // Mostra primeiro o mês mais antigo que ainda tem saldo.
                  const grade = GRADES.find((item) => item.id === student.grade)!; // Cor da graduação não representa situação financeira.
                  const lastReceipt = ledger.receipts.findLast((receipt) => ledger.invoices.some((invoice) => invoice.id === receipt.invoiceId && invoice.studentId === student.id)); // Mostra o último lançamento registrado deste aluno, mesmo quando é retroativo.
                  const receivedInvoice = lastReceipt ? ledger.invoices.find((invoice) => invoice.id === lastReceipt.invoiceId) : undefined; // Recupera a competência exata do recebimento preservado no histórico.
                  return <tr role="row" key={student.id}>
                    {/* A faixa lateral do nome e o selo usam a cor da graduação informada. */}
                    <td role="cell" data-label="Aluno / graduação"><div className="student-identity" style={{ "--grade-color": grade.color } as CSSProperties}><span className="student-name">{student.name}</span><div className="student-meta"><GradeBadge id={student.grade} />{!student.active && <EnrollmentStatus active={false} />}</div></div></td>
                    {/* Exibe o valor calculado na coluna correspondente sem alterar cobranças ou recebimentos. */}
                    <td role="cell" data-label="Plano"><strong className="cell-value">{money(student.monthlyCents)}</strong><small className="cell-note">{student.weeklyClasses}x por semana normal</small></td>
                    {/* Exibe o valor calculado na coluna correspondente sem alterar cobranças ou recebimentos. */}
                    <td role="cell" data-label="Vencimento"><strong className="cell-value">{focus ? displayDate(focus.dueDate) : "Em dia"}</strong><small className="cell-note">{student.dueDay ? `Dia escolhido: ${student.dueDay}` : "Escolher no primeiro pagamento"}</small></td>
                    {/* Distingue situação geral, competência efetivamente recebida e data do lançamento para não ocultar dívidas de outros meses. */}
                    <td role="cell" data-label="Pagamento"><span className={`payment-status ${state.paid ? "paid" : "unpaid"}`}><span className={state.overdue.length ? "alert-dot" : "status-dot"} />{state.paid ? "Pago" : "Não pago"}</span>{lastReceipt && receivedInvoice && <small className="cell-note">{receivedInvoice.month.split("-").reverse().join("/")} {balance(receivedInvoice, ledger.receipts) === 0 ? "quitada" : "recebida parcialmente"} · {displayDate(lastReceipt.paidOn)}</small>}<small className={`cell-note ${state.overdue.length ? "late-note" : ""}`}>{state.overdue.length ? `Em atraso · ${daysLate(state.overdue[0].dueDate, today)} dias` : state.paid ? "Acompanhar próximo vencimento" : focus && focus.dueDate > today ? "A vencer" : "Vence hoje"}</small></td>
                    {/* Exibe o valor calculado na coluna correspondente sem alterar cobranças ou recebimentos. */}
                    <td role="cell" data-label="Saldo a pagar" className="numeric">{money(state.open.reduce((sum, invoice) => sum + balance(invoice, ledger.receipts), 0))}<small className="cell-note">{state.overdue.length > 1 ? `${state.overdue.length} mensalidades em atraso` : focus && focus.dueDate > today ? "Próxima mensalidade" : "Competências em aberto"}</small></td>
                    {/* Exibe o valor calculado na coluna correspondente sem alterar cobranças ou recebimentos. */}
                    <td role="cell" data-label="Ação">{focus ? <button className="button button-small" onClick={() => openPayment(focus)}>{focus.dueDate > today ? "Antecipar" : "Receber"}</button> : <span className="cell-note">Sem pendências</span>}</td>
                  </tr>;
                })}
              </tbody>
            </table></div>
            {/* Exibe a condição ou percorre os registros fictícios desta seção; nenhuma informação é persistida. */}
            {visibleStudents.length === 0 && <p className="empty">Nenhum aluno corresponde à busca.</p>}
          </div>
          {/* Apresenta os dados e controles deste agrupamento da demonstração. */}
          <details className="history-panel"><summary>Histórico de recebimentos da demonstração ({ledger.receipts.length})</summary><div className="table-wrap"><table role="table" data-mobile-cards><thead role="rowgroup"><tr role="row"><th role="columnheader">Aluno</th><th role="columnheader">Competência</th><th role="columnheader" className="receipt-received">Recebimento</th><th role="columnheader" className="receipt-delay-heading">Atraso no pagamento</th><th role="columnheader">Forma</th><th role="columnheader" className="numeric">Valor</th></tr></thead><tbody role="rowgroup">
            {/* Exibe a condição ou percorre os registros fictícios desta seção; nenhuma informação é persistida. */}
            {ledger.receipts.map((receipt) => {
              const invoice = ledger.invoices.find((item) => item.id === receipt.invoiceId)!; // Recupera a competência preservada.
              const student = ledger.students.find((item) => item.id === invoice.studentId)!; // Identifica quem realizou o pagamento.
              const delay = daysLate(invoice.dueDate, receipt.paidOn); // Mede até a data do recebimento; não aumenta depois que o pagamento ocorreu.
              // Verde identifica recebimento; vermelho destaca atraso daquele pagamento, inclusive parcial, sem alterar datas ou valores.
              return <tr role="row" key={receipt.id}><td role="cell" data-label="Aluno">{student.name}</td><td role="cell" data-label="Competência">{invoice.month.split("-").reverse().join("/")}</td><td role="cell" data-label="Recebimento" className="receipt-received">{displayDate(receipt.paidOn)}</td><td role="cell" data-label="Atraso no pagamento" className={delay > 0 ? "receipt-late" : "receipt-on-time"}>{delay > 0 ? `Sim · ${delay} dia${delay === 1 ? "" : "s"} de atraso` : "Sem atraso"}</td><td role="cell" data-label="Forma">{receipt.method}</td><td role="cell" data-label="Valor" className="numeric">{money(receipt.amountCents)}</td></tr>;
            })}
          </tbody></table></div></details>
        </section>}

        {/* Consulta cadastral inicial: não permite inserir dados pessoais reais nesta demonstração. */}
        {/* O modo persistente apresenta somente os cadastros salvos; os exemplos antigos seguem disponíveis quando desligado. */}
        {view === "alunos" && painelAlunos?.habilitado && <AlunosPersistidos painel={painelAlunos} today={today} />}
        {view === "alunos" && !painelAlunos?.habilitado && <section><div className="section-intro"><div><h2>Alunos da academia</h2><p>Situação da matrícula e graduação, separadas das mensalidades.</p></div></div><CadastroAluno today={today} /><div className="metrics-grid three"><Metric label="Total de alunos" value={report.students} detail="Cadastros fictícios nesta sessão" /><Metric label="Ativos" value={report.active} detail="Matrículas ativas" /><Metric label="Inativos" value={report.inactive} detail="Histórico preservado" /></div><div className="content-panel"><div className="table-wrap"><table role="table" data-mobile-cards><thead role="rowgroup"><tr role="row"><th role="columnheader">Nome</th><th role="columnheader">Graduação</th><th role="columnheader">Plano mensal</th><th role="columnheader">Situação da matrícula</th></tr></thead><tbody role="rowgroup">{ledger.students.map((student) => <tr role="row" key={student.id}><td role="cell" data-label="Nome" className="student-name">{student.name}</td><td role="cell" data-label="Graduação"><GradeBadge id={student.grade} /></td><td role="cell" data-label="Plano mensal">{student.weeklyClasses}x por semana normal · {money(student.monthlyCents)}</td><td role="cell" data-label="Situação da matrícula"><EnrollmentStatus active={student.active} /></td></tr>)}</tbody></table></div></div><p className="section-footnote">A prévia acima não cria alunos ou cobranças. Persistência e envio privado de documentos serão implementados após validar estrutura e permissões.</p></section>}

        {/* A impressão usa o mesmo conteúdo do relatório, incluindo todas as linhas, sem paginação oculta. */}
        {view === "relatorios" && <section className="report-view">
          {/* Agrupa os controles ou indicadores desta seção, preservando o alinhamento no computador e no celular. */}
          <div className="print-brand">TEAM BLACK FIGHTER · RELATÓRIO DA ACADEMIA · DEMONSTRAÇÃO</div>
          {/* Agrupa os controles ou indicadores desta seção, preservando o alinhamento no computador e no celular. */}
          <div className="section-intro"><div><h2>Uma visão completa do mês.</h2><p>Vencimentos: {month.split("-").reverse().join("/")} · Emitido em {displayDate(today)} · Dados fictícios</p></div><div className="report-actions no-print"><label>Mês do relatório<input aria-label="Mês do relatório" type="month" value={month} onChange={(event) => { if (event.target.value) setMonth(event.target.value); }} /></label><button className="button" onClick={() => window.print()}>Imprimir relatório</button></div></div>
          {/* Agrupa os controles ou indicadores desta seção, preservando o alinhamento no computador e no celular. */}
          <div className="metrics-grid three"><Metric label="Total de alunos" value={report.students} detail="Todos os cadastros" /><Metric label="Alunos ativos" value={report.active} detail="Situação da matrícula" /><Metric label="Alunos inativos" value={report.inactive} detail="Situação da matrícula" /></div>
          {/* Agrupa os controles ou indicadores desta seção, preservando o alinhamento no computador e no celular. */}
          <div className="metrics-grid"><Metric label="Total a receber · geral" value={money(report.allRemaining)} detail="Saldo de todas as cobranças geradas, inclusive futuras" /><Metric label="Previsto no mês" value={money(report.expected)} detail="Valor das cobranças com vencimento no mês" /><Metric label="Recebido dessas cobranças" value={money(report.received)} detail="Não representa caixa recebido por data" /><Metric label="Falta receber no mês" value={money(report.remaining)} detail="Saldo do mês, vencido ou ainda a vencer" emphasis /></div>
          {/* Agrupa os controles ou indicadores desta seção, preservando o alinhamento no computador e no celular. */}
          <div className="report-highlight"><span>MAIOR ATRASO ATUAL</span><strong>{report.overdue[0]?.student.name ?? "Nenhum aluno em atraso"}</strong><p>{report.overdue[0] ? `${report.overdue[0].days} dias · ${report.overdue[0].count} mensalidade(s) · ${money(report.overdue[0].cents)} vencidos` : "Não há mensalidades vencidas com saldo."}</p></div>
          {/* Agrupa os controles ou indicadores desta seção, preservando o alinhamento no computador e no celular. */}
          <div className="content-panel report-section"><div className="panel-heading"><div><h2>Alunos em atraso no mês selecionado</h2><p>Vencimentos desse mês que continuam pendentes hoje.</p></div></div><DebtTable rows={report.monthlyOverdue} /></div>
          {/* Agrupa os controles ou indicadores desta seção, preservando o alinhamento no computador e no celular. */}
          <div className="content-panel report-section"><div className="panel-heading"><div><h2>Inadimplência geral</h2><p>Do atraso mais antigo ao mais recente. Inclui dívidas de inativos.</p></div><strong>{money(report.overdue.reduce((sum, row) => sum + row.cents, 0))} vencidos</strong></div><DebtTable rows={report.overdue} /></div>
          {/* Agrupa os controles ou indicadores desta seção, preservando o alinhamento no computador e no celular. */}
          <div className="content-panel report-section"><div className="panel-heading"><div><h2>Todas as mensalidades do mês</h2><p>Relação completa para conferência, incluindo quitadas e a vencer.</p></div></div><div className="table-wrap"><table role="table" data-mobile-cards><thead role="rowgroup"><tr role="row"><th role="columnheader">Aluno</th><th role="columnheader">Vencimento</th><th role="columnheader" className="numeric">Previsto</th><th role="columnheader" className="numeric">Recebido</th><th role="columnheader" className="numeric">Falta receber</th></tr></thead><tbody role="rowgroup">{report.monthly.map((invoice) => {
            const remaining = balance(invoice, ledger.receipts); // Um pagamento parcial aparece em ambas as colunas corretas.
            const student = ledger.students.find((item) => item.id === invoice.studentId)!; // Vínculo estável por ID, sem comparação de nomes.
            return <tr role="row" key={invoice.id}><td role="cell" data-label="Aluno">{student.name}</td><td role="cell" data-label="Vencimento">{displayDate(invoice.dueDate)}</td><td role="cell" data-label="Previsto" className="numeric">{money(invoice.amountCents)}</td><td role="cell" data-label="Recebido" className="numeric">{money(invoice.amountCents - remaining)}</td><td role="cell" data-label="Falta receber" className="numeric">{money(remaining)}</td></tr>;
          })}</tbody><tfoot role="rowgroup"><tr role="row"><th role="columnheader" colSpan={2}>Total do mês</th><td role="cell" data-label="Previsto" className="numeric">{money(report.expected)}</td><td role="cell" data-label="Recebido" className="numeric">{money(report.received)}</td><td role="cell" data-label="Falta receber" className="numeric">{money(report.remaining)}</td></tr></tfoot></table></div>{report.monthly.length === 0 && <p className="empty">Não há mensalidades geradas com vencimento neste mês.</p>}</div>
        </section>}

        {/* Os prazos são referência; tempo decorrido não executa mudança de faixa. */}
        {view === "graduacoes" && <section><div className="section-intro"><div><h2>A evolução de cada aluno.</h2><p>Graduações e prazos conforme a imagem enviada pela academia.</p></div></div><div className="grades-grid">{GRADES.map((grade, index) => <article className="grade-card" key={grade.id}><div className="belt-strip" style={{ background: grade.color }} /><span className="eyebrow">GRADUAÇÃO {String(index + 1).padStart(2, "0")}</span><h2>{grade.name}</h2><p>{grade.months ? `Prazo de referência: ${grade.months} meses` : "Prazo não informado"}</p><small>{ledger.students.filter((student) => student.grade === grade.id).length} aluno(s) de demonstração</small></article>)}</div><p className="section-footnote">Estes prazos não representam o tempo de cada aluno na faixa. Esse tempo dependerá da data de início da graduação. A promoção depende do professor e não é automática.</p></section>}

        {/* O ranking aparece somente em Graduações, abaixo dos cartões, e usa resultados fictícios identificados. */}
        {view === "graduacoes" && <RankingAtletas students={ledger.students} />}
        {/* O registro usa somente alunos fictícios; não altera financeiro nem documentos reais. */}
        {view === "lutas" && <FightRegister students={ledger.students} today={today} />}

        {/* Identifica a academia ao final do conteúdo da demonstração. */}
        <footer className="app-footer no-print"><span>TEAM BLACK FIGHTER</span><span>Gestão que acompanha a evolução.</span></footer>
      </main>

      {/* Diálogo só simula recebimentos; não envia cobrança nem acessa banco. */}
      <dialog ref={dialog} onCancel={() => setPaying(null)} aria-labelledby="payment-title" className="payment-dialog no-print">
        {/* Reúne os campos que só simulam o recebimento após a confirmação explícita. */}
        <form onSubmit={submitPayment}>
          {/* Agrupa os controles ou indicadores desta seção, preservando o alinhamento no computador e no celular. */}
          <div className="dialog-heading"><div><p className="eyebrow">REGISTRAR NA DEMONSTRAÇÃO</p><h2 id="payment-title">Receber mensalidade</h2></div><button type="button" className="close-button" aria-label="Fechar pagamento" onClick={() => setPaying(null)}>×</button></div>
          {/* Explica o significado dos dados exibidos para evitar confusão entre matrícula, faixa e pagamento. */}
          <p className="dialog-student">{selectedStudent?.name}</p>
          {/* Agrupa os controles ou indicadores desta seção, preservando o alinhamento no computador e no celular. */}
          <div className="payment-summary"><span>Competência<strong>{paying?.month.split("-").reverse().join("/")}</strong></span><span>Vencimento<strong>{paying ? displayDate(paying.dueDate) : ""}</strong></span><span>Saldo<strong>{money(selectedBalance)}</strong></span></div>
          {/* Associa o rótulo ao campo e atualiza apenas o estado temporário digitado. */}
          <label>Valor recebido (R$)<input autoFocus required type="number" step="0.01" min="0.01" max={selectedBalance / 100} value={amount} onChange={(event) => setAmount(event.target.value)} /></label>
          {/* Registra o dia efetivo do recebimento; o limite e a regra compartilhada rejeitam datas futuras. */}
          <label>Data do recebimento<input required type="date" max={today} value={receivedOn} onChange={(event) => setReceivedOn(event.target.value)} /><small>Informe o dia em que recebeu. A competência e o dia recorrente do vencimento serão preservados.</small></label>
          {/* Associa o rótulo ao campo e atualiza apenas o estado temporário digitado. */}
          <label>Forma de pagamento<select value={method} onChange={(event) => setMethod(event.target.value as Receipt["method"])}><option>Pix</option><option>Dinheiro</option><option>Cartão</option></select></label>
          {/* Exibe a condição ou percorre os registros fictícios desta seção; nenhuma informação é persistida. */}
          {selectedStudent?.dueDay === null && <label>Dia escolhido pelo aluno para os próximos vencimentos<input required type="number" min={1} max={31} step={1} value={firstDay} onChange={(event) => setFirstDay(Number(event.target.value))} /><small>Em meses curtos, usa o último dia disponível.</small></label>}
          {/* Explica o significado dos dados exibidos para evitar confusão entre matrícula, faixa e pagamento. */}
          <p className="payment-explanation">Ao quitar, esta mensalidade fica com saldo zero. O próximo vencimento mantém o dia escolhido. Outros meses em atraso continuam em aberto.</p>
          {/* Exibe a condição ou percorre os registros fictícios desta seção; nenhuma informação é persistida. */}
          {error && <p className="form-error" role="alert">{error}</p>}
          {/* Agrupa os controles ou indicadores desta seção, preservando o alinhamento no computador e no celular. */}
          <div className="dialog-actions"><button className="button button-secondary" type="button" onClick={() => setPaying(null)}>Cancelar</button><button className="button" type="submit">Confirmar simulação</button></div>
        </form>
      </dialog>
    </div>
  );
}
