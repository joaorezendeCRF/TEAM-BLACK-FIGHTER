-- TEAM BLACK FIGHTER — proposta executável manualmente no MySQL Workbench, em 29/10/2026.
-- Não executada pelo site. Revisar este arquivo e manter backup restaurável antes da execução administrativa.
-- Acrescenta duas colunas e uma tabela; não contém DELETE, DROP, TRUNCATE, importação ou alteração de contas.
-- Colunas existentes, preços já contratados, UUIDs e anexos permanecem preservados.
-- Executar uma vez; se ocorrer falha parcial, conferir os metadados antes de repetir os ALTER TABLE.

-- Seleciona o banco atual que já contém os cadastros de teste.
USE `team_black_fighter`;

-- Prévia somente de estrutura, para conferir se esta atualização já foi aplicada.
SELECT TABLE_NAME, COLUMN_NAME FROM information_schema.COLUMNS
-- Consulta apenas as duas novas colunas; zero linhas significa que ainda não foram criadas.
WHERE TABLE_SCHEMA = DATABASE() AND ((TABLE_NAME = 'tbf_alunos' AND COLUMN_NAME = 'versao_ficha') OR (TABLE_NAME = 'tbf_matriculas' AND COLUMN_NAME = 'modalidade'));

-- Uma versão por aluno impede sobrescrita por formulário antigo, inclusive entre matrículas dele.
ALTER TABLE `tbf_alunos`
-- O padrão inicial permite preservar todas as linhas existentes sem editar seus campos pessoais.
ADD COLUMN `versao_ficha` INT UNSIGNED NOT NULL DEFAULT 1 COMMENT 'Controle de concorrência da ficha; incrementado pelo servidor em cada edição concluída',
-- Restringe versões a inteiros positivos; a comparação exata também é feita sob bloqueio no servidor.
ADD CONSTRAINT `ck_tbf_alunos_versao_ficha` CHECK (`versao_ficha` >= 1);

-- Modalidade independente da frequência e do preço identifica claramente os seis planos.
ALTER TABLE `tbf_matriculas`
-- Matrículas existentes passam a ser identificadas como normal; seus preços não são recalculados.
ADD COLUMN `modalidade` ENUM('normal','personal') NOT NULL DEFAULT 'normal' COMMENT 'Modalidade contratada; frequência e mensalidade continuam em suas colunas próprias';

-- Histórico privado conserva a ficha anterior antes de cada alteração confirmada.
-- Contém dados restritos como a própria ficha: não é log técnico, não é listado no painel geral e deve acompanhar backups e política de retenção.
CREATE TABLE `tbf_fichas_revisoes` (
  -- Identificador aleatório desta revisão, sem derivação de CPF ou nome.
  `id` CHAR(36) NOT NULL COMMENT 'UUID da revisão privada gerado no servidor',
  -- Aluno bloqueado durante a revisão; evita concorrer por matrículas diferentes dele.
  `aluno_id` CHAR(36) NOT NULL COMMENT 'Aluno cuja ficha anterior foi preservada',
  -- Matrícula escolhida mantém o vínculo com plano, professor e documentos originais.
  `matricula_id` CHAR(36) NOT NULL COMMENT 'Matrícula editada; documentos não são movidos ou substituídos',
  -- Número anterior permite identificar a sequência sem sobrescrever revisões.
  `versao_anterior` INT UNSIGNED NOT NULL COMMENT 'Número da ficha antes da atualização atômica',
  -- JSON é histórico cadastral privado; não deve ser copiado para relatórios comuns, logs ou exemplos públicos.
  `dados_anteriores` JSON NOT NULL COMMENT 'Ficha anterior e preço contratado; leitura exige autorização específica e auditoria',
  -- Autoria vem da sessão revalidada dentro da transação.
  `ator_id` INT NOT NULL COMMENT 'Conta ativa que confirmou a edição',
  -- Registro temporal usa a conexão configurada em UTC.
  `criado_em` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT 'Instante da revisão; não altera a data original da matrícula',
  -- Identifica cada revisão independentemente da matrícula atual.
  PRIMARY KEY (`id`),
  -- Uma versão anterior só pode ser arquivada uma vez por aluno.
  UNIQUE KEY `uq_tbf_ficha_versao` (`aluno_id`, `versao_anterior`),
  -- Apoia a recuperação administrativa das versões da matrícula, sem varredura de outros alunos.
  KEY `ix_tbf_ficha_matricula` (`matricula_id`, `criado_em`),
  -- Não aceita revisão inicial inexistente ou contagem negativa.
  CONSTRAINT `ck_tbf_ficha_versao` CHECK (`versao_anterior` >= 1),
  -- JSON deve conter um objeto, nunca texto livre que dispense o contrato privado da ficha.
  CONSTRAINT `ck_tbf_ficha_objeto` CHECK (JSON_TYPE(`dados_anteriores`) = 'OBJECT'),
  -- Relação não permite exclusão em cascata de histórico.
  CONSTRAINT `fk_tbf_ficha_aluno` FOREIGN KEY (`aluno_id`) REFERENCES `tbf_alunos` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  -- Preserva a identidade da matrícula mesmo quando inativa.
  CONSTRAINT `fk_tbf_ficha_matricula` FOREIGN KEY (`matricula_id`) REFERENCES `tbf_matriculas` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  -- Conserva o responsável pela alteração e impede apagamento indireto da autoria.
  CONSTRAINT `fk_tbf_ficha_ator` FOREIGN KEY (`ator_id`) REFERENCES `professores` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
-- Mantém motor e collation compatíveis com as tabelas atuais.
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Versões privadas da ficha; histórico separado dos logs técnicos sem dados pessoais';

-- A conta do site pode acrescentar e consultar revisões, sem editar ou excluir as anteriores.
GRANT SELECT, INSERT ON `team_black_fighter`.`tbf_fichas_revisoes` TO 'blackfighter_app'@'localhost';
-- Os privilégios SELECT/INSERT/UPDATE já aprovados nas tabelas atuais continuam suficientes; nenhum privilégio global ou DDL é concedido.

-- Conferência final apenas dos metadados, sem expor conteúdo de fichas.
SELECT TABLE_NAME, ENGINE FROM information_schema.TABLES
-- Restringe a verificação à tabela privada acrescentada nesta atualização.
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tbf_fichas_revisoes';
