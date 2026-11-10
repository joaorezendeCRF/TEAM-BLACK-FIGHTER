// Exercita HTTP real com banco inteiramente fictício e diretório privado temporário.
import assert from "node:assert/strict";
// O servidor filho usa porta e configuração próprias, sem interromper o ambiente do dono.
import { spawn } from "node:child_process";
// Sessão e arquivos recebem identificadores descartáveis em memória.
import { randomBytes } from "node:crypto";
// Limpeza fica limitada aos diretórios temporários criados por este executor.
import { mkdtemp, readdir, rm } from "node:fs/promises";
// Caminhos do projeto e diretórios de teste são resolvidos explicitamente.
import path from "node:path";
// O sistema operacional fornece uma localização temporária fora do projeto.
import { tmpdir } from "node:os";
// Importações do servidor fictício recebem URLs de arquivo válidas no Windows.
import { fileURLToPath, pathToFileURL } from "node:url";
// Exercita a mesma verificação de senha que o login da aplicação.
import argon2 from "argon2";
// Este script deve estar dentro de scripts/ do projeto selecionado.
const projeto = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// A porta diferente evita tocar no localhost:3000 usado pelo usuário.
const endereco = "http://127.0.0.1:3013";
// O prefixo permite conferir a propriedade da pasta antes de sua limpeza.
const temporario = await mkdtemp(path.join(tmpdir(), "tbf-qa-anexos-"));
// Cada cópia usa sua própria pasta privada dentro da raiz descartável.
const principal = path.join(temporario, "principal"), copia = path.join(temporario, "copia");
// Todas as credenciais abaixo pertencem apenas ao simulador local.
const senha = "Integracao123", hash = await argon2.hash(senha, { type: argon2.argon2id });
// O gancho recusa qualquer configuração que não seja a conexão fictícia na porta impossível.
const servidor = spawn(process.execPath, ["--import", pathToFileURL(path.join(projeto, "scripts/apoio-integracao.mjs")).href, path.join(projeto, "node_modules/next/dist/bin/next"), "start", "--hostname", "127.0.0.1", "--port", "3013"], { cwd: projeto, windowsHide: true, stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, NODE_ENV: "production", DATABASE_URL: "mysql://ficticio:ficticio@127.0.0.1:1/banco_ficticio", SESSION_SECRET: randomBytes(48).toString("hex"), TBF_INTEGRACAO_FICTICIA: "1", TBF_HASH_FICTICIO: hash, TBF_CADASTROS_TESTE: "1", TBF_DOCUMENTOS_DIR: principal, TBF_DOCUMENTOS_COPIA_DIR: copia, TBF_LOGS_DIR: path.join(temporario, "logs") } });
// Interromper este executor também encerra somente o servidor que ele criou.
process.once("SIGINT", () => servidor.kill());
// O mesmo cuidado vale para encerramento externo do processo.
process.once("SIGTERM", () => servidor.kill());
// Saída é mantida somente em memória e nunca inclui cookies em relatórios.
let saida = "";
// Guarda mensagens para diagnosticar falha de inicialização sem escrever segredos em arquivo.
servidor.stdout.on("data", (trecho) => { saida += trecho; });
// As mesmas regras são usadas para erros do processo fictício.
servidor.stderr.on("data", (trecho) => { saida += trecho; });
// Identificador fixo pertence exclusivamente à fixture pública do simulador.
const matricula = "20000000-0000-4000-8000-000000000001";
// Uma imagem de um pixel é sintética; não contém nomes, documentos ou dados de aluno.
const imagem = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aLe0AAAAASUVORK5CYII=", "base64");
// Conta verificações concluídas sem imprimir corpos, tokens ou credenciais.
let verificacoes = 0;
// Monta apenas os campos aceitos pelo upload real do sistema.
function formulario(bytes = imagem) {
  // Multipart é criado pelo mesmo padrão utilizado pelo navegador.
  const dados = new FormData();
  // Vínculo, tipo e confirmação são dados públicos de fixture.
  dados.set("matricula", matricula); dados.set("tipo", "termo_assinado"); dados.set("confirmaTeste", "sim");
  // O nome é deliberadamente fictício e não é armazenado pelo serviço.
  dados.set("arquivo", new Blob([bytes], { type: "image/png" }), "imagem-ficticia.png");
  // Uma instância nova evita reutilizar corpos já consumidos.
  return dados;
}
// Toda falha deve encerrar o processo próprio e limpar apenas os arquivos sintéticos.
try {
  // A inicialização é aguardada em pequenos intervalos, com limite definido.
  for (let tentativa = 0; tentativa < 60 && !saida.includes("Ready in"); tentativa += 1) {
    // Um processo encerrado não é substituído por outro serviço na mesma porta.
    if (servidor.exitCode !== null) throw new Error("Servidor fictício não iniciou.");
    // O intervalo serve somente para a inicialização do processo do teste.
    await new Promise((resolver) => setTimeout(resolver, 200));
  }
  // Não testa uma aplicação que não tenha confirmado a própria inicialização.
  assert.match(saida, /Ready in/);
  // Nenhum metadado pode ser consultado anonimamente.
  assert.equal((await fetch(endereco + "/api/alunos/documentos?matricula=" + matricula)).status, 401); verificacoes += 1;
  // Uma URL conhecida também não permite abrir arquivo sem sessão.
  assert.equal((await fetch(endereco + "/api/alunos/documentos/10000000-0000-4000-8000-000000000002")).status, 401); verificacoes += 1;
  // A origem inválida é recusada antes de ler qualquer arquivo.
  assert.equal((await fetch(endereco + "/api/alunos/documentos", { method: "POST", headers: { Origin: "origem-malformada" }, body: formulario() })).status, 403); verificacoes += 1;
  // Login fictício usa a API real, não injeta sessão diretamente no navegador.
  const login = await fetch(endereco + "/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ usuario: "professor-demo", senha }) });
  // O cookie permanece apenas na memória deste executor.
  const cookie = login.headers.get("set-cookie")?.split(";")[0];
  // Professores ativos devem poder trabalhar com todos os anexos de teste.
  assert.equal(login.status, 200); assert.ok(cookie); verificacoes += 1;
  // Um conteúdo HTML disfarçado de imagem precisa ser recusado pelo conteúdo.
  assert.equal((await fetch(endereco + "/api/alunos/documentos", { method: "POST", headers: { Cookie: cookie, Origin: endereco }, body: formulario(Buffer.from("<html>arquivo ficticio invalido</html>")) })).status, 400); verificacoes += 1;
  // Um corpo acima do limite é recusado sem disponibilizar arquivo parcial.
  assert.equal((await fetch(endereco + "/api/alunos/documentos", { method: "POST", headers: { Cookie: cookie, Origin: endereco }, body: formulario(Buffer.alloc(6 * 1024 * 1024)) })).status, 413); verificacoes += 1;
  // Dois envios do mesmo tipo devem gerar duas versões preservadas.
  for (let versao = 1; versao <= 2; versao += 1) {
    // O servidor grava bytes em pastas temporárias e metadados exclusivamente no simulador.
    const envio = await fetch(endereco + "/api/alunos/documentos", { method: "POST", headers: { Cookie: cookie, Origin: endereco }, body: formulario() });
    // Só anuncia sucesso depois de conferir as duas cópias.
    assert.equal(envio.status, 201); verificacoes += 1;
  }
  // O mesmo professor consulta o histórico de versões sem receber chaves privadas.
  const lista = await fetch(endereco + "/api/alunos/documentos?matricula=" + matricula, { headers: { Cookie: cookie } });
  // O navegador não pode reutilizar metadados fora da sessão.
  assert.match(lista.headers.get("cache-control"), /no-store/);
  // O retorno inclui ambas as versões, da mais nova para a antiga.
  const { documentos } = await lista.json();
  // Um novo envio não substitui a versão anterior.
  assert.deepEqual(documentos.map((d) => d.versao), [2, 1]); verificacoes += 1;
  // As duas versões devem abrir com exatamente os mesmos bytes sintéticos originais.
  for (const documento of documentos) {
    // Abertura passa pela verificação real de sessão, hash, tamanho e auditoria.
    const abertura = await fetch(endereco + "/api/alunos/documentos/" + documento.id, { headers: { Cookie: cookie } });
    // Content-Type controlado e nosniff impedem interpretação como HTML da aplicação.
    assert.equal(abertura.status, 200); assert.equal(abertura.headers.get("content-type"), "image/png"); assert.equal(abertura.headers.get("x-content-type-options"), "nosniff");
    // Nenhum conteúdo é convertido ou truncado no percurso.
    assert.deepEqual(Buffer.from(await abertura.arrayBuffer()), imagem); verificacoes += 1;
  }
  // Simula perda somente dos objetos do teste, para exercitar recuperação pela segunda cópia.
  for (const chave of await readdir(principal)) {
    // Não permite apagar nomes inesperados ou diretórios fora da raiz temporária.
    assert.match(chave, /^[a-f0-9-]{36}\.bin$/);
    // Remove exclusivamente os arquivos fictícios criados por este executor.
    await rm(path.join(principal, chave));
  }
  // A abertura continua íntegra quando a origem principal está indisponível.
  const recuperado = await fetch(endereco + "/api/alunos/documentos/" + documentos[0].id, { headers: { Cookie: cookie } });
  // Recuperação precisa entregar conteúdo integral, não somente HTTP 200.
  assert.equal(recuperado.status, 200); assert.deepEqual(Buffer.from(await recuperado.arrayBuffer()), imagem); verificacoes += 1;
  // Professores não devem receber logs técnicos, nem acessando o endereço diretamente.
  const logs = await fetch(endereco + "/dashboard/logs", { headers: { Cookie: cookie }, redirect: "manual" });
  // O redirecionamento pode ser emitido no streaming do Next.js.
  assert.ok(logs.status === 307 || (await logs.text()).includes("NEXT_REDIRECT")); verificacoes += 1;
  // Relatório contém apenas quantidade e natureza dos testes.
  console.log(verificacoes + " verificações HTTP de anexos passaram; banco e contas inteiramente fictícios.");
  // A opção permite conferir o formulário e o painel no navegador usando o mesmo servidor isolado.
  if (process.argv.includes("--manter")) {
    // Credenciais são públicas porque só existem nas fixtures descartáveis.
    console.log("Revisão visual: " + endereco + " | principal-demo / Integracao123");
    // O encerramento pelo executor finaliza o processo filho antes da limpeza.
    await new Promise((resolver) => servidor.once("exit", resolver));
  }
} finally {
  // Nunca encerra o servidor localhost:3000 ou outro processo do usuário.
  servidor.kill();
  // Confere a raiz absoluta antes de qualquer limpeza recursiva.
  const absoluto = path.resolve(temporario);
  // Um diretório que não tenha o prefixo exclusivo do executor não é removido.
  if (!absoluto.startsWith(path.resolve(tmpdir()) + path.sep) || !path.basename(absoluto).startsWith("tbf-qa-anexos-")) throw new Error("Raiz de limpeza inválida.");
  // Apaga apenas os arquivos sintéticos deste teste, sem acesso às pastas de produção.
  await rm(absoluto, { recursive: true, force: true });
}
