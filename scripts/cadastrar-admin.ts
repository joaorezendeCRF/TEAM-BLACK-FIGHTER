
/*
=====================================================
PROJETO: TEAM BLACK FIGHTER
ARQUIVO: scripts/cadastrar-admin.ts
OBJETIVO: Cadastrar os administradores no MySQL
=====================================================
*/

// Carrega as variáveis do arquivo .env.
import "dotenv/config";

// Importa as perguntas interativas do terminal.
import { select, password } from "@inquirer/prompts";

// Importa o adaptador de conexão com MySQL.
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

// Importa o Prisma Client gerado pelo projeto.
import { PrismaClient } from "../app/generated/prisma/client";

// Importa a biblioteca para proteger as senhas.
import argon2 from "argon2";

// Define os administradores que podem ser cadastrados.
const administradores = [
  // Conta do desenvolvedor do sistema.
  { nome: "João", usuario: "joao" },

  // Conta do professor Emerson.
  { nome: "Emerson", usuario: "emerson" },

  // Conta do professor Gamarra.
  { nome: "Gamarra", usuario: "gamarra" },
// Finaliza a lista de contas predefinidas e preserva seus valores literais no TypeScript.
] as const;

// Obtém a conexão configurada no arquivo .env.
const databaseUrl = process.env.DATABASE_URL;

// Verifica se a variável foi definida.
if (!databaseUrl) {
  // Interrompe a execução caso a conexão esteja ausente.
  throw new Error("DATABASE_URL não configurada.");
// Conclui a condição de validação e seu bloco de tratamento, preservando a estrutura e o escopo definidos.
}

// Interpreta os componentes da URL do banco.
const conexao = new URL(databaseUrl);

// Prepara o adaptador MySQL.
const adapter = new PrismaMariaDb({
  // Endereço do servidor.
  host: conexao.hostname,

  // Porta utilizada pelo MySQL.
  port: Number(conexao.port || "3306"),

  // Usuário de acesso ao banco.
  user: decodeURIComponent(conexao.username),

  // Senha de acesso ao banco.
  password: decodeURIComponent(conexao.password),

  // Nome do banco de dados.
  database: decodeURIComponent(conexao.pathname.slice(1)),

  // Limita as conexões simultâneas.
  connectionLimit: 2,
// Conclui o objeto de dados ou opções passado à operação, preservando a estrutura e o escopo definidos.
});

// Inicializa o Prisma Client.
const prisma = new PrismaClient({ adapter });

