"use client"; // O formulário e a confirmação de resultados respondem a ações do professor.

// O estado local mantém apenas os campos ainda não confirmados e o diálogo aberto.
import { useEffect, useRef, useState, type FormEvent } from "react";
// Datas e alunos seguem os mesmos tipos e apresentação das outras telas.
import { displayDate, type Student } from "@/lib/demonstracao/billing";
// A confirmação aceita vitória, empate ou derrota, mantendo cancelamento separado.
import type { FightRecord, RecordedResult } from "@/lib/demonstracao/fights";
// O diálogo segue o catálogo validado pelo registro compartilhado.
import { REGULAMENTOS, METODOS, RESULTADOS, exigeReferencia, metodosPermitidos, type MetodoLuta, type RegulamentoLuta } from "@/lib/demonstracao/decisoes-luta";
// O ranking e este módulo compartilham os eventos confirmados durante a visita.
import { useFights } from "./fights-provider";
// Os estilos respeitam os temas branco e preto do contêiner atual.
import "./fight-register.css";
// Cada confirmação some após cinco segundos, sem apagar o registro confirmado.
import { useTemporaryMessage } from "./use-temporary-message";

// O cancelamento preserva uma ação própria, separada dos desfechos que vêm da arbitragem.
type AcaoLuta = RecordedResult | "cancelar";
// O professor escolhe se o resultado veio de um combate disputado ou de ausência confirmada.
type TipoResultado = "luta" | "wo";

