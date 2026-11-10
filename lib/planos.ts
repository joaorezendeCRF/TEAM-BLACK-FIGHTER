// Catálogo único aprovado pelo proprietário; interface e servidor usam os mesmos valores em centavos.
export const PLANOS = [
  // IDs antigos continuam válidos para preservar cadastros e exemplos normais existentes.
  { id: "2", aulas: 2, modalidade: "normal", nome: "2x por semana normal", centavos: 7000 },
  // Três aulas normais conservam o preço anterior.
  { id: "3", aulas: 3, modalidade: "normal", nome: "3x por semana normal", centavos: 8000 },
  // Cinco aulas normais conservam o preço anterior.
  { id: "5", aulas: 5, modalidade: "normal", nome: "5x por semana normal", centavos: 12000 },
  // Personal possui identidade própria, sem ser inferido apenas pelo preço.
  { id: "personal-2", aulas: 2, modalidade: "personal", nome: "2x por semana personal", centavos: 24000 },
  // Valor mensal informado pelo proprietário para três aulas de personal.
  { id: "personal-3", aulas: 3, modalidade: "personal", nome: "3x por semana personal", centavos: 36000 },
  // Valor mensal informado pelo proprietário para cinco aulas de personal.
  { id: "personal-5", aulas: 5, modalidade: "personal", nome: "5x por semana personal", centavos: 60000 },
] as const;
// União impede inventar preços ou frequências em consumidores tipados.
export type Plano = (typeof PLANOS)[number];
// Validação em tempo de execução também recusa valores adulterados recebidos pela rede.
export function obterPlano(id: string): Plano {
  // Busca somente o identificador público, nunca um valor monetário enviado pelo formulário.
  const plano = PLANOS.find((item) => item.id === id);
  // Valor desconhecido interrompe a operação antes de qualquer alteração no banco.
  if (!plano) throw new Error("Selecione um plano válido.");
  // O servidor sempre obtém o preço do catálogo controlado.
  return plano;
}
// Reconstrói a escolha do formulário a partir das duas colunas independentes do banco.
export function idPlano(aulas: number, modalidade: string): string {
  // Frequência inválida não deve virar silenciosamente um plano de duas aulas.
  const plano = PLANOS.find((item) => item.aulas === aulas && item.modalidade === modalidade);
  // Dados inconsistentes exigem correção explícita antes de editar.
  if (!plano) throw new Error("Plano cadastrado indisponível.");
  // Normais preservam seus IDs históricos; personal recebe prefixo próprio.
  return plano.id;
}
