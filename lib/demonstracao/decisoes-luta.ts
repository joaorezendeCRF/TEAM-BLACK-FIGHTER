// Catálogo registra o resultado declarado pelo evento, segundo WAKO, capítulos 2 e 7, artigo 7.
export const REGULAMENTOS = {
  ringue: "Ringue · CBKB/WAKO", // Reúne Full Contact, Low Kick e K1 em competição com vencedor.
  tatame: "Tatame · CBKB/WAKO", // Reúne Point Fighting, Light Contact e Kick Light em competição com vencedor.
  evento: "Regulamento próprio do evento", // Permite decisões excepcionais quando previstas pelo evento.
} as const;
// Guarda o grupo de regras escolhido no agendamento, sem inferi-lo a partir do local.
export type RegulamentoLuta = keyof typeof REGULAMENTOS;
// Sem decisão encerra o registro sem atribuir vitória, derrota ou empate.
export type RecordedResult = "vitoria" | "empate" | "derrota" | "sem-decisao";
// Cada código identifica o método publicado, sem recalcular pontos, rounds ou knockdowns.
export const METODOS = {
  pontos: "Por pontos (P)", // Inclui a decisão dos juízes e o placar oficial da modalidade.
  abandono: "Abandono (AB)", // Desistência durante o combate ou entre rounds.
  rsc: "Interrupção pelo árbitro (RSC)", // Abrange decisão de segurança registrada pela arbitragem.
  "rsc-h": "Interrupção por golpes na cabeça (RSC-H)", // Código específico de interrupção no ringue.
  ko: "Nocaute (KO)", // Método de ringue quando declarado no resultado.
  tko: "Nocaute técnico (TKO)", // Método de ringue quando declarado no resultado.
  dq: "Desclassificação (DISQ)", // A vitória é atribuída ao oponente quando a decisão assim determina.
  wo: "W.O.", // Ausência com decisão declarada antes de disputar o combate.
  empate: "Empate", // Reservado ao regulamento próprio que admite este resultado.
  "empate-tecnico": "Empate técnico", // Reservado ao regulamento próprio que admite esta decisão.
  "sem-decisao": "Sem decisão", // Encerramento oficial sem resultado para o ranking.
} as const;
// A união impede tratar rótulos livres como um código de arbitragem.
export type MetodoLuta = keyof typeof METODOS;
// Dados de conclusão são separados do agendamento e do motivo de cancelamento.
export type DecisaoLuta = {
  metodo: MetodoLuta; // Método tal como divulgado pela organização.
  referencia?: string; // Referência curta à decisão, sem dados médicos ou pessoais.
};
// Rótulos compartilhados mantêm o diálogo e o histórico consistentes.
export const RESULTADOS = {
  vitoria: "Vitória",
  derrota: "Derrota",
  empate: "Empate",
  "sem-decisao": "Sem decisão",
} as const;
// Oferece métodos compatíveis com o tipo de encerramento escolhido.
export function metodosPermitidos(regulamento: RegulamentoLuta, resultado: RecordedResult): MetodoLuta[] {
  // Competições CBKB/WAKO aplicam o desempate da modalidade antes de registrar o vencedor.
  if (resultado === "empate") return regulamento === "evento" ? ["empate", "empate-tecnico"] : [];
  // Sem decisão requer uma declaração do evento e fica fora da classificação.
  if (resultado === "sem-decisao") return ["sem-decisao"];
  // Mantém W.O. disponível para vitória e derrota, com confirmação explícita.
  const comuns: MetodoLuta[] = ["pontos", "abandono", "rsc", "dq", "wo"];
  // No tatame, um golpe ilegal não vira automaticamente nocaute válido.
  return regulamento === "tatame" ? comuns : [...comuns, "rsc-h", "ko", "tko"];
}
// Resultados excepcionais precisam de registro explícito da decisão do evento.
export function exigeReferencia(metodo: MetodoLuta | "") {
  // A referência distingue ausência confirmada de cancelamento e empate autorizado de placar provisório.
  return metodo === "wo" || metodo === "empate" || metodo === "empate-tecnico" || metodo === "sem-decisao";
}
