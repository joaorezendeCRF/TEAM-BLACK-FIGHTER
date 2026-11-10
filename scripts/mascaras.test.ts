// Exercita edição progressiva, colagem e cursor sem abrir navegador ou usar identificação real.
import test from "node:test";
// Asserções conferem apresentação e limite numérico separadamente da validação de identidade.
import assert from "node:assert/strict";
// Funções são as mesmas utilizadas pelo componente reutilizável do formulário.
import { formatMasked, maskDigits, pasteMasked, caretAfterDigits } from "../lib/mascaras";
// Zeros são deliberadamente inválidos como CPF e telefone real; servem somente para verificar a máscara.
test("CPF preserva zeros, formata progressivamente e limita colagens maiores", () => {
  assert.equal(formatMasked("", "cpf"), ""); // Apagar tudo não deixa separadores soltos.
  assert.equal(formatMasked("0".repeat(4), "cpf"), "000.0"); // Pontos acompanham o preenchimento parcial.
  assert.equal(formatMasked("0".repeat(30), "cpf"), "000.000.000-00"); // Excesso não vira documento com mais dígitos.
  assert.equal(formatMasked("letras 000.000.000-00", "cpf"), "000.000.000-00"); // Pontuação externa não é duplicada.
});
test("telefone aceita fixo e celular com DDD e respeita limite", () => {
  assert.equal(formatMasked("0".repeat(10), "phone"), "(00) 0000-0000"); // Dez dígitos correspondem ao formato fixo.
  assert.equal(formatMasked("0".repeat(11), "phone"), "(00) 00000-0000"); // Onze dígitos correspondem ao formato celular.
  assert.equal(maskDigits(formatMasked("0".repeat(25), "phone")).length, 11); // Colagem nunca excede o tamanho máximo.
  assert.equal(formatMasked("0", "phone"), "(0"); // Permite o primeiro dígito e remoção progressiva.
});
test("colagem substitui seleção, preserva zeros e posiciona cursor no trecho editado", () => {
  const value = formatMasked("0".repeat(11), "cpf"); // Documento sintético inválido, sem vínculo com pessoa.
  const edited = pasteMasked(value, "cpf", 4, 7, "abc 111"); // Substitui somente o grupo central.
  assert.equal(edited.value, "000.111.000-00"); // Mantém grupos fora da seleção.
  assert.equal(edited.caret, 8); // Cursor atravessa o ponto automático após o grupo central.
  assert.equal(caretAfterDigits(value, 0), 0); // Início do campo não salta para o fim.
  assert.equal(pasteMasked(value, "cpf", 0, value.length, "").value, ""); // Selecionar tudo e apagar deixa vazio.
});
