// Confere que diagnóstico nunca retorna o texto original ou dados anexados à exceção.
import test from "node:test";
// Asserções usam somente marcadores sintéticos.
import assert from "node:assert/strict";
// O pool pode ser montado, porém este teste não abre conexão nem grava logs.
process.env.DATABASE_URL ??= "mysql://ficticio:ficticio@127.0.0.1:1/banco_ficticio";
// Cada código conhecido é conservado, enquanto qualquer conteúdo arbitrário vira categoria genérica.
test("logs selecionam somente códigos permitidos e descartam mensagem, SQL, stack e payload", async () => {
  // Importação ocorre depois de definir a conexão fictícia que não será utilizada.
  const { classificarFalha } = await import("../lib/logs");
  // Exceção simula todos os lugares em que um driver poderia carregar dados pessoais.
  const erro = { code: "ER_DUP_ENTRY", message: "CONTEUDO_FICTICIO_PRIVADO", sql: "SQL_FICTICIO_PRIVADO", stack: "STACK_FICTICIA", payload: { documento: "DOCUMENTO_FICTICIO" } };
  // Somente o código permitido pode entrar no registro técnico.
  assert.equal(classificarFalha(erro), "ER_DUP_ENTRY");
  // Código inesperado também não é conservado parcialmente.
  assert.equal(classificarFalha({ ...erro, code: "SEGREDO_FICTICIO_EM_CODIGO" }), "FALHA_NAO_CLASSIFICADA");
  // Valores de tipos inesperados não são serializados como texto livre.
  for (const entrada of [null, "TEXTO_FICTICIO", { code: ["DADO_FICTICIO"] }, new Error("MENSAGEM_FICTICIA")]) assert.equal(classificarFalha(entrada), "FALHA_NAO_CLASSIFICADA");
});
