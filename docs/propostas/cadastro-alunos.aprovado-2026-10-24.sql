-- CRIAÇÃO APROVADA PELO USUÁRIO EM 24/10/2026. Execução manual, nunca na inicialização da aplicação.
-- Base conferida por leitura de metadados: MySQL 8.0.45, professores.id INT, InnoDB, utf8mb4_0900_ai_ci.
-- Não altera a tabela professores, não importa os Excel e não cria recebimentos financeiros.
-- Antes de executar: validar esta proposta, backup restaurável, ambiente, privilégios e transação da aplicação.

-- Dados cadastrais comuns ficam separados de saúde e dos arquivos privados.
CREATE TABLE tbf_alunos (
  id CHAR(36) NOT NULL COMMENT 'UUID gerado pelo servidor; identificador estável do aluno',
  nome VARCHAR(150) NOT NULL COMMENT 'Nome informado no cadastro; não é chave de identidade',
  cpf CHAR(11) NOT NULL COMMENT 'Somente dígitos, com zeros iniciais; verificadores validados no servidor',
  nascimento DATE NOT NULL COMMENT 'Data civil de nascimento; idade é calculada na matrícula',
  telefone VARCHAR(11) NOT NULL COMMENT 'Telefone nacional com DDD, somente dígitos',
  email VARCHAR(150) NULL COMMENT 'Opcional; entrada vazia vira NULL, sem e-mail inventado',
  endereco VARCHAR(300) NOT NULL COMMENT 'Endereço completo informado; decomposição futura pode ser revista',
  inscricao_em DATE NOT NULL COMMENT 'Primeiro registro, separado da formalização da matrícula',
  treinou_antes BOOLEAN NOT NULL COMMENT 'Resposta explícita Sim ou Não; não inferir de campo ausente',
  experiencia VARCHAR(500) NULL COMMENT 'Local ou modalidade anterior, somente quando aplicável',
  ambiente_teste BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Marca explícita da homologação; limpeza futura exige prévia e aprovação',
  criado_por INT NOT NULL COMMENT 'Conta autenticada que registrou o aluno',
  criado_em TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT 'Instante de criação; conexão futura configurada em UTC',
  PRIMARY KEY (id), -- Chave usada por matrícula, emergência, saúde e documentos.
  CONSTRAINT ck_tbf_alunos_so_teste CHECK (ambiente_teste = 1), -- Esta etapa não aceita registros de produção nem remoção automática de testes.
  UNIQUE KEY uq_tbf_alunos_cpf (cpf), -- Impede dois alunos com o mesmo CPF; duplicidade deve gerar orientação genérica, sem mesclar dados.
  KEY ix_tbf_alunos_nome (nome), -- Apoia buscas administrativas por nome.
  CONSTRAINT ck_tbf_alunos_cpf_tamanho CHECK (CHAR_LENGTH(cpf) = 11), -- Formato numérico e verificadores também são exigidos no serviço.
  CONSTRAINT ck_tbf_alunos_telefone CHECK (CHAR_LENGTH(telefone) IN (10,11)), -- Aceita fixo e celular nacionais com DDD.
  CONSTRAINT fk_tbf_alunos_autor FOREIGN KEY (criado_por) REFERENCES professores(id) ON DELETE RESTRICT ON UPDATE RESTRICT -- Preserva autoria sem exclusão em cascata.
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Cadastro básico protegido por autorização no servidor';

-- Histórico de matrícula preserva o professor, plano, preço e faixa registrados naquele período.
CREATE TABLE tbf_matriculas (
  id CHAR(36) NOT NULL COMMENT 'UUID da matrícula; não reutilizar ao iniciar outra matrícula',
  aluno_id CHAR(36) NOT NULL COMMENT 'Aluno cadastrado a que a matrícula pertence',
  professor_id INT NOT NULL COMMENT 'Conta ativa com perfil professor, revalidada na mesma transação da inclusão',
  matricula_em DATE NOT NULL COMMENT 'Data de formalização; nascimento e inscrição são conferidos pelo serviço',
  aulas_semana TINYINT UNSIGNED NOT NULL COMMENT 'Frequência contratada: duas, três ou cinco aulas',
  mensalidade_centavos INT UNSIGNED NOT NULL COMMENT 'Preço histórico escolhido no servidor; não confiar em valor recebido do navegador',
  faixa ENUM('branca','amarela','vermelha','verde','azul','roxa','marrom','preta') NOT NULL COMMENT 'Graduação informada, sem promoção automática',
  situacao ENUM('ativo','inativo') NOT NULL COMMENT 'Situação cadastral independente da existência de dívida',
  necessita_responsavel BOOLEAN NOT NULL COMMENT 'Menor naquela data ou representação necessária explicitamente informada',
  aluno_ativo_id CHAR(36) GENERATED ALWAYS AS (CASE WHEN situacao='ativo' THEN aluno_id ELSE NULL END) STORED COMMENT 'Chave auxiliar para impedir duas matrículas ativas simultâneas do mesmo aluno',
  criado_por INT NOT NULL COMMENT 'Conta autenticada autora da matrícula',
  criado_em TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT 'Instante de criação em conexão UTC',
  PRIMARY KEY (id), -- Identidade independente do cadastro e das futuras cobranças.
  UNIQUE KEY uq_tbf_matriculas_ativa (aluno_ativo_id), -- Inativos podem manter múltiplos períodos de histórico; ativo é único.
  KEY ix_tbf_matriculas_professor (professor_id, situacao), -- Ajuda filtros operacionais; professores continuam autorizados a todos os alunos.
  KEY ix_tbf_matriculas_aluno (aluno_id, matricula_em), -- Apoia a consulta cronológica do histórico.
  CONSTRAINT ck_tbf_matriculas_frequencia CHECK (aulas_semana IN (2,3,5)), -- Evita frequência não prevista na etapa aprovada.
  CONSTRAINT ck_tbf_matriculas_valor CHECK (mensalidade_centavos > 0), -- Futuras condições especiais devem ser aprovadas antes de permitir valor zero.
  CONSTRAINT fk_tbf_matriculas_aluno FOREIGN KEY (aluno_id) REFERENCES tbf_alunos(id) ON DELETE RESTRICT ON UPDATE RESTRICT, -- Não remove histórico ao excluir uma referência.
  CONSTRAINT fk_tbf_matriculas_professor FOREIGN KEY (professor_id) REFERENCES professores(id) ON DELETE RESTRICT ON UPDATE RESTRICT, -- Existência é reforçada pelo banco; perfil e situação exigem conferência transacional.
  CONSTRAINT fk_tbf_matriculas_autor FOREIGN KEY (criado_por) REFERENCES professores(id) ON DELETE RESTRICT ON UPDATE RESTRICT -- Preserva autoria do ato.
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Histórico cadastral com preço preservado; não representa recebimento';

-- Emergência é um contato operacional e não comprova representação legal.
CREATE TABLE tbf_emergencias (
  aluno_id CHAR(36) NOT NULL COMMENT 'Aluno que possui este contato de emergência',
  nome_vinculo VARCHAR(150) NOT NULL COMMENT 'Nome e vínculo conforme a primeira versão do formulário',
  telefone VARCHAR(11) NOT NULL COMMENT 'Telefone nacional completo com DDD, somente dígitos',
  atualizado_por INT NOT NULL COMMENT 'Autor autenticado da última confirmação do contato',
  atualizado_em TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT 'Data da confirmação; mudanças devem gerar auditoria',
  PRIMARY KEY (aluno_id), -- Uma ficha de emergência corrente por aluno nesta proposta.
  CONSTRAINT ck_tbf_emergencias_telefone CHECK (CHAR_LENGTH(telefone) IN (10,11)), -- Validação completa também é feita no servidor.
  CONSTRAINT fk_tbf_emergencias_aluno FOREIGN KEY (aluno_id) REFERENCES tbf_alunos(id) ON DELETE RESTRICT ON UPDATE RESTRICT, -- Sem exclusão silenciosa em cascata.
  CONSTRAINT fk_tbf_emergencias_autor FOREIGN KEY (atualizado_por) REFERENCES professores(id) ON DELETE RESTRICT ON UPDATE RESTRICT -- Não perde o responsável pela atualização.
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Contato de emergência, separado do responsável legal';

-- Representação legal é vinculada à matrícula e à sua data, sem atribuir maioridade atual a atos antigos.
CREATE TABLE tbf_responsaveis_matricula (
  matricula_id CHAR(36) NOT NULL COMMENT 'Matrícula que exigiu responsável naquela ocasião',
  nome VARCHAR(150) NOT NULL COMMENT 'Nome informado pelo responsável legal',
  vinculo VARCHAR(100) NOT NULL COMMENT 'Relação ou fundamento da representação informado',
  documento_tipo ENUM('cpf','rg','outro') NOT NULL COMMENT 'CPF recebe máscara e verificadores; outros documentos preservam seu formato',
  documento VARCHAR(150) NOT NULL COMMENT 'Identificação restrita; CPF contém somente dígitos quando selecionado',
  telefone VARCHAR(11) NOT NULL COMMENT 'Contato completo com DDD, sem pontuação',
  PRIMARY KEY (matricula_id), -- Primeira versão mantém um responsável confirmado por matrícula; ampliação exige revisão.
  CONSTRAINT ck_tbf_responsaveis_telefone CHECK (CHAR_LENGTH(telefone) IN (10,11)), -- Aceita os dois formatos nacionais.
  CONSTRAINT fk_tbf_responsaveis_matricula FOREIGN KEY (matricula_id) REFERENCES tbf_matriculas(id) ON DELETE RESTRICT ON UPDATE RESTRICT -- Conserva o vínculo histórico e não gera dados quando responsável não é necessário.
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Responsável condicional e identificação privada por matrícula';

-- Saúde fica fora da consulta cadastral comum e do financeiro; leitura exige autorização específica e auditoria.
CREATE TABLE tbf_seguranca_matricula (
  matricula_id CHAR(36) NOT NULL COMMENT 'Matrícula em que as informações foram declaradas',
  tem_condicao BOOLEAN NOT NULL COMMENT 'Resposta explícita sobre condição relevante à prática',
  condicao_detalhes VARCHAR(500) NULL COMMENT 'Somente o detalhe necessário quando a resposta foi Sim',
  usa_medicamento BOOLEAN NOT NULL COMMENT 'Resposta explícita sobre medicamento relevante à atividade',
  medicamento_detalhes VARCHAR(500) NULL COMMENT 'Detalhe condicionado a Sim; não copiar para notas comuns',
  tem_lesao BOOLEAN NOT NULL COMMENT 'Resposta explícita sobre lesão ou restrição',
  lesao_detalhes VARCHAR(500) NULL COMMENT 'Restrição declarada quando aplicável',
  declarado_em DATE NOT NULL COMMENT 'Data da declaração; não confundir com diagnóstico ou avaliação clínica',
  registrado_por INT NOT NULL COMMENT 'Conta autenticada que registrou a declaração',
  PRIMARY KEY (matricula_id), -- Revisões posteriores precisarão preservar versões de declaração.
  CONSTRAINT fk_tbf_seguranca_matricula FOREIGN KEY (matricula_id) REFERENCES tbf_matriculas(id) ON DELETE RESTRICT ON UPDATE RESTRICT, -- Não exclui declarações por troca de professor ou inativação.
  CONSTRAINT fk_tbf_seguranca_autor FOREIGN KEY (registrado_por) REFERENCES professores(id) ON DELETE RESTRICT ON UPDATE RESTRICT -- Conserva autoria e separação de acesso.
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Dados restritos de segurança; não usar SELECT * em listas administrativas';

-- Registra apenas metadados; os arquivos ficam fora de public e do diretório substituído pelo build.
CREATE TABLE tbf_documentos_versoes (
  id CHAR(36) NOT NULL COMMENT 'UUID desta versão, usado nas consultas privadas autorizadas',
  documento_id CHAR(36) NOT NULL COMMENT 'Agrupa versões do mesmo documento lógico sem sobrescrever a anterior',
  matricula_id CHAR(36) NOT NULL COMMENT 'Matrícula a que o documento assinado pertence',
  versao INT UNSIGNED NOT NULL COMMENT 'Número crescente por documento lógico, conferido transacionalmente',
  tipo VARCHAR(50) NOT NULL COMMENT 'Tipo validado pelo servidor, como termo assinado ou ficha',
  objeto_privado VARCHAR(255) NOT NULL COMMENT 'Chave interna aleatória no armazenamento privado; não é URL pública',
  versao_armazenamento VARCHAR(255) NULL COMMENT 'Identificador de versão do provedor, quando disponível',
  mime VARCHAR(50) NOT NULL COMMENT 'Formato conferido por assinatura do arquivo, não apenas extensão',
  tamanho_bytes BIGINT UNSIGNED NOT NULL COMMENT 'Tamanho conferido antes de disponibilizar; limite depende da configuração aprovada',
  sha256 BINARY(32) NOT NULL COMMENT 'Hash do arquivo original para conferir integridade e restauração',
  assinado_em DATE NULL COMMENT 'Data informada da assinatura quando disponível; não inventar data ausente',
  estado ENUM('pendente','disponivel','falha','quarentena') NOT NULL COMMENT 'Só disponível após confirmar objeto, integridade e metadados',
  enviado_por INT NOT NULL COMMENT 'Conta autenticada responsável pelo envio',
  criado_em TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT 'Instante de recebimento dos metadados em UTC',
  PRIMARY KEY (id), -- Download futuro usa esta chave depois de verificar a sessão.
  UNIQUE KEY uq_tbf_documentos_versao (documento_id,versao), -- Substituição cria nova versão sem sobrescrita silenciosa.
  UNIQUE KEY uq_tbf_documentos_objeto (objeto_privado), -- Um objeto imutável não pode ser reaproveitado por duas versões.
  KEY ix_tbf_documentos_matricula (matricula_id,estado), -- Lista metadados disponíveis somente após autorização.
  CONSTRAINT ck_tbf_documentos_versao CHECK (versao > 0), -- Não admite numeração zero ou negativa.
  CONSTRAINT ck_tbf_documentos_tamanho CHECK (tamanho_bytes > 0), -- Arquivo vazio não representa documento assinado.
  CONSTRAINT fk_tbf_documentos_matricula FOREIGN KEY (matricula_id) REFERENCES tbf_matriculas(id) ON DELETE RESTRICT ON UPDATE RESTRICT, -- Inativação não exclui documentos.
  CONSTRAINT fk_tbf_documentos_autor FOREIGN KEY (enviado_por) REFERENCES professores(id) ON DELETE RESTRICT ON UPDATE RESTRICT -- Conserva a autoria do envio.
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Metadados e versões; backup exige também os objetos privados correspondentes';

-- Auditoria registra o ato sem copiar documentos, CPF integral, telefones ou respostas de saúde.
CREATE TABLE tbf_auditoria_alunos (
  id CHAR(36) NOT NULL COMMENT 'UUID imutável do evento de auditoria',
  ator_id INT NOT NULL COMMENT 'Conta autenticada que realizou o ato autorizado',
  alvo_id CHAR(36) NOT NULL COMMENT 'Identificador interno do aluno, matrícula ou versão do documento',
  entidade VARCHAR(30) NOT NULL COMMENT 'Tipo de entidade escolhido de lista fechada no servidor',
  acao VARCHAR(40) NOT NULL COMMENT 'Criação, edição, mudança de situação ou acesso restrito, sem payload pessoal',
  instante TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT 'Instante em conexão UTC',
  PRIMARY KEY (id), -- Eventos não são sobrescritos por outra operação.
  KEY ix_tbf_auditoria_alvo (alvo_id,instante), -- Permite conferir cronologia sem pesquisar dados pessoais.
  KEY ix_tbf_auditoria_ator (ator_id,instante), -- Apoia investigação de atos por conta autorizada.
  CONSTRAINT fk_tbf_auditoria_ator FOREIGN KEY (ator_id) REFERENCES professores(id) ON DELETE RESTRICT ON UPDATE RESTRICT -- Impede remoção silenciosa da autoria.
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Registro de atos sem cópia de conteúdo pessoal ou financeiro';

-- PERMISSÕES PROPOSTAS: visitantes e contas inativas não acessam estas tabelas pela aplicação.
-- Professores ativos podem cadastrar/consultar todos os alunos, conforme decisão do usuário; administradores mantêm acesso geral.
-- Saúde e documentos exigem funções específicas do servidor e eventos de auditoria; nunca compor consultas financeiras com essas tabelas.
-- Banco não utiliza RLS neste modelo: cada operação deverá validar sessão e perfil no serviço; não fornecer credencial SQL ao navegador.
-- Adaptador de gravação ainda não implementado: transação deve revalidar ator/professor e gravar aluno, matrícula, vínculos e auditoria atomicamente.
-- Não usar contas de aplicação com privilégio de DDL; criação das tabelas exige execução operacional separada e aprovada.
-- Não há GRANT, DROP, ALTER, DELETE nem INSERT de pessoas neste documento. Nenhuma instrução foi executada.
