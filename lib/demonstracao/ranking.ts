// A hierarquia usa a mesma ordem das oito faixas exibidas nos cartões de graduação.
import { GRADES, type Student } from "./billing";
// A demonstração considera somente lutas concluídas com um destes três resultados.
export type FightResult = "vitoria" | "derrota" | "empate";
// Cada registro representa uma participação do atleta em uma luta fictícia concluída.
export type AthleteFight = {
  // O identificador único impede que a mesma participação seja contada duas vezes.
  id: string;
  // O vínculo usa o identificador do aluno, sem depender de nomes que podem se repetir.
  studentId: string;
  // O resultado é registrado do ponto de vista do atleta referenciado.
  result: FightResult;
  // W.O. vale para o resultado, mas não corresponde a um combate disputado.
  walkover?: boolean;
};
// Mantém separadas quantidade de lutas, eficiência nas vitórias e posição na graduação.
export type RankingOrder = "lutas" | "menos-lutas" | "sem-lutas" | "aproveitamento" | "derrotas" | "empates" | "faixa";
// Os totais são derivados dos resultados, sem alterar os dados cadastrais do atleta.
export type AthleteStanding = {
  // Reutiliza o aluno fictício para exibir nome, situação e faixa atual.
  student: Student;
  // Conta participações concluídas, incluindo vitórias, derrotas e empates.
  fights: number;
  // Vitórias e derrotas por ausência aparecem separadas do volume de combates.
  walkoverWins: number;
  // Derrotas por W.O. não aumentam a quantidade de combates.
  walkoverLosses: number;
  // Conta apenas resultados de vitória deste atleta.
  wins: number;
  // Conta apenas resultados de derrota deste atleta.
  losses: number;
  // Conta empates no total de lutas sem transformá-los em meia vitória.
  draws: number;
  // null significa ausência de lutas; zero significa que lutou e não venceu.
  winRate: number | null;
};
// Agrega resultados sem alterar alunos ou lutas e rejeita vínculos ou duplicidades inconsistentes.
export function athleteStandings(students: readonly Student[], fights: readonly AthleteFight[]): AthleteStanding[] {
  // Cria um resumo independente para cada atleta, inclusive para quem ainda não lutou.
  const standings = new Map(students.map((student) => [student.id, { student, fights: 0, walkoverWins: 0, walkoverLosses: 0, wins: 0, losses: 0, draws: 0, winRate: null } as AthleteStanding]));
  // Identificadores repetidos indicam um cadastro fictício inconsistente e não devem ser agrupados silenciosamente.
  if (standings.size !== students.length) throw new Error("Há atletas com identificador repetido no ranking.");
  // O controle local garante uma única contagem por participação concluída.
  const seen = new Set<string>();
  // Cada resultado contribui uma vez para o atleta correto, sem comparação por nome.
  for (const fight of fights) {
    // Uma chave vazia ou repetida não comprova uma nova participação e interrompe o cálculo.
    if (!fight.id || seen.has(fight.id)) throw new Error("Há lutas com identificador ausente ou repetido.");
    // O resumo só pode receber resultado de atleta que exista na lista desta demonstração.
    const standing = standings.get(fight.studentId);
    // Não cria alunos ou resultados automaticamente para compensar um vínculo ausente.
    if (!standing) throw new Error("Há uma luta sem atleta correspondente.");
    // A validação em execução protege o cálculo mesmo se uma futura origem desrespeitar a tipagem.
    if (!["vitoria", "derrota", "empate"].includes(fight.result)) throw new Error("O resultado da luta é inválido.");
    // Marca a participação após validar seus dados para impedir contagem duplicada.
    seen.add(fight.id);
    // A classificação conta W.O. em vitórias ou derrotas e destaca que não houve combate.
    if (fight.walkover) {
      // W.O. sempre tem uma parte vencedora, portanto não pode ser empate.
      if (fight.result === "empate") throw new Error("W.O. exige vitória ou derrota.");
      // Conta ausência do adversário do ponto de vista do atleta da academia.
      if (fight.result === "vitoria") standing.walkoverWins += 1;
      // Conta ausência do atleta da academia do ponto de vista do mesmo cadastro.
      else standing.walkoverLosses += 1;
    } else {
      // Só um combate com decisão classificável aumenta o total disputado.
      standing.fights += 1;
    }
    // Vitórias são contadas sem atribuir pontos arbitrários aos demais resultados.
    if (fight.result === "vitoria") standing.wins += 1;
    // Derrotas permanecem distintas de empate para permitir conferência do total.
    if (fight.result === "derrota") standing.losses += 1;
    // Empates integram o total de lutas e aparecem em sua própria coluna.
    if (fight.result === "empate") standing.draws += 1;
  }
  // Calcula o percentual somente quando existe denominador, preservando null para quem não lutou.
  return [...standings.values()].map((standing) => {
    // O denominador de decisões inclui W.O., em coerência com as vitórias e derrotas exibidas.
    const total = totalDecisoes(standing);
    // Zero decisões continua distinto de zero vitórias.
    return { ...standing, winRate: total ? standing.wins / total : null };
  });
}
// Total de resultados classificáveis é a base comum dos três percentuais.
export function totalDecisoes(standing: AthleteStanding): number {
  // Combates disputados e W.O. são conjuntos distintos.
  return standing.fights + standing.walkoverWins + standing.walkoverLosses;
}
// Uma posição maior no catálogo representa faixa mais alta, sem implicar resultado competitivo.
function gradeLevel(standing: AthleteStanding): number {
  // A graduação pertence ao tipo fechado GradeId e acompanha os cartões da mesma tela.
  return GRADES.findIndex((grade) => grade.id === standing.student.grade);
}
// Ordena uma cópia dos resumos para preservar a lista original nas trocas de critério.
export function rankAthletes(standings: readonly AthleteStanding[], order: RankingOrder): AthleteStanding[] {
  // Cada comparação é determinística e não arredonda o percentual antes de escolher a ordem.
  const eligible = standings.filter((standing) => order === "sem-lutas" ? standing.fights === 0 : order === "menos-lutas" ? standing.fights > 0 : true); // Quem nunca lutou tem seu filtro próprio e não lidera Menos lutas.
  // A cópia filtrada protege os dados de origem durante ordenação e alternância de filtros.
  return eligible.sort((left, right) => {
    // Só o critério de aproveitamento coloca atletas sem lutas depois de todos os que já lutaram.
    const totalLeft = totalDecisoes(left); // Inclui decisões por W.O. do primeiro atleta.
    const totalRight = totalDecisoes(right); // Inclui decisões por W.O. do segundo atleta.
    const missingResult = Number(totalLeft === 0) - Number(totalRight === 0);
    // O produto cruzado compara frações exatas; o arredondamento fica restrito à apresentação.
    const rate = order === "empates" ? right.draws * totalLeft - left.draws * totalRight : order === "derrotas" ? right.losses * totalLeft - left.losses * totalRight : right.wins * totalLeft - left.wins * totalRight; // Compara empates, derrotas ou vitórias por frações exatas, sem arredondamento visual.
    // A hierarquia utiliza o índice da faixa, da preta até a branca.
    const grade = gradeLevel(right) - gradeLevel(left);
    // O critério principal é escolhido explicitamente, sem misturar faixa com aproveitamento.
    const primary = order === "lutas" ? right.fights - left.fights : order === "menos-lutas" ? left.fights - right.fights : order === "sem-lutas" ? left.student.name.localeCompare(right.student.name, "pt-BR") : order === "faixa" ? grade : missingResult || rate; // Ordem crescente considera só quem já concluiu uma luta; sem lutas usa nome.
    // Empates usam vitórias, total de lutas, faixa, nome e identificador para manter ordem estável.
    return primary || right.wins - left.wins || right.fights - left.fights || grade || left.student.name.localeCompare(right.student.name, "pt-BR") || left.student.id.localeCompare(right.student.id);
  });
}
// Gera somente participações fictícias para demonstrar os três critérios do ranking.
export function createDemoFights(): AthleteFight[] {
  // Os totais por resultado permitem conferir visualmente a soma de cada atleta na demonstração.
  const examples = [
    // Ana possui quatro participações e demonstra também o efeito de um empate no percentual.
    { studentId: "demo-ana", wins: 2, losses: 1, draws: 1 },
    // Bruno tem mais participações que Ana, independentemente da faixa.
    { studentId: "demo-bruno", wins: 6, losses: 2, draws: 1 },
    // Carla demonstra quatro vitórias em seis lutas concluídas.
    { studentId: "demo-carla", wins: 4, losses: 1, draws: 1 },
    // Diego demonstra volume maior sem liderar automaticamente o aproveitamento.
    { studentId: "demo-diego", wins: 8, losses: 3, draws: 1 },
    // Elisa lidera o percentual fictício: seis vitórias em sete participações.
    { studentId: "demo-elisa", wins: 6, losses: 1, draws: 0 },
    // O histórico esportivo de um atleta inativo continua disponível na demonstração.
    { studentId: "demo-felipe", wins: 5, losses: 4, draws: 1 },
    // Gabriela lidera o volume fictício com quinze participações na faixa marrom.
    { studentId: "demo-gabriela", wins: 11, losses: 3, draws: 1 },
    // Hugo fica sem resultados registrados; faixa preta não inventa vitórias nem experiência competitiva.
    { studentId: "demo-hugo", wins: 0, losses: 0, draws: 0 },
  ];
  // Converte os totais em eventos únicos para que o mesmo agregador possa ser verificado com resultados individuais.
  return examples.flatMap((example) => {
    // A lista de resultados só contém as três alternativas explicitamente consideradas nesta demonstração.
    const results: FightResult[] = [...Array<FightResult>(example.wins).fill("vitoria"), ...Array<FightResult>(example.losses).fill("derrota"), ...Array<FightResult>(example.draws).fill("empate")];
    // Identificadores determinísticos impedem duplicidade ao recriar a demonstração após navegar.
    return results.map((result, index) => ({ id: `demo-luta-${example.studentId}-${index + 1}`, studentId: example.studentId, result }));
  });
}
