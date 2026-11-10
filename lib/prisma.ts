
// Impede a inclusão deste módulo de servidor no código enviado ao navegador.
import "server-only";

// Importa o adaptador para conexão com MySQL.
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

// Importa o cliente gerado a partir do nosso banco.
import { PrismaClient } from "@/app/generated/prisma/client";

// Obtém a URL de conexão definida no arquivo .env.
const databaseUrl = process.env.DATABASE_URL;

// Verifica se a variável de conexão foi configurada.
if (!databaseUrl) {
  // Interrompe a inicialização se a variável estiver ausente.
  throw new Error("DATABASE_URL não está configurada.");
// Conclui a condição de validação e seu bloco de tratamento, preservando a estrutura e o escopo definidos.
}

// Interpreta os componentes da URL de conexão.
const connection = new URL(databaseUrl);

// Cria o adaptador utilizando os dados do MySQL.
const adapter = new PrismaMariaDb({
  // Endereço do servidor MySQL.
  host: connection.hostname,

  // Porta utilizada pelo servidor MySQL.
  port: Number(connection.port || "3306"),

  // Nome do usuário do banco.
  user: decodeURIComponent(connection.username),

  // Senha do usuário do banco.
  password: decodeURIComponent(connection.password),

  // Nome do banco de dados da academia.
  database: decodeURIComponent(connection.pathname.slice(1)),

  // Quantidade máxima de conexões no pool.
  connectionLimit: 5,
// Conclui o objeto de dados ou opções passado à operação, preservando a estrutura e o escopo definidos.
});

// Cria uma instância do Prisma Client.
const prisma = new PrismaClient({
  // Informa qual adaptador o Prisma deverá utilizar.
  adapter,
// Conclui o objeto de dados ou opções passado à operação, preservando a estrutura e o escopo definidos.
});

// Exporta a instância para os demais arquivos do servidor.
export default prisma;
