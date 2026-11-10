// Impede que consultas de alteração de contas sejam incluídas no navegador.
import "server-only";
// Usa exclusivamente os tipos do driver MySQL2 já instalado no projeto.
import type { Pool } from "mysql2/promise";
// Tipos de linhas consultadas e de resultados de comandos de alteração.
import type { RowDataPacket, ResultSetHeader } from "mysql2";
// Compartilha o comando validado e os resultados conhecidos com a camada de regras.
import type { ComandoConta, ResultadoPersistenciaConta } from "./gerenciamento-conta";

// O filtro é fixo: nenhum trecho SQL é recebido do navegador.
const filtroProtegido = `WHERE alvo.id = ?
  -- Impede que o administrador altere ou exclua sua própria conta.
  AND alvo.id <> autor.id
  -- Somente professores e administradores comuns podem ser gerenciados.
  AND alvo.perfil IN ('professor', 'administrador')
  -- O autor deve permanecer ativo no instante da alteração.
  AND autor.ativo = 1
  -- O perfil de desenvolvedor precisa continuar sendo administrador principal.
  AND autor.perfil = 'admin_principal'
  -- A senha confirmada não pode ter sido trocada durante o processamento.
  AND BINARY autor.senha_hash = BINARY ?
  -- A confirmação precisa continuar identificando o mesmo login, com comparação exata.
  AND BINARY alvo.usuario = BINARY ?
  -- Uma situação alterada por outra solicitação exige atualizar a tela antes de tentar novamente.
  AND alvo.ativo = ?`;

// Exporta as consultas fixas para conferir a sintaxe via EXPLAIN, sem alterar registros nos testes.
export const consultasConta = {
  // Detecta efeitos automáticos que poderiam alterar tabelas além da conta solicitada.
  vinculos: `SELECT
    -- Conta relacionamentos que propagariam uma exclusão para outros registros.
    (SELECT COUNT(*) FROM information_schema.REFERENTIAL_CONSTRAINTS
      -- Limita a verificação às referências à tabela existente deste banco.
      WHERE UNIQUE_CONSTRAINT_SCHEMA = DATABASE() AND REFERENCED_TABLE_NAME = 'professores'
      -- Não autoriza apagar nem limpar registros de outras tabelas em cascata.
      AND DELETE_RULE IN ('CASCADE', 'SET NULL'))
    -- Soma os gatilhos de exclusão, cujos efeitos precisam ser avaliados antes de permitir a remoção.
    + (SELECT COUNT(*) FROM information_schema.TRIGGERS
      -- Considera somente gatilhos que pertencem à tabela de usuários deste banco.
      WHERE TRIGGER_SCHEMA = DATABASE() AND EVENT_OBJECT_TABLE = 'professores'
      -- Gatilhos de exclusão podem alterar outros dados e por isso bloqueiam esta opção.
      AND EVENT_MANIPULATION = 'DELETE') AS total`,
  // Remove uma única conta alvo; o JOIN revalida a identidade administrativa na mesma instrução.
  excluir: `DELETE alvo FROM professores AS alvo
    -- Relaciona a conta alvo ao administrador principal autenticado.
    INNER JOIN professores AS autor ON autor.id = ?
    ${filtroProtegido}`,
  // Altera somente a coluna ativo, preservando senha, cadastro e registros relacionados.
  situacao: `UPDATE professores AS alvo
    -- Relaciona a conta alvo ao administrador principal autenticado.
    INNER JOIN professores AS autor ON autor.id = ?
    -- O valor parametrizado será zero para inativar e um para reativar.
    SET alvo.ativo = ?
    ${filtroProtegido}`,
  // Finaliza o conjunto de consultas fixas utilizadas por esta funcionalidade.
};

// Tipagem do total retornado pela inspeção de relacionamentos e gatilhos.
interface RestricoesConta extends RowDataPacket {
  // Um valor maior que zero impede excluir para não afetar outras tabelas.
  total: number;
// Finaliza a descrição da consulta de restrições.
}

// Recebe um executor para permitir testes reais de montagem SQL com um driver simulado.
export async function operarContaMysql(executor: Pick<Pool, "execute">, comando: ComandoConta): Promise<ResultadoPersistenciaConta> {
  // Organiza os parâmetros do filtro na mesma ordem dos placeholders SQL.
  const parametros = [comando.alvoId, comando.credencial, comando.usuarioConfirmado, Number(comando.ativoEsperado)];
  // Apenas a exclusão precisa avaliar efeitos automáticos sobre outros registros.
  if (comando.operacao === "excluir") {
    // Consulta somente metadados, sem ler ou alterar registros relacionados.
    const [restricoes] = await executor.execute<RestricoesConta[]>(consultasConta.vinculos);
    // Se houver propagação ou gatilho, não executa nenhum DELETE.
    if (!restricoes[0] || Number(restricoes[0].total) !== 0) return "vinculado";
    // Remove somente a linha cuja identidade, perfil, situação e autor ainda conferem.
    const [resultado] = await executor.execute<ResultSetHeader>(consultasConta.excluir, [comando.autorId, ...parametros]);
    // Exige exatamente uma linha removida para anunciar o sucesso.
    return resultado.affectedRows === 1 ? "concluido" : "alterado";
  // Finaliza o caminho de remoção permanente.
  }
  // Converte a operação de situação em um valor numérico aceito pelo MySQL.
  const ativo = comando.operacao === "reativar" ? 1 : 0;
  // A alteração não modifica a senha nem qualquer outra coluna do cadastro.
  const [resultado] = await executor.execute<ResultSetHeader>(consultasConta.situacao, [comando.autorId, ativo, ...parametros]);
  // Nenhuma linha alterada representa um estado concorrente ou autorização que deixou de valer.
  return resultado.affectedRows === 1 ? "concluido" : "alterado";
// Finaliza a operação parametrizada de persistência.
}

