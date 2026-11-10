// Ativação manual: apenas configura o ambiente depois de conferir as tabelas criadas pelo usuário.
import { createRequire } from "node:module";
// As pastas e o arquivo de ambiente ficam fora da publicação e do controle de versão.
import { mkdir, readFile, writeFile, copyFile } from "node:fs/promises";
// Permissões no Windows são aplicadas sem abrir uma janela adicional.
import { execFileSync } from "node:child_process";
// Caminhos são fixos para este ambiente local de testes aprovado.
import path from "node:path";
// Identifica uma cópia de configuração anterior sem reutilizar nomes existentes.
import { randomUUID } from "node:crypto";
// Resolve o projeto em que o executor está instalado.
import { fileURLToPath } from "node:url";
// Arquivo instalado em scripts/ mantém todas as referências na mesma aplicação.
const projeto = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// Usa bibliotecas instaladas, preservando as versões existentes.
const require = createRequire(path.join(projeto, "package.json"));
// Configura a conexão somente em memória, sem imprimir segredos.
require("@next/env").loadEnvConfig(projeto);
// Não concede privilégios nem executa migração.
const mysql = require("mysql2/promise"), url = new URL(process.env.DATABASE_URL);
// A conta normal do sistema precisa conseguir acessar todas as novas estruturas.
const conexao = await mysql.createConnection({ host: url.hostname, port: Number(url.port || 3306), user: decodeURIComponent(url.username), password: decodeURIComponent(url.password), database: decodeURIComponent(url.pathname.slice(1)) });
// As sete tabelas aprovadas e o complemento de logs devem estar prontos antes de liberar a gravação.
const tabelas = ["tbf_alunos", "tbf_matriculas", "tbf_emergencias", "tbf_responsaveis_matricula", "tbf_seguranca_matricula", "tbf_documentos_versoes", "tbf_auditoria_alunos", "tbf_logs_tecnicos"];
// Uma falha encerra sem alterar arquivos de configuração ou dados existentes.
try {
  // Conferência de metadados detecta estrutura ainda não criada ou sem privilégios de consulta.
  const [existentes] = await conexao.execute("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (?, ?, ?, ?, ?, ?, ?, ?)", tabelas);
  // O modo de conferência oferece resultado claro enquanto o usuário executa os SQLs no Workbench.
  if (existentes.length !== tabelas.length) { console.log("Estrutura pendente: " + (tabelas.length - existentes.length) + " tabela(s). Nenhuma configuração alterada."); process.exitCode = 2; }
  // A ativação só prossegue quando toda a estrutura necessária está presente.
  else if (!process.argv.includes("--conferir")) {
    // Duas raízes locais distintas preservam uma segunda cópia dos arquivos de teste.
    const privado = "C:/Projetos/TeamBlackFighterPrivado", secundario = path.join(process.env.LOCALAPPDATA, "TeamBlackFighter");
    // As raízes são nomeadas explicitamente, sem remover ou mover conteúdo existente.
    for (const pasta of [privado, secundario]) {
      // Garante a existência da pasta antes de restringir herança de acesso.
      await mkdir(pasta, { recursive: true });
      // O SID vem da identidade atual do Windows, sem senha ou texto recebido do usuário.
      const sid = execFileSync("powershell.exe", ["-NoProfile", "-Command", "([Security.Principal.WindowsIdentity]::GetCurrent()).User.Value"], { windowsHide: true, encoding: "utf8" }).trim();
      // Usuário atual e sistema operacional têm acesso; outros usuários não herdam leitura da pasta.
      execFileSync("icacls.exe", [pasta, "/inheritance:r", "/grant:r", "*" + sid + ":(OI)(CI)F", "*S-1-5-18:(OI)(CI)F"], { windowsHide: true, stdio: "pipe" });
    }
    // Os caminhos ficam externos ao código, ao build e à pasta public.
    const valores = { TBF_CADASTROS_TESTE: "1", TBF_DOCUMENTOS_DIR: path.join(privado, "documentos").replaceAll("\\", "/"), TBF_DOCUMENTOS_COPIA_DIR: path.join(secundario, "copias-documentos").replaceAll("\\", "/"), TBF_LOGS_DIR: path.join(privado, "logs").replaceAll("\\", "/") };
    // Preserva todos os valores de ambiente que não pertencem a esta funcionalidade.
    const arquivo = path.join(projeto, ".env.local");
    // Ausência é tratada como um arquivo novo; outras falhas de acesso interrompem a ativação.
    let anterior = "";
    // A configuração atual nunca aparece na saída nem nos logs.
    try { anterior = await readFile(arquivo, "utf8"); } catch (erro) { if (erro.code !== "ENOENT") throw erro; }
    // Uma cópia anterior só é guardada na pasta privada, protegida pelas permissões aplicadas acima.
    if (anterior) await copyFile(arquivo, path.join(privado, "config-anterior-" + randomUUID() + ".env"));
    // Remove exclusivamente os quatro parâmetros de teste que serão atualizados.
    const linhas = anterior.split(/\r?\n/).filter((linha) => !Object.keys(valores).some((chave) => linha.startsWith(chave + "=")));
    // Grava valores literais de configuração, preservando DATABASE_URL e SESSION_SECRET existentes.
    await writeFile(arquivo, linhas.join("\n").trimEnd() + "\n\n# Cadastro persistente e documentos: somente dados fictícios.\n" + Object.entries(valores).map(([chave, valor]) => chave + "=" + JSON.stringify(valor)).join("\n") + "\n", { mode: 0o600 });
    // Não grava aluno, documento ou conta e não reinicia o servidor utilizado pelo dono.
    console.log("Ambiente de testes habilitado. Reinicie o servidor local para carregar a configuração.");
  } else {
    // A consulta de conferência não modifica configuração nem dados.
    console.log("Oito tabelas encontradas. Configuração e dados não alterados.");
  }
} finally {
  // Encerra a conexão depois da verificação ou ativação.
  await conexao.end();
}
