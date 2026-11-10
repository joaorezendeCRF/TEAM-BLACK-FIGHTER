// Diagnóstico local solicitado: grava somente um evento identificado como teste no banco atual.
import { createRequire } from "node:module";
// Resolve as dependências do projeto sem copiar configurações para a saída.
const require = createRequire(new URL("../package.json", import.meta.url));
// A conexão e os caminhos privados são lidos somente em memória.
require("@next/env").loadEnvConfig(process.cwd());
// Este diagnóstico só é permitido no ambiente de testes explicitamente ativado.
if (process.env.TBF_CADASTROS_TESTE !== "1") throw new Error("Ative o modo de testes antes deste diagnóstico.");
// Importa o mesmo registrador que as ações e rotas protegidas utilizam.
const { registrarFalha } = await import("../lib/logs.ts");
// Reutiliza a mesma conexão para conferir o evento que acabou de ser gravado.
const { default: pool } = await import("../lib/mysql.ts");
// O código de referência identifica o teste sem nomes, senhas, formulários ou documentos.
try {
  // Não provoca falha de cadastro ou indisponibilidade; gera um evento de teste explícito.
  const referencia = await registrarFalha("teste_diagnostico", { code: "TESTE_CONTROLADO", message: "MARCADOR_FICTICIO_NAO_DEVE_SER_ARMAZENADO", sql: "MARCADOR_SQL_NAO_DEVE_SER_ARMAZENADO" });
  // A seleção usa somente a referência gerada, nunca parâmetros pessoais.
  const [linhas] = await pool.execute("SELECT nivel, origem, codigo FROM tbf_logs_tecnicos WHERE referencia = ? LIMIT 1", [referencia]);
  // Comprova que o evento foi persistido, com categoria de teste e sem gravar os marcadores do objeto erro.
  if (linhas.length !== 1 || linhas[0].origem !== "teste_diagnostico" || linhas[0].codigo !== "TESTE_CONTROLADO" || linhas[0].nivel !== "aviso") throw new Error("O diagnóstico não foi confirmado no banco.");
  // O resultado público informa apenas o sucesso e a referência técnica segura.
  console.log("Registro e leitura de log no banco atual confirmados. Evento de teste: " + referencia);
} catch {
  // Nenhuma exceção bruta do driver ou da configuração é impressa.
  console.log("Não foi possível confirmar o teste de logs. Confira a tabela e as permissões.");
  // Uma falha não deve ser confundida com diagnóstico concluído.
  process.exitCode = 1;
} finally {
  // Este script não deixa conexões abertas depois do teste.
  await pool.end();
}
