# Faixa Marrom, ranking e próximo cadastro — 22/10/2026

## Ajuste entregue

A sétima graduação usa o nome **Marrom**, o identificador fictício `marrom` e a cor `#8B4513`, com texto branco. A mudança foi centralizada no catálogo de faixas do protótipo e do site principal, propagando-se a cartões, alunos, pagamentos, relatórios e ranking. Os doze meses de referência e a posição imediatamente anterior à preta foram preservados. Nenhuma tabela ou registro real foi alterado.

O **Ranking de atletas** aparece abaixo dos oito cartões de Graduações, antes do rodapé. Ele contém três ordenações:

- **Mais lutas**: total de participações concluídas em ordem decrescente.
- **Vitórias por luta**: vitórias divididas pelo total de vitórias, derrotas e empates. Sem mínimo de participações presumido. Quem não lutou aparece por último com “Sem lutas”.
- **Hierarquia de faixa**: preta, marrom, vermelha, azul, verde, laranja, amarela e branca. Graduação não comprova resultado competitivo e não é promovida automaticamente.

A tabela mostra posição, atleta, faixa, lutas, vitórias, derrotas, empates e percentual de vitórias. Empates no critério são ordenados por vitórias, total de lutas, faixa, nome e identificador. Essa regra serve apenas para a demonstração; um regulamento de ranking real continua dependente de validação. A comparação de percentuais usa frações antes do arredondamento visual.

Todos os resultados são fictícios e explicitamente identificados. Uma participação tem identificador único, aluno vinculado por ID e resultado vitória/derrota/empate. Não há gravação de lutas reais nesta entrega. Participação de atleta inativo continua no histórico demonstrativo; inatividade não apaga resultados anteriores.

## Código e verificações

No principal: `lib/demonstracao/ranking.ts`, `app/dashboard/_components/ranking-atletas.tsx`, `ranking.css`, integração em `gestao-demonstracao.tsx`, catálogo e fixtures. No protótipo: arquivos equivalentes em `src/lib` e `src/components`. Todas as linhas de lógica e estilos criados possuem comentários adjacentes em português.

- Site principal: 59 testes passaram, incluindo 5 cenários novos de ranking e faixa Marrom, além das regras anteriores de contas, senhas, financeiro e navegação.
- Protótipo: 17 testes passaram. O caso de frações com o mesmo percentual arredondado também foi verificado na suíte do principal.
- TypeScript, ESLint dos arquivos envolvidos no principal e compilações de produção dos dois projetos concluídos.
- 28 verificações HTTP da versão compilada com contas e banco fictícios passaram novamente.
- Navegador: Marrom na lista de alunos e nos cartões; Gabriela lidera Mais lutas com 15 participações, Elisa lidera Vitórias por luta com 6/7 = 85,7%, Hugo lidera Hierarquia por estar na preta, continuando com “Sem lutas”.
- Evidência visual em `tmp/verificacao/ranking-marrom.png`.

Não foram excluídos arquivos ou dados. Não houve migração, importação ou alteração de registros reais. Cópias dos fontes anteriores à alteração do principal ficam em `tmp/ranking/antes` nesta pasta.

## Próxima entrega: cadastro real de alunos com documentos assinados

O usuário confirmou nesta conversa a inclusão de um campo de **anexos para documentos assinados pelos alunos**. O cadastro real e o upload ainda não estão implementados; são o próximo módulo após a validação do ranking.

A prévia do cadastro deverá contemplar os campos já levantados: nome, CPF, nascimento, telefone, endereço, e-mail opcional, professor, plano, faixa, datas distintas de inscrição e matrícula, situação, experiência anterior, contato de emergência, responsável quando aplicável e os anexos assinados. Campos de saúde e dados de menores continuam sujeitos ao acesso restrito especificado, sem expor essas informações em observações comuns.

Estrutura planejada de documentos:

- O MySQL guarda o vínculo do documento com aluno/matrícula, tipo, versão, tamanho, MIME conferido, data e autor do envio, data da assinatura quando informada, estado de conferência, identificador interno do arquivo e hash SHA-256.
- O arquivo PDF/JPEG/PNG fica em armazenamento privado e persistente, fora de `public`, das pastas temporárias e dos diretórios substituídos pelo build. O banco aponta para seu identificador privado; não expõe um endereço público permanente.
- Upload, leitura e download verificam a sessão e a permissão no servidor. O nome original não determina o caminho interno. Limites de tamanho, assinatura do formato e integridade serão verificados antes de disponibilizar o documento.
- Substituições criam versões; falhas entre gravação do arquivo e metadados não podem produzir confirmação falsa de documento disponível.
- Banco e arquivos exigem cópias independentes e teste de restauração antes do uso de documentos reais. A cópia no computador de desenvolvimento não constitui, sozinha, um serviço de armazenamento definitivo.

Antes de qualquer migração no `team_black_fighter`, apresentar as tabelas, vínculos, permissões e local de armazenamento propostos para validação explícita. Ainda é necessário definir quem poderá consultar alunos e documentos de cada professor e o ambiente definitivo onde o sistema ficará. Não há data de entrega fechada para persistência e documentos antes dessa definição; o próximo passo é a prévia revisável do cadastro e da estrutura de dados.
