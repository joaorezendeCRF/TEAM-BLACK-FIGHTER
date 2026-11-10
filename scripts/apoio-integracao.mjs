// O simulador é um arquivo de fixtures sem dependência de banco real.
import { readFileSync } from "node:fs";
// Este módulo só é carregado explicitamente pelo executor de integração, nunca pelo site normal.
import { registerHooks } from "node:module";
// Impede ativar o simulador sem a marca e a configuração de banco isolado fornecidas pelo teste.
if (process.env.TBF_INTEGRACAO_FICTICIA !== "1" || process.env.DATABASE_URL !== "mysql://ficticio:ficticio@127.0.0.1:1/banco_ficticio") throw new Error("O simulador exige ambiente isolado.");
// Todas as contas deste processo de teste são fictícias e existem apenas em memória.
const codigo = readFileSync(new URL("./simulador-integracao.mjs", import.meta.url), "utf8");
// O gancho intercepta apenas a dependência de banco deste processo filho de teste.
registerHooks({
  // As demais bibliotecas continuam sendo carregadas normalmente pelo Node.js.
  resolve(especificador, contexto, proximo) {
    // O identificador fictício nunca corresponde a um arquivo de produção.
    return /^mysql2(?:-[a-f0-9]+)?\/promise$/.test(especificador) ? { url: "tbf-teste:mysql-ficticio", shortCircuit: true } : proximo(especificador, contexto);
  },
  // O código retornado contém somente fixtures e rejeita gravações.
  load(url, contexto, proximo) {
    // A substituição existe exclusivamente dentro do processo com isolamento validado acima.
    return url === "tbf-teste:mysql-ficticio" ? { format: "module", source: codigo, shortCircuit: true } : proximo(url, contexto);
  },
});
