-- TEAM BLACK FIGHTER: executar uma vez com uma conta administradora do MySQL.
-- Seleciona o banco atual; não cria outro banco e não altera a tabela professores.
USE `team_black_fighter`;

-- TEAM BLACK FIGHTER: complemento solicitado em 24/10/2026 para diagnóstico técnico.
-- Executar uma vez no banco atual, com conta administradora do MySQL.
-- Não altera tabelas existentes e não importa, corrige ou remove dados de alunos ou contas.

-- Eventos técnicos não contêm texto livre da exceção, stack, SQL, formulários ou dados pessoais.
CREATE TABLE tbf_logs_tecnicos (
  id CHAR(36) NOT NULL COMMENT 'UUID interno do evento técnico, gerado pelo servidor',
  referencia CHAR(36) NOT NULL COMMENT 'Código aleatório que liga a mensagem pública ao evento sem dados pessoais',
  nivel ENUM('aviso','erro') NOT NULL COMMENT 'Classificação controlada pelo código do servidor',
  origem VARCHAR(60) NOT NULL COMMENT 'Operação interna permitida, nunca texto recebido do formulário',
  codigo VARCHAR(60) NOT NULL COMMENT 'Código pertencente à lista fechada; valores desconhecidos viram marcador genérico',
  criado_em TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT 'Instante de ocorrência persistido pelo MySQL',
  PRIMARY KEY (id), -- Não reutiliza ou sobrescreve um evento técnico anterior.
  UNIQUE KEY uq_tbf_logs_referencia (referencia), -- A referência pública localiza um único evento.
  KEY ix_tbf_logs_instante (criado_em), -- Apoia consulta limitada aos eventos mais recentes.
  KEY ix_tbf_logs_origem (origem,criado_em) -- Facilita diagnóstico por operação sem pesquisar dados pessoais.
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Diagnóstico sanitizado, restrito ao administrador principal; separado da auditoria';

-- Sem limpeza automática nesta etapa. Retenção e descarte exigem política definida posteriormente.
-- As permissões mínimas da conta existente serão acrescentadas no arquivo final para Workbench.


-- PRIVILÉGIOS MÍNIMOS PARA A CONTA JÁ UTILIZADA PELO SITE.
-- Permite consultar e acrescentar eventos; não permite alterar ou excluir histórico.
GRANT SELECT, INSERT ON `team_black_fighter`.`tbf_logs_tecnicos` TO 'blackfighter_app'@'localhost';

-- Conferência final somente de metadados, sem exibir dados pessoais.
SELECT TABLE_NAME, ENGINE FROM information_schema.TABLES
-- Limita a conferência ao banco selecionado e às estruturas aprovadas.
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('tbf_logs_tecnicos')
-- Exibe a tabela de logs criada neste complemento.
ORDER BY TABLE_NAME;
