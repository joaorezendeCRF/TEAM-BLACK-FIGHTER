# Cadastro definitivo: proposta para revisão — 23/10/2026

## Decisões já confirmadas

- Professores poderão acessar todos os alunos. Administradores mantêm acesso geral. Visitantes, contas inativas e perfis desconhecidos continuam bloqueados.
- O destino previsto é um servidor na internet. Hospedagem, contratação e publicação serão tratadas futuramente; nada foi contratado ou publicado.
- O formulário permanece demonstrativo. Nenhuma alteração ou migração no banco existente foi executada.

## O que esta etapa entrega

Máscara de CPF `000.000.000-00` e telefones com DDD nos formatos fixo e celular. Todas as entradas correspondentes usam o mesmo componente: aluno, emergência e responsável. A identificação do responsável ganhou tipo CPF/RG/Outro, para não aplicar máscara de CPF a um RG. A máscara limita o preenchimento, aceita colagem, preserva zeros iniciais e mantém o cursor ao editar. A prévia exige quantidades completas de dígitos; isso não comprova identidade.

A camada futura de servidor já foi preparada e testada com dependências fictícias: autorização de professores e administradores, CPF com verificadores, normalização sem pontuação, telefone completo, professor ativo por ID, plano/faixa/situação válidos, e-mail opcional, responsável condicional e separação das informações de saúde. Esse código não possui rota de gravação ou adaptador SQL. A configuração desligada bloqueia qualquer consulta ou escrita. A tela ainda não está conectada a ele: professores no formulário continuam como texto fictício até a integração do seletor com contas.

## Estrutura proposta

| Parte | Finalidade |
|---|---|
| `tbf_alunos` | Identidade, contato e inscrição; CPF único, sem mesclar automaticamente pessoas |
| `tbf_matriculas` | Professor, data, plano/preço histórico, faixa e situação; uma matrícula ativa por aluno |
| `tbf_emergencias` | Contato de emergência corrente, separado do vínculo legal |
| `tbf_responsaveis_matricula` | Responsável quando necessário na data da matrícula; CPF, RG ou outro documento |
| `tbf_seguranca_matricula` | Respostas de saúde/restrição separadas das listas comuns e das cobranças |
| `tbf_documentos_versoes` | Vínculo, versão, integridade e estado de arquivos privados |
| `tbf_auditoria_alunos` | Quem fez cada ato e quando, sem copiar conteúdo pessoal para o histórico |

O SQL comentado está em `cadastro-alunos.proposta.sql` ao lado deste documento. É uma proposta, não uma migração executada. Metadados foram lidos apenas para confirmar compatibilidade: MySQL 8.0.45, InnoDB, chave `professores.id` do tipo INT e perfis existentes. Não foram consultados nomes, CPFs, contatos, saúde ou hashes de pessoas. Os nomes `tbf_` propostos não existiam na verificação de metadados.

Não haverá exclusão de histórico em cascata. Cadastro e matrícula devem ser gravados juntos, com conferência da conta autora e do professor na mesma transação. Preço vem da configuração do servidor, nunca de um valor enviado pelo navegador. Essa etapa não cria cobranças, pagamentos ou estornos; a integração financeira permanece separada.

## Acesso e documentos

Todos os professores ativos poderão consultar e cadastrar todos os alunos. Saúde e anexos continuam em rotas/funções específicas protegidas no servidor, com auditoria e sem aparecer no financeiro. Não haverá URL pública permanente para documentos. Campos de matrícula de menores devem preservar responsável e data de referência; idade atual não altera retrospectivamente a representação necessária.

Antes de receber documentos reais, implementar verificação de tipo/tamanho, nome interno aleatório, armazenamento privado persistente fora de `public`, versões imutáveis, conferência de hash e reconciliação de falhas entre arquivo e banco. Definir cópias independentes de banco e arquivos e testar restauração. Hospedar um site, por si só, não conclui essas proteções. Política de retenção e detalhes do fornecedor continuam pendentes; não há promessa de perda impossível ou retenção eterna.

## Próxima execução, após validação

1. Validar esta estrutura e a matriz de acesso apresentada.
2. Preparar backup restaurável e executar a criação aprovada primeiro em um banco separado de homologação, verificando tabelas, restrições, permissões e reversão.
3. Implementar adaptador transacional, seletor de professores por ID, autorização por operação e auditoria; ligar inicialmente apenas em homologação com dados fictícios.
4. Implementar armazenamento privado e ensaio de restauração. Somente após homologação e autorização operacional liberar dados reais no ambiente definido.

A regra permanente que exige esta validação está no AGENTS.md da pasta de trabalho: “Não executar migrações em banco existente sem validação.” Esta entrega não interpreta o pedido de avançar como aprovação automática para criar tabelas em um banco com dados existentes.

## Verificação da etapa

82 testes passaram e a compilação de produção concluiu. Incluem máscara progressiva, CPF/telefones com limites, colagem sobre seleção, cursor, CPF matemático, acesso de professores, rejeição de sessão ausente, normalização de saúde e bloqueio de persistência desligada. Os testes usam números sintéticos gerados ou sequências explicitamente inválidas, sem copiar os dados dos anexos do usuário. SQL proposto não foi executado nem validado por criação de tabelas nesta etapa.
