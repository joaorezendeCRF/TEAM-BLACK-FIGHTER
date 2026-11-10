// Máscaras mudam somente a apresentação; normalização retira pontuação antes da futura gravação.
export type MaskKind = "cpf" | "phone";
// O limite impede que colagens maiores gerem CPFs ou telefones com dígitos excedentes na tela.
export function maskDigits(value: string): string {
  return value.replace(/\D/g, "").slice(0, 11); // Preserva zeros iniciais e limita ambos os formatos brasileiros a onze dígitos.
}
// Formata progressivamente CPF e telefone nacional com DDD, sem transformar texto em número.
export function formatMasked(value: string, kind: MaskKind): string {
  const digits = maskDigits(value); // A origem pode conter pontuação de outra aplicação ou espaços de uma colagem.
  if (!digits) return ""; // Campo apagado permanece vazio, sem pontuação isolada obrigatória.
  if (kind === "cpf") {
    return digits.slice(0, 3) + (digits.length > 3 ? "." + digits.slice(3, 6) : "") + (digits.length > 6 ? "." + digits.slice(6, 9) : "") + (digits.length > 9 ? "-" + digits.slice(9) : ""); // Pontuação entra apenas quando há dígitos no próximo grupo.
  }
  const local = digits.slice(2); // Os dois primeiros dígitos são o DDD.
  const prefixLength = digits.length > 10 ? 5 : 4; // Fixo tem oito dígitos locais; celular tem nove.
  return "(" + digits.slice(0, 2) + (digits.length >= 2 ? ")" : "") + (local ? " " + local.slice(0, prefixLength) : "") + (local.length > prefixLength ? "-" + local.slice(prefixLength) : ""); // Aceita os dois tamanhos sem exigir código de país.
}
// Localiza o cursor pelo número de dígitos anteriores, preservando edição no meio do campo.
export function caretAfterDigits(formatted: string, count: number): number {
  if (count <= 0) return 0; // Início da seleção não deve saltar para o fim do campo.
  let seen = 0; // Conta apenas dígitos; pontos, parênteses e hífen não representam conteúdo digitado.
  for (let index = 0; index < formatted.length; index += 1) {
    if (/\d/.test(formatted[index])) seen += 1; // A posição visual acompanha o conteúdo numérico.
    if (seen === count) {
      let caret = index + 1; // Cursor começa logo após o dígito recém-inserido.
      while (caret < formatted.length && /\D/.test(formatted[caret])) caret += 1; // Pula separadores gerados pela própria máscara.
      return caret; // Permite continuar digitando sem substituir o próximo dígito.
    }
  }
  return formatted.length; // Colagens truncadas deixam o cursor no último dígito aceito.
}
// Colar substitui somente a seleção atual e conserva os dígitos que estavam fora dela.
export function pasteMasked(value: string, kind: MaskKind, start: number, end: number, pasted: string) {
  const before = value.slice(0, start).replace(/\D/g, ""); // Conteúdo à esquerda permanece íntegro.
  const after = value.slice(end).replace(/\D/g, ""); // Conteúdo à direita não é descartado por uma colagem curta.
  const inserted = pasted.replace(/\D/g, ""); // Letras e pontuação não viram dados numéricos.
  const formatted = formatMasked(before + inserted + after, kind); // A regra comum aplica o limite de onze dígitos.
  return { value: formatted, caret: caretAfterDigits(formatted, Math.min(before.length + inserted.length, 11)) }; // Cursor acompanha a região colada, respeitando o limite.
}
