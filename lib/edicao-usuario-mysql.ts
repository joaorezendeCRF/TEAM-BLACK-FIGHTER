// O adaptador e os hashes jamais são incluídos no código do navegador.
import "server-only";
// Usa a conexão transacional da biblioteca MySQL2 existente.
import type { Pool } from "mysql2/promise";
// Tipos descrevem linhas e resultado de atualização parametrizada.
import type { RowDataPacket, ResultSetHeader } from "mysql2";
// Reutiliza a matriz de acesso e a mesma versão conferida pela interface.
import { podeEditarConta, versaoConta, type ContaEditavel, type ComandoEdicao } from "./edicao-usuario";
// Autor e alvo são bloqueados em ordem de ID para reduzir conflitos entre solicitações.
export async function editarContaMysql(executor: Pick<Pool, "getConnection">, comando: ComandoEdicao): Promise<boolean> {
  // Uma conexão exclusiva mantém os bloqueios até commit ou rollback.
  const conexao = await executor.getConnection();
  // Qualquer erro deve liberar a conexão sem deixar alteração parcial.
  try {
    // O bloqueio impede alteração de perfil/senha no intervalo de autorização.
    await conexao.beginTransaction();
    // A consulta interna inclui o hash somente porque ele participa da revalidação no servidor.
    const [linhas] = await conexao.execute<(ContaEditavel & RowDataPacket & { senha_hash: string })[]>(
      // O SQL fixo não aceita nomes de colunas ou filtros fornecidos pelo cliente.
      "SELECT id, nome, usuario, email, perfil, ativo, senha_hash FROM professores WHERE id IN (?, ?) ORDER BY id FOR UPDATE",
      // Identificadores de autor e alvo foram validados pelo serviço.
      [comando.autorId, comando.alvoId],
    );
    // Seleciona os dois registros sob o mesmo bloqueio transacional.
    const autor = linhas.find((linha) => linha.id === comando.autorId), alvo = linhas.find((linha) => linha.id === comando.alvoId);
    // A autorização deve continuar válida, com a mesma senha já reconfirmada.
    if (!autor || !alvo || !autor.ativo || autor.senha_hash !== comando.credencial || !podeEditarConta(autor, alvo) || versaoConta(alvo) !== comando.versao || (comando.perfil !== alvo.perfil && autor.perfil !== "admin_principal")) {
      // Um conflito conserva integralmente o registro anterior.
      await conexao.rollback();
      // O serviço orienta atualizar a tela antes de tentar de novo.
      return false;
    }
    // Atualiza apenas os campos explicitamente permitidos; a senha só muda numa promoção.
    const [resultado] = await conexao.execute<ResultSetHeader>(
      // COALESCE preserva o hash atual quando nenhuma promoção foi solicitada.
      "UPDATE professores SET nome = ?, usuario = ?, email = ?, perfil = ?, senha_hash = COALESCE(?, senha_hash) WHERE id = ?",
      // Valores nunca são interpolados na instrução SQL.
      [comando.nome, comando.usuario, comando.email, comando.perfil, comando.senhaHash, alvo.id],
    );
    // Confirma a edição, inclusive quando os valores são iguais aos já existentes.
    await conexao.commit();
    // O driver considera a única linha encontrada para a conta bloqueada.
    return resultado.affectedRows === 1;
  } catch (erro) {
    // Índices únicos e outras falhas revertem todos os campos juntos.
    await conexao.rollback();
    // O serviço converte a exceção em mensagem pública sem conteúdo do banco.
    throw erro;
  } finally {
    // Sempre devolve a conexão ao pool, inclusive em recusas e erros.
    conexao.release();
  }
}