// Recebe cadastros fictícios e a data local já calculada pelo módulo de gestão.
export default function FightRegister({ students, today }: { students: Student[]; today: string }) {
  const { records, schedule, finish, cancel } = useFights(); // Uma nova rota não descarta os registros confirmados da visita.
  const [adding, setAdding] = useState(false); // O formulário só aparece quando o professor clica para adicionar.
  const [studentId, setStudentId] = useState(""); // A escolha usa ID estável, não um nome digitado sem vínculo.
  const [athleteSearch, setAthleteSearch] = useState(""); // A busca filtra nomes antes da seleção do aluno por ID.
  const [cancelReason, setCancelReason] = useState(""); // Justificativa digitada somente no diálogo de cancelamento.
  // O regulamento é escolhido no agendamento para controlar as decisões disponíveis.
  const [regulamento, setRegulamento] = useState<RegulamentoLuta | "">("");
  // A escolha começa vazia a cada vitória ou derrota para evitar registrar um tipo por engano.
  const [tipoResultado, setTipoResultado] = useState<TipoResultado | "">("");
  // A seleção distingue o vencedor do método declarado pela arbitragem.
  const [metodo, setMetodo] = useState<MetodoLuta | "">("");
  const [opponent, setOpponent] = useState(""); // Adversário do confronto a agendar.
  const [date, setDate] = useState(""); // Data é obrigatória, sem suposição sobre um evento real.
  const [location, setLocation] = useState(""); // Local informado pelo professor.
  const [error, setError] = useState(""); // Falhas de preenchimento não encerram o formulário.
  const [notice, setNotice] = useTemporaryMessage(); // Confirmações são anunciadas sem deslocar o foco da página.
  // A ação clicada já identifica o desfecho do atleta no confronto selecionado.
  const [decision, setDecision] = useState<{ fight: FightRecord; resultado: AcaoLuta } | null>(null);
  // O botão escolhido define o resultado sem exigir que o professor o selecione novamente.
  const resultado = decision?.resultado;
  // Agendamentos legados seguem o padrão competitivo de ringue.
  const regras = decision?.fight.regulamento ?? "ringue";
  // A escolha entre luta e W.O. só se aplica a vitória e derrota.
  const precisaTipo = resultado === "vitoria" || resultado === "derrota";
  // W.O. já é um método oficial. Uma luta disputada ainda exige selecionar o método.
  const mostraMetodo = Boolean(resultado && resultado !== "cancelar" && (!precisaTipo || tipoResultado === "luta"));
  // Os métodos de combate seguem o regulamento e deixam W.O. na escolha própria.
  const metodos = resultado && resultado !== "cancelar" ? metodosPermitidos(regras, resultado).filter((item) => item !== "wo") : [];
  // A referência é exigida pelo método efetivo, inclusive quando a escolha é W.O.
  const metodoAtual = tipoResultado === "wo" ? "wo" : metodo;
  const [resultError, setResultError] = useState(""); // Erro de finalização permanece dentro do diálogo.
  const dialog = useRef<HTMLDialogElement>(null); // O diálogo nativo oferece foco modal e fechamento com Escape.
  const pending = records.filter((record) => record.result === null && !record.cancellation).sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)); // Próximas e pendentes ficam da mais próxima para a mais distante.
  const completed = records.filter((record) => record.result !== null && !record.cancellation).sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id)); // Histórico exibe a data mais recente primeiro.
  const cancelled = records.filter((record) => record.cancellation !== null).sort((a, b) => b.cancellation!.cancelledOn.localeCompare(a.cancellation!.cancelledOn) || a.date.localeCompare(b.date)); // Motivos permanecem consultáveis em lista própria.
  const normalize = (value: string) => value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("pt-BR"); // Pesquisa ignora acentos e diferença entre maiúsculas e minúsculas.
  const matchingStudents = students.filter((student) => normalize(student.name).includes(normalize(athleteSearch.trim()))); // A busca altera opções, sem criar ou editar alunos.
  const nameOf = (id: string) => students.find((student) => student.id === id)?.name ?? "Atleta não encontrado"; // Mantém identificação por vínculo cadastral.

  // O botão de resultado apenas abre a confirmação; a gravação ocorre no envio do diálogo.
  useEffect(() => {
    if (decision && !dialog.current?.open) dialog.current?.showModal(); // Bloqueia cliques acidentais na lista ao fundo.
    if (!decision && dialog.current?.open) dialog.current.close(); // Restaura o foco depois de confirmar ou cancelar.
  }, [decision]);

  // Adiciona o confronto sem antecipar resultado ou alterar a faixa do aluno.
  function submitSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); // Preserva os outros registros desta visita.
    try {
      // Exige escolha explícita antes de chamar a validação de agenda e modalidade.
      if (!regulamento) throw new Error("Selecione o regulamento da luta.");
      // A regra compartilhada valida também data, vínculo e duplicidade.
      schedule({ studentId, opponent, date, location, regulamento }, students, today);
      setNotice(`Luta de ${nameOf(studentId)} agendada para ${displayDate(date)}.`); // Informa exatamente o atleta e o dia confirmados.
      setAdding(false); // Fecha somente após o sucesso da operação.
      setStudentId(""); setAthleteSearch(""); setOpponent(""); setDate(""); setLocation(""); setRegulamento(""); // Limpa campos para não repetir o confronto anterior por engano.
      setError(""); // Remove a validação anterior depois de confirmar dados válidos.
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível agendar a luta."); // Mantém os dados preenchidos para correção.
    }
  }

  // A confirmação transforma a pendência em resultado e atualiza o ranking da mesma visita.
  function submitResult(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); // Não recarrega a demonstração ao confirmar o resultado.
    if (!decision || !resultado) return; // Nenhuma decisão pode existir sem luta selecionada.
    try {
      if (resultado === "cancelar") {
        cancel(decision.fight.id, cancelReason, today); // Motivo vazio ou decisão já concluída é recusado antes da alteração.
        setNotice(`Luta de ${nameOf(decision.fight.studentId)} cancelada. Motivo disponível em Lutas canceladas.`); // Não atribui derrota ao cancelamento.
      } else {
        // Exige o método declarado antes de transferir o resultado ao ranking.
        if (!metodoAtual) throw new Error("Selecione o método divulgado pela arbitragem.");
        // A regra compartilhada valida também data, modalidade e referência da decisão.
        finish(decision.fight.id, resultado, today, { metodo: metodoAtual, referencia: cancelReason });
        // Identifica W.O. na confirmação sem confundi-lo com cancelamento.
        setNotice(RESULTADOS[resultado] + (metodoAtual === "wo" ? " por W.O." : "") + " registrada para " + nameOf(decision.fight.studentId) + ".");
      }
      setDecision(null); // Fecha o diálogo após atualizar o estado compartilhado.
    } catch (cause) {
      setResultError(cause instanceof Error ? cause.message : "Não foi possível finalizar a luta."); // Preserva a confirmação para permitir conferir a falha.
    }
  }

  // Abre o diálogo da ação escolhida e descarta o preenchimento do confronto anterior.
  function abrirDecisao(fight: FightRecord, resultado: AcaoLuta) {
    setResultError(""); // A próxima tentativa começa sem mensagens de outra luta.
    setCancelReason(""); // Justificativa e referência pertencem a uma única decisão.
    setTipoResultado(""); // O professor escolhe entre luta disputada e W.O.
    setMetodo(""); // O método depende do tipo selecionado neste diálogo.
    setDecision({ fight, resultado }); // A gravação só ocorre após a confirmação.
  }

  // Alternar o tipo descarta o método e a referência que poderiam pertencer ao resultado anterior.
  function escolherTipo(tipo: TipoResultado) {
    setTipoResultado(tipo); // Determina se o resultado é por luta ou por ausência.
    setMetodo(""); // Evita reaproveitar método de um tipo diferente.
    setCancelReason(""); // Exige preencher a referência correspondente à decisão atual.
    setResultError(""); // Limpa uma falha que a nova escolha pode corrigir.
  }

  return (
    <section className="fights-module" aria-label="Registro de lutas">
      {/* O professor agenda primeiro e informa o resultado quando a luta terminar. */}
      <div className="section-intro"><div><h2>Registro de lutas</h2><p>Agende confrontos e acompanhe os resultados de cada atleta.</p></div><button className="button" type="button" onClick={() => { setAdding(true); setError(""); }}>Adicionar luta futura</button></div>
      {/* O aviso limita os dados desta etapa à visita atual, sem sugerir persistência em banco. */}
      <p className="section-footnote">Demonstração: use dados fictícios. Registros permanecem entre as telas durante esta visita e reiniciam ao recarregar ou sair do sistema.</p>
      <p className="fight-notice" role="status" aria-live="polite">{notice}</p>
      {adding && <form className="content-panel fight-form" onSubmit={submitSchedule} aria-label="Agendar luta">
        {/* Cada campo obrigatório corresponde às informações solicitadas pelo usuário. */}
        <h2>Agendar luta</h2>
        <div className="fight-fields">
          {/* A lista oferece os alunos já conhecidos da demonstração, incluindo a indicação de inatividade. */}
          <div><label>Buscar atleta por nome<input type="search" value={athleteSearch} onChange={(event) => { setAthleteSearch(event.target.value); setStudentId(""); }} placeholder="Digite o nome do atleta" /></label>
          {/* A seleção exige um ID conhecido; texto pesquisado sozinho não agenda a luta. */}
          <label>Atleta<select required value={studentId} onChange={(event) => setStudentId(event.target.value)}><option value="">Selecione o atleta</option>{matchingStudents.map((student) => <option key={student.id} value={student.id}>{student.name}{student.active ? "" : " (Inativo)"}</option>)}</select></label>
          {/* Um estado vazio explica a ausência de opções sem inventar cadastros. */}
          {matchingStudents.length === 0 && <small>Nenhum atleta encontrado com esse nome.</small>}</div>
          {/* Espaços externos são tratados pela regra de cadastro, sem reescrever nomes. */}
          <label>Nome do adversário<input required maxLength={120} value={opponent} onChange={(event) => setOpponent(event.target.value)} placeholder="Nome do adversário" /></label>
          {/* O limite é o dia local brasileiro; datas passadas não entram como eventos futuros. */}
          <label>Data da luta<input required type="date" min={today} value={date} onChange={(event) => setDate(event.target.value)} /></label>
          {/* Escolher o regulamento controla empate e métodos disponíveis no encerramento. */}
          <label>Regulamento
            <select required value={regulamento} onChange={(event) => setRegulamento(event.target.value as RegulamentoLuta | "")}>
              <option value="">Selecione o regulamento</option>
              {Object.entries(REGULAMENTOS).map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}
            </select>
          </label>
          {/* O texto pode conter arena, cidade e endereço, conforme informado pelo professor. */}
          <label>Local da luta<input required maxLength={200} value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Evento, arena ou endereço" /></label>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        {/* Cancelar descarta apenas o preenchimento ainda não confirmado, sem excluir lutas existentes. */}
        <div className="fight-actions"><button className="button button-secondary" type="button" onClick={() => setAdding(false)}>Cancelar</button><button className="button" type="submit">Agendar luta</button></div>
      </form>}

      {/* Confrontos sem decisão não participam do total de lutas concluídas do ranking. */}
      <div className="content-panel fight-section"><div className="panel-heading"><div><h2>Próximas lutas</h2><p>{pending.length} confronto(s) agendado(s) ou aguardando resultado.</p></div></div>
        {pending.length === 0 ? <p className="empty">Nenhuma luta agendada nesta visita.</p> : <div className="table-wrap"><table role="table" data-mobile-cards><thead role="rowgroup"><tr role="row"><th role="columnheader">Atleta</th><th role="columnheader">Adversário</th><th role="columnheader">Data da luta</th><th role="columnheader">Local</th><th role="columnheader">Resultado</th></tr></thead><tbody role="rowgroup">
          {/* Os botões fixam o desfecho e abrem o mesmo diálogo no celular e no computador. */}
          {pending.map((fight) => (
            <tr role="row" key={fight.id}>
              {/* Os rótulos também aparecem nos cartões de celular. */}
              <td role="cell" data-label="Atleta" className="student-name">{nameOf(fight.studentId)}</td>
              <td role="cell" data-label="Adversário">{fight.opponent}</td>
              <td role="cell" data-label="Data da luta">{displayDate(fight.date)}</td>
              <td role="cell" data-label="Local" className="fight-location">{fight.location}</td>
              <td role="cell" data-label="Resultado">
                {/* Vitória e derrota só podem ser registradas na data do confronto ou depois dela. */}
                <div className="fight-actions">
                  <button className="button result-win" type="button" disabled={fight.date > today} onClick={() => abrirDecisao(fight, "vitoria")}>Registrar vitória</button>
                  <button className="button result-loss" type="button" disabled={fight.date > today} onClick={() => abrirDecisao(fight, "derrota")}>Registrar derrota</button>
                  {/* Empate continua reservado a lutas com regulamento próprio. */}
                  {fight.regulamento === "evento" && <button className="button result-draw" type="button" disabled={fight.date > today} onClick={() => abrirDecisao(fight, "empate")}>Registrar empate</button>}
                  {/* Resultados sem decisão e cancelamentos são registrados separadamente. */}
                  <button className="button button-secondary" type="button" disabled={fight.date > today} onClick={() => abrirDecisao(fight, "sem-decisao")}>Sem decisão</button>
                  <button className="button result-cancel" type="button" onClick={() => abrirDecisao(fight, "cancelar")}>Cancelar luta</button>
                </div>
                {/* A data explica por que os resultados estão bloqueados em lutas futuras. */}
                <small className="cell-note">{fight.date > today ? "Resultados a partir de " + displayDate(fight.date) : "Aguardando resultado"}</small>
              </td>
            </tr>
          ))}
        </tbody></table></div>}
      </div>

      {/* Vitória, empate e derrota mantêm os dados do confronto e possuem texto além da cor. */}
      <div className="content-panel fight-section"><div className="panel-heading"><div><h2>Resultados registrados</h2><p>Vitória, derrota e empate autorizado entram no ranking. W.O. fica identificado. Sem decisão aparece no histórico.</p></div></div>
        {completed.length === 0 ? <p className="empty">Nenhum resultado registrado nesta visita.</p> : <div className="table-wrap"><table role="table" data-mobile-cards><thead role="rowgroup"><tr role="row"><th role="columnheader">Atleta</th><th role="columnheader">Adversário</th><th role="columnheader">Data da luta</th><th role="columnheader">Local</th><th role="columnheader">Resultado</th></tr></thead><tbody role="rowgroup">
          {completed.map((fight) => <tr role="row" key={fight.id}><td role="cell" data-label="Atleta" className="student-name">{nameOf(fight.studentId)}</td><td role="cell" data-label="Adversário">{fight.opponent}</td><td role="cell" data-label="Data da luta">{displayDate(fight.date)}</td><td role="cell" data-label="Local" className="fight-location">{fight.location}</td><td role="cell" data-label="Resultado"><span className={`fight-result ${fight.result === "vitoria" ? "won" : fight.result === "derrota" ? "lost" : "drawn"}`}>{RESULTADOS[fight.result!]}{fight.decisao?.metodo === "wo" ? " por W.O." : ""}</span>{fight.decisao && <small className="cell-note fight-reason">{METODOS[fight.decisao.metodo]}{fight.decisao.referencia ? " · " + fight.decisao.referencia : ""}</small>}</td></tr>)}
        </tbody></table></div>}
      </div>

      {/* Cancelar preserva os campos originais e mostra a justificativa integral para conferência. */}
      <div className="content-panel fight-section"><div className="panel-heading"><div><h2>Lutas canceladas</h2><p>Cancelamentos preservados com motivo. Não contam como luta, vitória, empate ou derrota.</p></div></div>
        {cancelled.length === 0 ? <p className="empty">Nenhuma luta cancelada nesta visita.</p> : <div className="table-wrap"><table role="table" data-mobile-cards><thead role="rowgroup"><tr role="row"><th role="columnheader">Atleta</th><th role="columnheader">Adversário</th><th role="columnheader">Data da luta</th><th role="columnheader">Local</th><th role="columnheader">Cancelada em</th><th role="columnheader">Motivo</th></tr></thead><tbody role="rowgroup">
          {/* O histórico conserva inclusive o dia originalmente previsto, sem substituir por uma nova luta. */}
          {cancelled.map((fight) => <tr role="row" key={fight.id}><td role="cell" data-label="Atleta" className="student-name">{nameOf(fight.studentId)}</td><td role="cell" data-label="Adversário">{fight.opponent}</td><td role="cell" data-label="Data da luta">{displayDate(fight.date)}</td><td role="cell" data-label="Local" className="fight-location">{fight.location}</td><td role="cell" data-label="Cancelada em"><span className="fight-result cancelled">Cancelada</span><small className="cell-note">{displayDate(fight.cancellation!.cancelledOn)}</small></td><td role="cell" data-label="Motivo" className="fight-reason">{fight.cancellation!.reason}</td></tr>)}
        </tbody></table></div>}
      </div>

      {/* O mesmo diálogo confirma o desfecho escolhido sem recalcular a decisão da arbitragem. */}
      <dialog className="payment-dialog" ref={dialog} aria-labelledby="fight-result-title" onCancel={() => setDecision(null)}>
        <form onSubmit={submitResult}>
          {/* O título confirma qual botão abriu a ação. */}
          <h2 id="fight-result-title">{resultado === "cancelar" ? "Cancelar luta" : resultado ? "Registrar " + RESULTADOS[resultado].toLocaleLowerCase("pt-BR") : "Registrar resultado"}</h2>
          {decision && <>
            {/* Nome, data e regulamento identificam o confronto antes da confirmação. */}
            <p className="dialog-student">{nameOf(decision.fight.studentId)} × {decision.fight.opponent}</p>
            <p className="payment-explanation">{displayDate(decision.fight.date)} · {REGULAMENTOS[regras]}</p>
            {/* Controles nativos mostram as duas opções lado a lado ou empilhadas no celular. */}
            {(resultado === "vitoria" || resultado === "derrota") && <fieldset className="fight-result-choices">
              <legend>Tipo de resultado</legend>
              <label>
                {/* Escolher por luta mantém a seleção do método oficial disponível. */}
                <input required type="radio" name="tipo-resultado" checked={tipoResultado === "luta"} onChange={() => escolherTipo("luta")} />
                {RESULTADOS[resultado]} por luta
              </label>
              <label>
                {/* Escolher W.O. usa o mesmo desfecho e exige a referência à arbitragem. */}
                <input required type="radio" name="tipo-resultado" checked={tipoResultado === "wo"} onChange={() => escolherTipo("wo")} />
                {RESULTADOS[resultado]} por W.O.
              </label>
            </fieldset>}
            {/* W.O. exige confirmação da ausência antes de registrar vitória ou derrota. */}
            {tipoResultado === "wo" && <p className="payment-explanation">Registre W.O. quando a arbitragem confirmar a ausência e declarar o resultado. Desistência durante o combate é abandono (AB).</p>}
            {/* O método publicado é obrigatório quando a escolha não identifica W.O. diretamente. */}
            {mostraMetodo && <label className="cancel-reason-field">Método oficial
              <select required value={metodo} onChange={(event) => setMetodo(event.target.value as MetodoLuta | "")}>
                <option value="">Selecione o método</option>
                {metodos.map((item) => <option key={item} value={item}>{METODOS[item]}</option>)}
              </select>
            </label>}
            {/* As decisões excepcionais exigem referência, e cancelamento exige justificativa. */}
            {(resultado === "cancelar" || exigeReferencia(metodoAtual)) && <label className="cancel-reason-field">
              {resultado === "cancelar" ? "Motivo do cancelamento" : "Decisão da arbitragem ou referência à súmula"}
              <textarea required rows={3} maxLength={500} value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} />
            </label>}
          </>}
          {/* Um erro conserva o formulário e permite corrigir a escolha. */}
          {resultError && <p className="form-error" role="alert">{resultError}</p>}
          <div className="dialog-actions">
            <button className="button button-secondary" type="button" onClick={() => setDecision(null)}>Voltar</button>
            {/* Cancelamento exige motivo e resultados exigem método antes da gravação. */}
            <button className="button" type="submit" disabled={!resultado || (resultado !== "cancelar" && !metodoAtual)}>{resultado === "cancelar" ? "Confirmar cancelamento" : "Confirmar resultado"}</button>
          </div>
        </form>
      </dialog>
    </section>
  );
}
