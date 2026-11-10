
/*
=====================================================
PROJETO: TEAM BLACK FIGHTER
ARQUIVO: lib/autorizacao.ts
OBJETIVO: Verificar permissões administrativas
=====================================================
*/

// Impede que este módulo seja utilizado no navegador.
import "server-only";

// Importa a função de consulta da sessão.
import { obterSessao } from "@/lib/sessao";

// Importa a conexão direta com o MySQL.
import pool from "@/lib/mysql";

// Importa a tipagem das consultas SQL.
import type { RowDataPacket } from "mysql2";

// Define os perfis permitidos no sistema.
export type PerfilUsuario =
  // Acrescenta esta alternativa ao conjunto de tipos ou perfis aceitos.
  | "admin_principal"
  // Acrescenta esta alternativa ao conjunto de tipos ou perfis aceitos.
  | "administrador"
  // Acrescenta esta alternativa ao conjunto de tipos ou perfis aceitos.
  | "professor";

// Define as informações do usuário autenticado.
export interface UsuarioAutenticado {
  // Identificador inteiro que localiza uma única conta no banco.
  id: number;
  // Nome de apresentação da pessoa, separado do identificador de login.
  nome: string;
  // Identificador único usado para acessar o sistema.
  usuario: string;
  // Nível de acesso usado pelo servidor para autorizar operações.
  perfil: PerfilUsuario;
// Conclui a estrutura de tipos UsuarioAutenticado, preservando a estrutura e o escopo definidos.
}

// Define as informações retornadas pelo MySQL.
interface UsuarioBanco extends RowDataPacket {
  // Identificador inteiro que localiza uma única conta no banco.
  id: number;
  // Nome de apresentação da pessoa, separado do identificador de login.
  nome: string;
  // Identificador único usado para acessar o sistema.
  usuario: string;
  // Nível de acesso usado pelo servidor para autorizar operações.
  perfil: PerfilUsuario;
  // Situação da conta; somente contas ativas podem autenticar ou autorizar alterações.
  ativo: number;
// Conclui a estrutura de tipos UsuarioBanco, preservando a estrutura e o escopo definidos.
}

// Consulta o usuário e valida sua sessão.
export async function obterUsuarioAutenticado():
  // Declara o tipo do resultado assíncrono: Promise<UsuarioAutenticado | null>.
  Promise<UsuarioAutenticado | null> {

  // Recupera a sessão atual.
  const sessao = await obterSessao();

  // Interrompe a operação caso não exista sessão.
  if (!sessao) {
    // Retorna este resultado ao chamador e encerra o caminho atual da função.
    return null;
  // Conclui a condição de validação e seu bloco de tratamento, preservando a estrutura e o escopo definidos.
  }

  // Consulta as informações atuais do usuário.
  const [registros] = await pool.execute<UsuarioBanco[]>(
    // Inicia a consulta parametrizada que lê os campos necessários da tabela existente.
    `SELECT id, nome, usuario, perfil, ativo
     -- Lê a tabela existente, sem criar ou remover estruturas.
     FROM professores
     -- Restringe a operação ao identificador ou à condição informada por parâmetro.
     WHERE id = ?
     -- Limita o retorno para não carregar registros desnecessários.
     LIMIT 1`,
    // Associa sessao.id aos placeholders SQL, separando valores da instrução.
    [sessao.id]
  // Conclui a função obterUsuarioAutenticado, preservando a estrutura e o escopo definidos.
  );

  // Obtém o registro retornado.
  const usuario = registros[0];

  // Valida a conta e o nome de usuário da sessão.
  if (
    // Rejeita o valor ausente ou vazio indicado nesta condição.
    !usuario ||
    // Recusa a conta desativada no banco antes de autorizar o acesso.
    !usuario.ativo ||
    // Rejeita a sessão quando o identificador de acesso da conta foi alterado.
    usuario.usuario !== sessao.usuario
  // Conclui a condição composta e inicia o tratamento executado quando ela é atendida.
  ) {
    // Retorna este resultado ao chamador e encerra o caminho atual da função.
    return null;
  // Conclui a condição de validação e seu bloco de tratamento, preservando a estrutura e o escopo definidos.
  }

  // Retorna apenas as informações necessárias.
  return {
    // Identificador inteiro que localiza uma única conta no banco.
    id: usuario.id,
    // Nome de apresentação da pessoa, separado do identificador de login.
    nome: usuario.nome,
    // Identificador único usado para acessar o sistema.
    usuario: usuario.usuario,
    // Nível de acesso usado pelo servidor para autorizar operações.
    perfil: usuario.perfil,
  // Conclui o objeto de dados ou opções passado à operação, preservando a estrutura e o escopo definidos.
  };
// Conclui a função obterUsuarioAutenticado, preservando a estrutura e o escopo definidos.
}

// Verifica se o usuário possui permissão administrativa.
export async function obterAdministrador():
  // Declara o tipo do resultado assíncrono: Promise<UsuarioAutenticado | null>.
  Promise<UsuarioAutenticado | null> {

  // Obtém o usuário autenticado.
  const usuario = await obterUsuarioAutenticado();

  // Impede o acesso sem autenticação.
  if (!usuario) {
    // Retorna este resultado ao chamador e encerra o caminho atual da função.
    return null;
  // Conclui a condição de validação e seu bloco de tratamento, preservando a estrutura e o escopo definidos.
  }

  // Permite administradores autorizados.
  if (
    // Verifica a ausência de permissão administrativa principal antes de recusar o acesso.
    usuario.perfil !== "admin_principal" &&
    // Completa a recusa quando também não existe permissão administrativa comum.
    usuario.perfil !== "administrador"
  // Conclui a condição composta e inicia o tratamento executado quando ela é atendida.
  ) {
    // Retorna este resultado ao chamador e encerra o caminho atual da função.
    return null;
  // Conclui a condição de validação e seu bloco de tratamento, preservando a estrutura e o escopo definidos.
  }

  // Confirma a autorização administrativa.
  return usuario;
// Conclui a função obterAdministrador, preservando a estrutura e o escopo definidos.
}