// Define a função principal do cadastro.
async function cadastrarAdministrador() {
  // Apresenta o título da operação.
  console.log("\n=== TEAM BLACK FIGHTER ===");
  // Registra o aviso ou diagnóstico indicado no ambiente em que esta operação está sendo executada.
  console.log("Cadastro seguro de administradores\n");

  // Solicita a escolha do administrador.
  const usuarioSelecionado = await select({
    // Texto apresentado no terminal.
    message: "Qual administrador deseja cadastrar?",

    // Opções disponíveis.
    choices: administradores.map((administrador) => ({
      // Nome exibido na lista.
      name: administrador.nome,

      // Valor retornado ao selecionar a opção.
      value: administrador.usuario,
    // Conclui o objeto de dados ou opções passado à operação, preservando a estrutura e o escopo definidos.
    })),
  // Conclui o objeto de dados ou opções passado à operação, preservando a estrutura e o escopo definidos.
  });

  // Localiza os dados do administrador escolhido.
  const administrador = administradores.find(
    // Compara os nomes de usuário.
    (item) => item.usuario === usuarioSelecionado
  // Conclui a função cadastrarAdministrador, preservando a estrutura e o escopo definidos.
  );

  // Garante que a opção selecionada é válida.
  if (!administrador) {
    // Encerra se não encontrar o usuário.
    throw new Error("Administrador não encontrado.");
  // Conclui a condição de validação e seu bloco de tratamento, preservando a estrutura e o escopo definidos.
  }

  // Verifica se a conta já existe no banco.
  const existente = await prisma.professores.findUnique({
    // Pesquisa pelo campo único usuario.
    where: { usuario: administrador.usuario },
  // Conclui o objeto de dados ou opções passado à operação, preservando a estrutura e o escopo definidos.
  });

  // Impede a criação de usuários duplicados.
  if (existente) {
    // Informa a situação sem alterar a conta.
    console.log("\nEste administrador já está cadastrado.");
    // Encerra a função sem continuar as etapas seguintes.
    return;
  // Conclui a condição de validação e seu bloco de tratamento, preservando a estrutura e o escopo definidos.
  }

  // Solicita uma senha sem exibir os caracteres.
  const senha = await password({
    // Mensagem apresentada ao usuário.
    message: "Digite uma senha com pelo menos 6 caracteres:",

    // Oculta os caracteres digitados.
    mask: "*",
  // Conclui o objeto de dados ou opções passado à operação, preservando a estrutura e o escopo definidos.
  });

  // Exige um comprimento mínimo de senha.
  if (senha.length < 6) {
    // Interrompe o cadastro se a senha for curta.
    throw new Error("A senha deve ter pelo menos 6 caracteres.");
  // Conclui a condição de validação e seu bloco de tratamento, preservando a estrutura e o escopo definidos.
  }

  // Solicita a confirmação da senha.
  const confirmacao = await password({
    // Mensagem da confirmação.
    message: "Confirme a senha:",

    // Oculta os caracteres da confirmação.
    mask: "*",
  // Conclui o objeto de dados ou opções passado à operação, preservando a estrutura e o escopo definidos.
  });

  // Confere se as duas senhas são iguais.
  if (senha !== confirmacao) {
    // Interrompe o cadastro se forem diferentes.
    throw new Error("As senhas informadas não coincidem.");
  // Conclui a condição de validação e seu bloco de tratamento, preservando a estrutura e o escopo definidos.
  }

  // Transforma a senha em hash utilizando Argon2id.
  const senhaHash = await argon2.hash(senha, {
    // Define a variante recomendada do algoritmo.
    type: argon2.argon2id,

    // Define o custo de memória em KiB.
    memoryCost: 65536,

    // Define três iterações.
    timeCost: 3,

    // Define o paralelismo.
    parallelism: 1,
  // Conclui o objeto de dados ou opções passado à operação, preservando a estrutura e o escopo definidos.
  });

  // Cadastra o administrador no MySQL.
  await prisma.professores.create({
    // Informa os valores das colunas.
    data: {
      // Nome do administrador.
      nome: administrador.nome,

      // Nome de usuário do login.
      usuario: administrador.usuario,

      // E-mail opcional.
      email: null,

      // Armazena somente o hash.
      senha_hash: senhaHash,

      // Libera o acesso da conta.
      ativo: true,
    // Conclui o objeto de dados ou opções passado à operação, preservando a estrutura e o escopo definidos.
    },
  // Conclui o objeto de dados ou opções passado à operação, preservando a estrutura e o escopo definidos.
  });

  // Informa que o cadastro foi concluído.
  console.log("\nAdministrador cadastrado com sucesso!");
  // Registra o aviso ou diagnóstico indicado no ambiente em que esta operação está sendo executada.
  console.log(`Usuário: ${administrador.usuario}`);
// Conclui a função cadastrarAdministrador, preservando a estrutura e o escopo definidos.
}

// Executa a função principal do script.
try {
  // Aguarda a conclusão do cadastro.
  await cadastrarAdministrador();
// Captura falhas desta operação para apresentar uma resposta controlada.
} catch (erro) {
  // Trata o erro sem exibir as credenciais.
  console.error(
    // Usa a mensagem de um erro conhecido ou uma mensagem genérica para falhas de outro tipo.
    erro instanceof Error ? erro.message : "Erro ao cadastrar."
  // Conclui o bloco de tratamento de falhas da operação, preservando a estrutura e o escopo definidos.
  );

  // Indica que ocorreu uma falha.
  process.exitCode = 1;
// Executa a finalização mesmo quando a operação termina com erro.
} finally {
  // Encerra as conexões abertas pelo Prisma.
  await prisma.$disconnect();
// Conclui o bloco de tratamento de falhas da operação, preservando a estrutura e o escopo definidos.
}

