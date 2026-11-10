// Os botões de ordenação mudam apenas a apresentação dos resultados fictícios desta visita.
"use client";
// O estado local é descartado pelo reinício de tela já configurado no projeto principal.
import { useState } from "react";
// Usa a mesma lista de faixas e o mesmo tipo de aluno das demais telas da demonstração.
import { GRADES, type Student } from "@/lib/demonstracao/billing";
// Reutiliza o agregador e a ordenação verificados por testes, sem cálculos duplicados na interface.
import { athleteStandings, createDemoFights, rankAthletes, totalDecisoes, type RankingOrder } from "@/lib/demonstracao/ranking";
// Somente confrontos finalizados do novo registro são acrescentados ao histórico demonstrativo.
import { completedFightEntries } from "@/lib/demonstracao/fights";
// Compartilha os resultados confirmados, sem guardar o formulário de uma tela anterior.
import { useFights } from "./fights-provider";
// Os estilos compartilham as variáveis de tema e não alteram as cores de graduação existentes.
import "./ranking.css";
// As opções distinguem volume de participações, eficiência e hierarquia de graduação.
const criteria: { id: RankingOrder; label: string; explanation: string }[] = [
  // O total de lutas é o padrão pedido para apresentar os atletas mais participativos.
  { id: "lutas", label: "Mais lutas", explanation: "Do maior para o menor total de lutas concluídas." },
  // Separa pouca experiência de ausência total de participação.
  { id: "menos-lutas", label: "Menos lutas", explanation: "Do menor para o maior total de lutas concluídas, somente entre atletas que já lutaram." },
  // O filtro ao lado de Menos lutas mostra exclusivamente os atletas sem resultado concluído.
  { id: "sem-lutas", label: "Nunca lutaram", explanation: "Atletas sem combate com decisão registrado. W.O. não representa combate disputado." },
  // O botão mantém a ordenação pelo percentual, incluindo W.O. nas decisões válidas.
  { id: "aproveitamento", label: "Vitórias", explanation: "Vitórias divididas por decisões classificáveis, incluindo W.O." },
  // Percentual de derrotas aparece ao lado do percentual de vitórias; maior proporção vem primeiro.
  { id: "derrotas", label: "Derrotas", explanation: "Derrotas divididas por decisões classificáveis, incluindo W.O." },
  // Empates também usam todas as participações no denominador, com ausência de lutas no final.
  { id: "empates", label: "Empates por decisão", explanation: "Empates autorizados divididos por decisões classificáveis, incluindo W.O." },
  // Graduação é uma hierarquia independente dos resultados competitivos registrados.
  { id: "faixa", label: "Hierarquia de faixa", explanation: "Da faixa preta até a branca. A graduação não comprova desempenho competitivo nem muda automaticamente." },
];
// Recebe apenas alunos fictícios; não consulta banco nem libera cadastro de resultados reais.
export default function RankingAtletas({ students }: { students: Student[] }) {
  // O primeiro critério destaca o volume, sem aplicar um mínimo arbitrário de participações.
  const [order, setOrder] = useState<RankingOrder>("lutas");
  // Resultados confirmados em Registro de lutas permanecem disponíveis ao navegar nesta visita.
  const { records } = useFights();
  // Os totais são sempre derivados dos eventos da demonstração, sem persistência ou dados pessoais reais.
  const standings = rankAthletes(athleteStandings(students, [...createDemoFights(), ...completedFightEntries(records)]), order);
  // O texto visível explica o significado do critério que acabou de ser selecionado.
  const explanation = criteria.find((criterion) => criterion.id === order)!.explanation;
  // A tabela aparece após os cartões de faixas e mantém o padrão visual da academia.
  return (
    <section className="ranking-panel content-panel" aria-labelledby="titulo-ranking">
      {/* O cabeçalho distingue a competição demonstrativa da graduação ou das mensalidades. */}
      <div className="panel-heading">
        {/* O aviso informa a origem fictícia antes de qualquer número de resultado. */}
        <div><h2 id="titulo-ranking">Ranking de atletas</h2><p>Lutas e resultados fictícios para demonstração. O histórico real será cadastrado em uma próxima etapa.</p></div>
        {/* O selo acompanha também a visualização impressa para não apresentar exemplos como resultados reais. */}
        <span className="demo-tag">DEMONSTRAÇÃO</span>
      </div>
      {/* Os botões anunciam a seleção sem depender apenas da cor de fundo. */}
      <div className="ranking-controls no-print" role="group" aria-label="Ordenar ranking de atletas">
        {/* Cada opção corresponde a uma regra explícita coberta pelos testes de ordenação. */}
        {criteria.map((criterion) => (
          // Atualiza somente a ordem; os resultados e os totais não mudam ao clicar.
          <button key={criterion.id} type="button" aria-pressed={order === criterion.id} aria-controls="tabela-ranking" onClick={() => setOrder(criterion.id)}>{criterion.label}</button>
        ))}
      </div>
      {/* A descrição é anunciada quando a ordem muda e informa como interpretar o ranking. */}
      <p className="ranking-explanation" role="status">{explanation}</p>
      {/* A tabela conserva as colunas no computador e mostra seus rótulos nos cartões de celular. */}
      <div className="table-wrap">
        {/* O nome acessível acompanha a ordenação para leitores de tela. */}
        <table role="table" data-mobile-cards id="tabela-ranking" aria-label={`Ranking de atletas — ${criteria.find((criterion) => criterion.id === order)!.label}`}>
          {/* Cada indicador usa sua própria coluna para evitar confundir total de vitórias com percentual. */}
          <thead role="rowgroup"><tr role="row"><th role="columnheader" scope="col">Posição</th><th role="columnheader" scope="col">Atleta</th><th role="columnheader" scope="col">Faixa</th><th role="columnheader" scope="col" className="numeric">Combates</th><th role="columnheader" scope="col" className="numeric">Vitórias</th>
            {/* As duas colunas de W.O. mostram a parcela já incluída nos totais de vitória e derrota. */}
            <th role="columnheader" scope="col" className="numeric">Vitórias por W.O.</th>
            <th role="columnheader" scope="col" className="numeric">Derrotas por W.O.</th>
            <th role="columnheader" scope="col" className="numeric">Derrotas</th><th role="columnheader" scope="col" className="numeric">Empates</th><th role="columnheader" scope="col" className="numeric">Vitórias por luta</th><th role="columnheader" scope="col" className="numeric">Derrotas por decisão</th><th role="columnheader" scope="col" className="numeric">Empates por decisão</th></tr></thead>
          {/* Os oito atletas demonstrativos continuam presentes, inclusive quem está inativo ou sem resultados. */}
          <tbody role="rowgroup">
            {/* A posição reflete apenas o critério selecionado nesta tabela. */}
            {standings.map((standing, index) => {
              // Recupera nome e cores da faixa centralizada, incluindo a nova faixa marrom.
              const grade = GRADES.find((item) => item.id === standing.student.grade)!;
              // Percentuais usam todas as decisões classificáveis, inclusive W.O.
              const total = totalDecisoes(standing);
              // O percentual só é arredondado para exibição; a ordenação compara as frações originais.
              const rate = standing.winRate === null ? "Sem decisões" : standing.winRate.toLocaleString("pt-BR", { style: "percent", maximumFractionDigits: 1 });
              // Cada linha mostra a soma dos resultados e o estado cadastral sem alterar nenhum dado.
              return (
                <tr role="row" key={standing.student.id}>
                  {/* O número é uma posição de ordenação demonstrativa, sem pontuação oficial presumida. */}
                  <td role="cell" data-label="Posição"><span className={index < 3 ? "ranking-position leading" : "ranking-position"}>{index + 1}º</span></td>
                  {/* A inatividade cadastral não apaga o histórico de participações. */}
                  <td role="cell" data-label="Atleta"><span className="student-name">{standing.student.name}</span>{!standing.student.active && <span className="enrollment-status inactive">Inativo</span>}</td>
                  {/* O nome da faixa acompanha a cor para que a identificação não dependa da visão de cores. */}
                  <td role="cell" data-label="Faixa"><span className="grade-badge" style={{ background: grade.color, color: grade.ink }}>{grade.name}</span></td>
                  {/* O total inclui apenas lutas com resultado concluído nesta demonstração. */}
                  <td role="cell" data-label="Combates" className="numeric">{standing.fights}</td>
                  {/* O total de vitórias já inclui os resultados por W.O. */}
                  <td role="cell" data-label="Vitórias" className="numeric">{standing.wins}</td>
                  {/* A contagem separada mostra quantas vitórias vieram de ausência. */}
                  <td role="cell" data-label="Vitórias por W.O." className="numeric">{standing.walkoverWins}</td>
                  {/* A contagem separada mostra quantas derrotas vieram de ausência. */}
                  <td role="cell" data-label="Derrotas por W.O." className="numeric">{standing.walkoverLosses}</td>
                  {/* O total de derrotas também já inclui os resultados por W.O. */}
                  <td role="cell" data-label="Derrotas" className="numeric">{standing.losses}</td>
                  {/* Os empates aparecem separados e também integram o total de participações. */}
                  <td role="cell" data-label="Empates" className="numeric">{standing.draws}</td>
                  {/* Atletas sem lutas recebem uma indicação textual, não uma divisão por zero. */}
                  <td role="cell" data-label="Vitórias por luta" className="numeric">{rate}</td>
                  {/* Derrotas divididas por todas as participações; sem lutas continua explícito. */}
                  <td role="cell" data-label="Derrotas por decisão" className="numeric">{total ? (standing.losses / total).toLocaleString("pt-BR", { style: "percent", maximumFractionDigits: 1 }) : "Sem decisões"}</td>
                  {/* Empates recebem percentual próprio e não são contabilizados como vitória ou derrota. */}
                  <td role="cell" data-label="Empates por decisão" className="numeric">{total ? (standing.draws / total).toLocaleString("pt-BR", { style: "percent", maximumFractionDigits: 1 }) : "Sem decisões"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {/* O critério de desempate torna a ordenação reproduzível; não estabelece regulamento de competição real. */}
      {standings.length === 0 && <p className="empty">Nenhum atleta corresponde a este filtro.</p>}
      {/* A descrição mantém os desempates conhecidos separados do filtro de ausência de lutas. */}
      <p className="ranking-explanation">Ranking interno. As colunas de W.O. detalham resultados já incluídos nos totais de vitórias, derrotas e percentuais. O total de combates considera lutas disputadas com decisão. Cancelamentos e lutas sem decisão ficam no histórico.</p>
    </section>
  );
}
