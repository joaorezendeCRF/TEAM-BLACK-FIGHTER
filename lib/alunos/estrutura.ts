// Metadados do banco nunca são consultados pelo navegador.
import "server-only";
// Reutiliza a conexão atual, sem criar credenciais ou executar migrações automaticamente.
import pool from "@/lib/mysql";
// Tipos descrevem apenas o resultado da conferência de estrutura.
import type { RowDataPacket } from "mysql2";
// O mesmo contrato permite testar a ausência de migração sem tocar no banco configurado.
import type { Pool } from "mysql2/promise";
// A aplicação mantém o cadastro normal funcionando antes da execução manual do novo SQL.
export async function estruturaFichaDisponivel(executor: Pick<Pool, "execute"> = pool): Promise<boolean> {
  // Confere somente nomes de tabelas e colunas no esquema atual, sem ler dados pessoais.
  const [linhas] = await executor.execute<RowDataPacket[]>(`SELECT (
    -- A versão compartilhada por aluno protege também edições feitas em matrículas diferentes.
    EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tbf_alunos' AND COLUMN_NAME = 'versao_ficha')
    -- Modalidade separa normal de personal sem recalcular preços já contratados.
    AND EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tbf_matriculas' AND COLUMN_NAME = 'modalidade')
    -- Edição só é liberada quando também existe o histórico privado das fichas anteriores.
    AND EXISTS(SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tbf_fichas_revisoes')
  ) AS pronta`);
  // Ausência de estrutura não é interpretada como autorização para criar tabelas.
  return Number(linhas[0]?.pronta) === 1;
}
