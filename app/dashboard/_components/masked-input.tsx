"use client"; // O cursor e a colagem são tratados no próprio campo, sem serviço externo.
// A referência permite restaurar o cursor depois da formatação controlada pelo React.
import { useLayoutEffect, useRef, type ComponentPropsWithoutRef } from "react";
// O mesmo formatador é testado fora do navegador e usado em todos os campos correspondentes.
import { caretAfterDigits, formatMasked, maskDigits, pasteMasked, type MaskKind } from "@/lib/mascaras";
// Propriedades comuns continuam disponíveis, sem permitir dois controladores concorrentes de valor.
type Props = Omit<ComponentPropsWithoutRef<"input">, "value" | "onChange" | "type" | "onPaste" | "onKeyDown"> & {
  kind: MaskKind; // CPF ou telefone com DDD determina a apresentação e o limite numérico.
  value: string; // A tela controla somente o valor formatado durante esta prévia.
  onValueChange: (value: string) => void; // A normalização definitiva será repetida na futura camada de servidor.
};
// Campo reutilizável evita máscaras diferentes em aluno, emergência e responsável.
export default function MaskedInput({ kind, value, onValueChange, ...props }: Props) {
  const input = useRef<HTMLInputElement>(null); // Não consulta outros campos ou dados pessoais.
  const desiredCaret = useRef<number | null>(null); // Guarda apenas uma posição visual, nunca o conteúdo do documento.
  // Reaplica o cursor após o React escrever a pontuação no campo ativo.
  useLayoutEffect(() => {
    if (desiredCaret.current !== null && input.current === document.activeElement) input.current?.setSelectionRange(desiredCaret.current, desiredCaret.current); // Evita saltos para o fim ao editar no meio.
    desiredCaret.current = null; // Uma mudança externa não reutiliza uma seleção anterior.
  });
  // Centraliza a alteração visual para digitação, colagem e exclusão de separadores.
  function commit(next: string, caret: number) {
    desiredCaret.current = caret; // Posição será restaurada depois da atualização do componente pai.
    onValueChange(next); // Nenhum dado é salvo ou transmitido por este controle.
  }
  return <input {...props} ref={input} type={kind === "phone" ? "tel" : "text"} inputMode="numeric" value={formatMasked(value, kind)} placeholder={kind === "cpf" ? "000.000.000-00" : "(00) 00000-0000"}
    // Pontuação já colada é tolerada; a contagem de dígitos preserva a posição do cursor.
    onChange={(event) => {
      const raw = event.target.value; // Valor transitório existe apenas durante este evento do campo.
      const count = raw.slice(0, event.target.selectionStart ?? raw.length).replace(/\D/g, "").length; // Conta dígitos antes da seleção, incluindo edições intermediárias.
      const next = formatMasked(raw, kind); // Limita e formata sem depender de biblioteca adicional.
      commit(next, caretAfterDigits(next, Math.min(count, 11))); // Máscara não impede apagar e substituir dígitos.
    }}
    // Colagem é normalizada antes do limite, inclusive quando o texto traz letras ou pontuação extra.
    onPaste={(event) => {
      event.preventDefault(); // Impede que o navegador trunque texto antes de retirar caracteres não numéricos.
      const result = pasteMasked(value, kind, event.currentTarget.selectionStart ?? 0, event.currentTarget.selectionEnd ?? value.length, event.clipboardData.getData("text")); // Substitui somente a região selecionada.
      commit(result.value, result.caret); // Não acessa outros itens da área de transferência.
    }}
    // Backspace e Delete atravessam separadores em vez de simplesmente recolocar o mesmo ponto ou hífen.
    onKeyDown={(event) => {
      const start = event.currentTarget.selectionStart ?? 0; // Seleção é lida apenas do campo ativo.
      const end = event.currentTarget.selectionEnd ?? start; // Seleção de vários caracteres mantém o comportamento nativo.
      if (start !== end || !["Backspace", "Delete"].includes(event.key)) return; // Não interfere em setas, atalhos ou texto selecionado.
      const backwards = event.key === "Backspace"; // Define qual dígito corresponde à intenção de exclusão.
      const adjacent = value[backwards ? start - 1 : start]; // Só intercepta uma pontuação adjacente ao cursor.
      if (!adjacent || /\d/.test(adjacent)) return; // Exclusão direta de dígito continua sendo tratada por onChange.
      event.preventDefault(); // Evita que o separador seja removido e imediatamente reapareça sem apagar conteúdo.
      const count = value.slice(0, start).replace(/\D/g, "").length; // Número de dígitos anteriores à posição visual.
      const index = backwards ? count - 1 : count; // Escolhe o dígito anterior ou seguinte ao separador.
      if (index < 0) return; // Backspace no primeiro parêntese não apaga um número do fim.
      const digits = maskDigits(value); // Trabalha em texto para preservar zeros iniciais.
      const next = formatMasked(digits.slice(0, index) + digits.slice(index + 1), kind); // Remove somente um dígito.
      commit(next, caretAfterDigits(next, index)); // Mantém o cursor próximo ao ponto da edição.
    }} />; // Acessibilidade e obrigatoriedade são herdadas do rótulo e das propriedades do formulário.
}
