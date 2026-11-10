// Verifica as rotas reais da versão compilada com contas e banco inteiramente fictícios.
import assert from "node:assert/strict";
// O processo filho tem porta, segredo de sessão e conexão isolados da instalação normal.
import { spawn } from "node:child_process";
// Gera um segredo de teste descartável sem escrever credenciais em arquivos.
import { randomBytes } from "node:crypto";
// Caminhos são resolvidos a partir deste script para impedir executar em outro projeto por engano.
import { fileURLToPath, pathToFileURL } from "node:url";
// Permite montar os caminhos do Next.js e do apoio de testes sem comandos de shell.
import path from "node:path";
// O login de teste passa pela mesma verificação Argon2id usada no sistema normal.
import argon2 from "argon2";
// O diretório do projeto contém a versão que acabou de passar pela construção de produção.
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// A porta alternativa evita interromper os servidores que o usuário já utiliza.
const endereco = "http://127.0.0.1:3012";
// Os quatro módulos e a entrada original precisam recusar acesso sem sessão.
const rotas = ["/dashboard", "/dashboard/alunos", "/dashboard/graduacoes", "/dashboard/pagamentos", "/dashboard/relatorios", "/dashboard/lutas", "/dashboard/usuarios"];
// A senha é pública porque pertence apenas às contas fictícias do processo isolado.
const senha = "Integracao123";
// Argon2id é exercitado no próprio login; nenhum hash existente é lido ou alterado.
const hash = await argon2.hash(senha, { type: argon2.argon2id });
// O processo recebe explicitamente todos os valores de isolamento para não herdar a conexão real.
const servidor = spawn(process.execPath, ["--import", pathToFileURL(path.join(raiz, "scripts/apoio-integracao.mjs")).href, path.join(raiz, "node_modules/next/dist/bin/next"), "start", "--hostname", "127.0.0.1", "--port", "3012"], {
  // O projeto selecionado fornece apenas código e a versão compilada, não dados de teste no banco.
  cwd: raiz,
  // O modo produção reproduz renderização, cookies e navegação da versão construída.
  env: { ...process.env, NODE_ENV: "production", DATABASE_URL: "mysql://ficticio:ficticio@127.0.0.1:1/banco_ficticio", SESSION_SECRET: randomBytes(48).toString("hex"), TBF_INTEGRACAO_FICTICIA: "1", TBF_CADASTROS_TESTE: "0", TBF_HASH_FICTICIO: hash },
  // O processo de teste permanece oculto, conforme o comportamento esperado no Windows.
  windowsHide: true,
  // Mantém a saída somente em memória para relatar erros sem salvar tokens ou senhas reais.
  stdio: ["ignore", "pipe", "pipe"],
});
// Encerrar o executor pelo teclado também encerra o servidor fictício que ele criou.
process.once("SIGINT", () => servidor.kill());
// O encerramento externo recebe a mesma limpeza sem afetar outros processos Next.js.
process.once("SIGTERM", () => servidor.kill());
// Guarda apenas mensagens do servidor fictício, sem conectar a serviços externos.
let saida = "";
// Facilita diagnosticar falha de inicialização sem imprimir conteúdo de páginas ou cookies.
servidor.stdout.on("data", (trecho) => { saida += trecho; });
// Erros de renderização também precisam falhar a verificação de integração.
servidor.stderr.on("data", (trecho) => { saida += trecho; });
// O contador representa verificações HTTP concluídas, separado dos testes de domínio.
let verificacoes = 0;
// A leitura inclui o corpo porque o Next.js pode emitir redirecionamento durante streaming.
async function ler(rota, cookie) {
  // O teste fornece cookies explicitamente; o Node não utiliza a sessão do navegador do usuário.
  const resposta = await fetch(endereco + rota, { redirect: "manual", headers: cookie ? { Cookie: cookie } : {} });
  // Aguarda o fim do streaming para detectar exposição indevida de exemplos protegidos.
  return { resposta, html: await resposta.text() };
}
// Uma falha sempre encerra o processo criado por este executor.
try {
  // Aguarda a porta do processo próprio por um período limitado, sem bloquear a interface por minutos.
  for (let tentativa = 0; tentativa < 60; tentativa += 1) {
    // Um processo encerrado não pode ser substituído silenciosamente por outro servidor na mesma porta.
    if (servidor.exitCode !== null) throw new Error("Servidor de teste não iniciou: " + saida.slice(-2000));
    // A confirmação de disponibilidade vem do próprio Next.js iniciado pelo teste.
    if (saida.includes("Ready in")) break;
    // O intervalo curto só serve para aguardar inicialização, sem repetir testes já concluídos.
    await new Promise((resolver) => setTimeout(resolver, 250));
  }
  // Impede testar um serviço de outra origem caso a inicialização não tenha sido confirmada.
  assert.match(saida, /Ready in/);
  // Todas as rotas protegidas devem recusar visitantes sem sessão.
  for (const rota of rotas) {
    // O acesso anônimo não envia nenhum cookie de pessoas reais.
    const { resposta, html } = await ler(rota);
    // O servidor deve redirecionar por HTTP ou pelo mecanismo de streaming do Next.js.
    assert.ok(resposta.status === 307 || resposta.headers.has("location") || html.includes("NEXT_REDIRECT"), "Rota anônima sem redirecionamento: " + rota);
    // Mesmo no streaming, os nomes fictícios não podem ser renderizados antes da autorização.
    assert.ok(!html.includes("Ana Exemplo") && !html.includes("Conectado como"));
    // Registra a verificação completa da rota, incluindo ausência de conteúdo protegido.
    verificacoes += 1;
  }
  // Cada perfil autentica pela API normal e recebe uma sessão distinta no processo fictício.
  for (const usuario of ["principal-demo", "admin-demo", "professor-demo"]) {
    // As credenciais são enviadas somente ao servidor local de teste.
    const login = await fetch(endereco + "/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ usuario, senha }) });
    // Confirma que a senha Argon2id e a sessão existente continuam funcionando.
    assert.equal(login.status, 200);
    // O token fica apenas em memória e não aparece no relatório do teste.
    const cookie = login.headers.get("set-cookie")?.split(";")[0];
    // Uma resposta de sucesso sem cookie não autentica as páginas seguintes.
    assert.ok(cookie);
    // Os cinco módulos e a entrada do painel são permitidos para contas ativas dos três perfis.
    for (const rota of rotas.slice(0, -1)) {
      // Envia a sessão isolada à rota real construída pelo Next.js.
      const { resposta, html } = await ler(rota, cookie);
      // Uma resposta parcial ainda precisa terminar com o conteúdo esperado e sem erro de servidor.
      assert.equal(resposta.status, 200);
      // O aviso permanece visível para não confundir exemplos com registros persistidos.
      assert.ok(html.includes("Dados fictícios.") && html.includes("Conectado como"));
      // A opção de contas deve acompanhar a permissão já existente de cada perfil.
      assert.equal(html.includes('href="/dashboard/usuarios"'), usuario !== "professor-demo");
      // Incrementa apenas depois de confirmar conteúdo e permissão da página.
      verificacoes += 1;
    }
    // A autorização da página de contas é verificada também por acesso direto, além de ocultar seu menu.
    const contas = await ler("/dashboard/usuarios", cookie);
    // Professores recebem redirecionamento e não podem ver a lista real de contas.
    if (usuario === "professor-demo") assert.ok(!contas.html.includes("Usuários cadastrados") && (contas.resposta.status === 307 || contas.html.includes("NEXT_REDIRECT")));
    // Os administradores mantêm o gerenciamento; exclusão e inativação continuam exclusivas do principal.
    else {
      // Confirma a presença da lista após a autorização administrativa.
      assert.ok(contas.html.includes("Usuários cadastrados"));
      // A coluna exclusiva conserva a separação entre principal e administrador comum.
      assert.equal(contas.html.includes("Gerenciar conta"), usuario === "principal-demo");
    }
    // Registra o teste direto da proteção administrativa.
    verificacoes += 1;
    // Logout passa pela API real, sem reutilizar a sessão do navegador ou alterar usuários.
    const logout = await fetch(endereco + "/api/logout", { method: "POST", headers: { Cookie: cookie } });
    // Confirma o retorno e a instrução para remover o cookie da sessão.
    assert.equal(logout.status, 200);
    // O servidor precisa enviar a remoção do cookie para encerrar o acesso no navegador.
    assert.ok(logout.headers.get("set-cookie")?.includes("team_black_fighter_sessao="));
    // Registra o fluxo de saída deste perfil fictício.
    verificacoes += 1;
  }
  // Contas inativas não podem obter uma sessão mesmo com a senha fictícia correta.
  const inativo = await fetch(endereco + "/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ usuario: "inativo-demo", senha }) });
  // A verificação exige recusa e ausência de cookie, sem depender da mensagem pública escolhida.
  assert.ok(inativo.status >= 400 && !inativo.headers.has("set-cookie"));
  // Inclui o cenário de conta inativa no total de verificações HTTP.
  verificacoes += 1;
  // O relatório contém apenas quantidade e ambiente; não inclui corpos de páginas nem tokens.
  console.log(verificacoes + " verificações HTTP passaram com contas fictícias e banco bloqueado para escrita.");
  // A opção mantém apenas o servidor fictício disponível para a revisão visual no navegador.
  if (process.argv.includes("--manter")) {
    // Informa o endereço e o identificador público fictício para uso exclusivo na revisão visual.
    console.log("Revisão visual isolada: " + endereco + " | principal-demo | senha fictícia Integracao123");
    // O processo permanece ativo até o executor ser encerrado depois da revisão visual.
    await new Promise((resolver) => servidor.on("exit", resolver));
  }
} catch (erro) {
  // Exibe somente o diagnóstico do processo fictício; nenhum servidor ou dado real participa deste teste.
  console.error(saida.slice(-4000));
  // Preserva a falha original para que a execução não apresente sucesso indevido.
  throw erro;
} finally {
  // Encerra exclusivamente o processo filho que este teste criou, sem tocar nos servidores existentes.
  servidor.kill();
}
