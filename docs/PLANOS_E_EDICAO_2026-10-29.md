# Planos personal e edição de ficha — 29/10/2026

## Entrega local

O projeto alterado é `C:\Projetos\team-black-fighter`. Nenhuma migração, importação, atualização ou exclusão foi executada no banco atual durante esta entrega. O SQL aguarda execução manual no Workbench, seguindo a preferência já expressa pelo usuário. A aplicação verifica a estrutura por metadados, sem criá-la automaticamente.

| Plano mensal | Normal | Personal |
| --- | ---: | ---: |
| 2x por semana | R$ 70,00 | R$ 240,00 |
| 3x por semana | R$ 80,00 | R$ 360,00 |
| 5x por semana | R$ 120,00 | R$ 600,00 |

Os rótulos ficam, por exemplo, “2x por semana normal” e “2x por semana personal”. O catálogo `lib/planos.ts` é compartilhado pela interface, validação e persistência. Preço não é um campo livre aceito do navegador. Frequência e modalidade são gravadas separadamente.

## Liberar no banco atual

1. Revisar `docs/ATUALIZAR_PLANOS_E_EDICAO.sql` e manter backup restaurável do banco antes da alteração estrutural.
2. Executar esse arquivo uma vez no Workbench com a conta administrativa, como nas tabelas anteriores. Ele acrescenta `versao_ficha` no aluno, `modalidade` na matrícula e a tabela privada `tbf_fichas_revisoes`, além de conceder SELECT/INSERT nessa nova tabela à conta atual do site. Não altera contas, preços contratados ou arquivos. O padrão dos registros anteriores é normal, versão inicial 1.
3. Se houver falha parcial, conferir colunas e tabela antes de repetir os ALTER TABLE. DDL no MySQL não é uma única transação reversível. A aplicação só libera a edição depois de encontrar as duas colunas e a tabela de histórico. Permissões insuficientes continuam produzindo falha segura com referência técnica.
4. Atualizar a página Alunos. A estrutura é conferida a cada carregamento, sem necessidade de reinstalar dependências. Em modo de produção, gerar a nova compilação e iniciar o sistema; em desenvolvimento, reiniciar caso o servidor ainda esteja com a configuração anterior.

Enquanto o SQL estiver pendente, o cadastro dos planos normais e a consulta dos anexos continuam funcionando. Personal aparece identificado, mas desabilitado; Editar ficha também fica desabilitado e o aviso explica a pendência. A ausência do SQL não faz os alunos sumirem.

## Edição

Alunos → Editar ficha carrega somente a matrícula selecionada, com autenticação atual e auditoria de acesso. Professores ativos podem editar todos os alunos, conforme a decisão do usuário; os administradores também têm acesso. A leitura não envia CPF, contatos ou saúde dos demais alunos ao navegador. A edição permanece limitada aos registros marcados como fictícios nesta etapa.

Todos os campos do formulário são editáveis: identificação, nascimento, contatos do aluno, e-mail opcional, endereço, datas, professor, emergência, plano, situação ativo/inativo, faixa, experiência, responsável condicional, condições relevantes, medicamentos e lesões/restrições. Máscaras e validações são reaproveitadas. Menor na data da matrícula continua exigindo responsável. Um professor inativo pode ser conservado no vínculo existente; trocar o professor exige uma conta ativa com perfil professor.

Trocar o plano mostra o novo valor imediatamente e calcula o preço outra vez no servidor ao salvar. Alterar telefone, faixa ou qualquer outro campo sem trocar o plano conserva o valor contratado, inclusive se diferente do catálogo atual. Nenhuma cobrança ou recebimento anterior é recalculado. Não existe data de vigência financeira retroativa nesta etapa.

Salvar exige revisar a ficha e confirmar os dados fictícios. O servidor bloqueia o aluno e a matrícula, revalida o autor, compara a versão, valida novamente o conteúdo, grava a ficha anterior no histórico privado e atualiza os grupos vigentes na mesma transação. Uma edição obsoleta ou falha em qualquer grupo reverte toda a tentativa. Cada edição concluída incrementa a versão por aluno, inclusive para impedir concorrência entre matrículas dele.

O histórico privado inclui a ficha anterior e o preço; contém dados restritos como as tabelas cadastrais, não é log técnico. Não é retornado à lista nem disponibilizado como arquivo público. A interface de navegação ou restauração dessas revisões não faz parte desta entrega; eventual recuperação deve passar por autorização e auditoria. Não há atualização ou exclusão de revisões pela conta do site. A tabela precisa acompanhar backups, controle de acesso e a futura política de retenção de dados pessoais.

Dispensar representação de um adulto desmarca o vínculo vigente; a ficha anterior é preservada e não é executado DELETE do responsável. As datas originais de criação, UUIDs, anexos e versões dos documentos continuam vinculados à mesma matrícula. CPF duplicado ou duas matrículas ativas do mesmo aluno são bloqueados pelas restrições atuais. Confirmação de sucesso permanece visível por cinco segundos.

## Logs e limites

As operações `consultar_ficha` e `editar_aluno` usam o sanitizador técnico existente; auditoria registra ato/autoria sem payload. A configuração documentada `logging.serverFunctions: false` impede o Next.js de imprimir os argumentos completos dessas ações no terminal de desenvolvimento. A cobertura de logs antigos de autenticação continua conforme a etapa anterior.

Pagamentos, relatórios, lutas e ranking permanecem demonstrativos, sem integração automática dos alunos persistidos. Os exemplos dessas telas agora identificam seus planos como normal. Os novos valores e alterações da matrícula não geram cobrança nem recebimento. Hosting, limpeza de testes, dados reais e migrações adicionais continuam fora desta entrega.

## Verificação

- Compilação de produção e TypeScript passaram.
- 114 testes de regras e transações passaram, incluindo criação dos seis planos, compatibilidade com esquema antigo, troca para cada personal, conservação do preço, validação, revogação de conta, concorrência, histórico, rollback e liberação de conexão.
- 32 verificações HTTP de perfis/rotas e 13 de anexos passaram usando driver e contas fictícias em processo separado.
- Edição completa foi concluída no navegador do ambiente isolado: normal para personal 3x/R$ 360,00, faixa Roxa, Inativo, contato/endereço, responsável, medicamento e lesão. Reabertura confirmou os campos salvos; os dois anexos anteriores permaneceram disponíveis. Não houve alteração de alunos ou contas do banco atual.
- A nova migração não foi executada nem testada no MySQL atual; sua aplicação manual é a pendência de ativação.
