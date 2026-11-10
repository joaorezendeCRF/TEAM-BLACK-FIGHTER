
/*
=====================================================
PROJETO: TEAM BLACK FIGHTER
ARQUIVO: lib/mysql.ts
OBJETIVO: Conectar o Next.js diretamente ao MySQL
=====================================================
*/

// Impede a utilização deste arquivo no navegador.
import "server-only";

// Importa a biblioteca de conexão com MySQL.
import mysql from "mysql2/promise";

// Obtém a conexão configurada no arquivo .env.
const databaseUrl = process.env.DATABASE_URL;

// Verifica se a configuração existe.
if (!databaseUrl) {
  // Interrompe a operação ao detectar uma condição inválida, com a mensagem indicada.
  throw new Error("DATABASE_URL não configurada.");
// Conclui a condição de validação e seu bloco de tratamento, preservando a estrutura e o escopo definidos.
}

// Interpreta o endereço de conexão.
const conexao = new URL(databaseUrl);

// Cria um pool de conexões reutilizáveis.
const pool = mysql.createPool({

  // Endereço do servidor MySQL.
  host: conexao.hostname,

  // Porta utilizada pelo MySQL.
  port: Number(conexao.port || "3306"),

  // Usuário exclusivo do sistema.
  user: decodeURIComponent(conexao.username),

  // Senha de acesso ao banco.
  password: decodeURIComponent(conexao.password),

  // Banco de dados da academia.
  database: decodeURIComponent(conexao.pathname.slice(1)),

  // Aguarda quando todas as conexões estiverem ocupadas.
  waitForConnections: true,

  // Permite até cinco conexões simultâneas.
  connectionLimit: 5,

  // Limita a fila de espera.
  queueLimit: 20,

// Conclui o objeto de dados ou opções passado à operação, preservando a estrutura e o escopo definidos.
});

// Exporta a conexão para utilização nas APIs.
export default pool;
