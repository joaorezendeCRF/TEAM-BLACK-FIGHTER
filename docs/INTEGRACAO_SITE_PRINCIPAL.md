# Integração ao site principal — 22/10/2026

A integração autorizada foi aplicada em `C:\Projetos\team-black-fighter`. Esta pasta de documentação e o protótipo independente continuam preservados. O sistema principal mantém Next.js 16.4.2, React 19.3.0, TypeScript, Tailwind CSS, MySQL2 e Argon2id, sem troca de versões ou instalação de dependências.

## Entrega desta etapa

- Menu comum em `/dashboard` e suas páginas, incluindo Gerenciar Usuários somente para administradores.
- Endereços próprios: `/dashboard/alunos`, `/dashboard/graduacoes`, `/dashboard/pagamentos`, `/dashboard/relatorios`.
- A entrada original `/dashboard`, usada pelo login existente, abre Alunos.
- Sessão e situação ativa verificadas no servidor pelo serviço de autorização existente. Cada página de módulo verifica novamente a autorização, pois o roteador pode reutilizar layouts.
- Gerenciar Usuários conserva suas verificações de administrador e os controles exclusivos do principal. Somente o enquadramento visual foi adaptado ao menu compartilhado.
- Alunos e financeiro usam exclusivamente os oito exemplos fictícios, separados em `lib/demonstracao`. O aviso explica que simulações reiniciam ao recarregar ou trocar de tela. Nenhuma tabela de aluno ou financeiro foi criada.
- Os temas branco e preto dos módulos ficam restritos ao seu contêiner. A navegação comum mantém preto, branco e grafite. Selos de matrícula ativa/inativa são verdes/vermelhos; as oito cores de faixa são preservadas.
- O documento identifica o sistema em português brasileiro. A marcação de tema próprio reaproveita a proteção visual do protótipo contra recoloração por extensões compatíveis.
- Código reaproveitado e criado possui comentários adjacentes em português, inclusive propriedades de CSS. Dependências e arquivos gerados não foram tratados como código autoral.

## Arquivos principais no site com login

- `app/dashboard/layout.tsx`: estrutura autenticada e menu em Tailwind.
- `app/dashboard/_components/menu-gestao.tsx`: links e destaque acessível da rota.
- `app/dashboard/_components/pagina-gestao.tsx`: autorização de cada página dentro de Suspense.
- `app/dashboard/_components/gestao-demonstracao.tsx` e `gestao.css`: telas, filtros, recebimentos simulados, histórico e impressão.
- `lib/navegacao-gestao.ts`: catálogo de destinos por perfil.
- `lib/demonstracao/billing.ts` e `demo.ts`: regras financeiras e fixtures sem registros reais.
- `next.config.ts`: MySQL2 carregado como dependência externa do servidor. A conexão normal continua a mesma; o teste isolado consegue substituir o driver sem acessar o banco existente.

As versões anteriores dos arquivos alterados estão em `tmp/integracao/antes` nesta pasta. Não houve exclusão de arquivos, alteração de credenciais, migração, importação, alteração ou remoção de dados reais.

## Verificações executadas

- 54 testes passaram: 39 de contas e senhas existentes, 12 financeiros reaproveitados e 3 de navegação por perfil.
- Compilação de produção, TypeScript e ESLint dos arquivos envolvidos concluídos.
- `node scripts/verificar-integracao.mjs`: 28 verificações HTTP do aplicativo compilado, com segredo de sessão temporário e contas fictícias. O apoio substitui MySQL2 somente no processo de teste e rejeita qualquer instrução que não seja SELECT de contas fictícias. Uma conexão fictícia na porta 1 impede alcançar o banco real mesmo se a substituição falhar.
- Cenários HTTP: acesso anônimo aos seis endereços, login Argon2id e cinco páginas para os três perfis ativos, acesso administrativo direto, controles exclusivos do principal, logout e recusa de conta inativa.
- No navegador: login fictício, menu integrado, gerenciamento de contas, oito graduações e quitação de Carla Exemplo em 20/10/2026. A tela mostrou Pago, próximo vencimento em 05/11/2026 e resumo mensal atualizado. Navegar para outra seção e voltar limpou busca, mensagem e simulação.
- Evidência visual: `tmp/verificacao/integracao-graduacoes.png`. A revisão visual usa fixtures e nunca os usuários reais do banco.

Os testes não validam um cadastro real de alunos ou persistência financeira: esses serviços ainda não foram implementados.

## Ranking de atletas: atualização posterior

O usuário confirmou a implementação após testar a integração. O ranking e a nomenclatura Marrom foram entregues conforme detalhado em `RANKING_E_DOCUMENTOS.md`. O registro abaixo documenta a base da proposta, sem substituir as regras de demonstração efetivamente implementadas:

- Posicionar abaixo dos oito cartões de Graduações.
- Oferecer ordenação por total de lutas, percentual de vitórias e hierarquia de faixa.
- Mostrar atleta, faixa, lutas, vitórias, derrotas, empates e aproveitamento.
- Calcular aproveitamento como vitórias divididas pelo total de lutas definido. Exibir “Sem lutas” para quem não possui resultados, evitando divisão por zero ou desempenho inventado.
- Antes do uso real, definir quais lutas entram (oficiais/amistosas, resultado sem decisão, período, categorias), critérios de desempate, possível mínimo de lutas para percentual e quem pode registrar ou corrigir resultados.
- Hierarquia de faixa representa graduação; não comprova desempenho competitivo nem executa promoção automática.
- A demonstração pode usar somente lutas fictícias identificadas. Ranking real dependerá de cadastro e histórico de lutas, resultados, permissões e persistência aprovados.

O cadastro real de alunos continua dependente da confirmação dos campos adicionais pelo usuário e da prévia de tabelas e permissões. Não executar migrações no banco existente antes da validação explícita.
