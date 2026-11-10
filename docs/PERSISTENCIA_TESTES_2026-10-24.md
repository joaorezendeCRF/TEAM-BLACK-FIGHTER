# Estado da etapa de testes — 24/10/2026

> Atualização de 29/10/2026: planos personal e edição de ficha foram implementados e testados com banco fictício. A ativação no banco atual aguarda execução manual do SQL. Consulte [PLANOS_E_EDICAO_2026-10-29.md](PLANOS_E_EDICAO_2026-10-29.md). O texto abaixo registra a entrega original de 24/10.

O projeto utilizado pelo proprietário está em `C:\Projetos\team-black-fighter`. A pasta anterior no OneDrive conserva os primeiros documentos e o protótipo. Não houve publicação ou contratação de hospedagem.

## Banco atual e decisões confirmadas

O usuário autorizou criar no MySQL atual as sete tabelas de cadastro e, em seguida, pediu logs técnicos. A conta da aplicação não tinha permissão CREATE. A tentativa foi recusada antes da primeira criação. Foram entregues `CRIAR_TABELAS_CADASTRO.sql` e `CRIAR_LOGS_SISTEMA.sql` para execução pelo usuário no Workbench. A conferência posterior encontrou as oito tabelas. O modo `TBF_CADASTROS_TESTE=1` foi então ativado sem modificar DATABASE_URL ou SESSION_SECRET.

Professores ativos podem cadastrar e consultar todos os alunos. Administradores mantêm acesso geral. Logs técnicos são exclusivos do administrador principal. Dados reais, importação de Excel, migração adicional, limpeza e publicação continuam sujeitos às regras permanentes do projeto.

## Alunos e matrícula

O formulário mantém máscaras, revisão, e-mail opcional, responsável condicional pela idade na data da matrícula, perguntas explícitas e professor ativo escolhido por ID. O servidor valida novamente os campos, os limites das colunas, CPF, telefones, plano, faixa e datas. Os preços históricos vêm do catálogo no servidor.

Aluno, matrícula, emergência, responsável aplicável, segurança e auditoria são inseridos na mesma transação. Autor e professor são revalidados sob bloqueio. Qualquer falha reverte a matrícula inteira. Saúde, CPF e contatos não participam da lista comum enviada ao navegador. Não há edição ou exclusão de aluno nesta entrega.

Quando o usuário pediu manter os exemplos, foram salvos os oito alunos fictícios já apresentados: Ana, Bruno, Carla, Diego, Elisa, Felipe, Gabriela e Hugo Exemplo, com planos, faixas e situações anteriores. Os demais campos desses exemplos são marcadores sintéticos, não informações inferidas sobre pessoas reais. O resultado confirmado foi 8 matrículas, 7 ativas e 1 inativa. Nenhuma conta de acesso foi alterada e nenhum cadastro existente foi removido ou mesclado.

O script de inclusão reconhece os identificadores sintéticos dos exemplos numa repetição, preserva o registro inteiro e recusa conflitos sem atualizar dados existentes. Não existe limpeza automática desses testes.

## Edição de usuários

Edição permite corrigir nome, login e e-mail com reconfirmação da senha do autor. Administrador comum pode editar professores; o principal pode editar professores e administradores comuns. A própria conta e todos os principais continuam protegidos.

Mudança de perfil é exclusiva do principal. Promoção de professor exige uma nova senha que satisfaça a política administrativa existente. Não há promoção a principal pela interface. Senha de uma edição comum é preservada. Autor, hash reconfirmado, alvo e versão dos dados são conferidos outra vez dentro da transação, prevenindo sobrescrita por formulário antigo. Alterar login invalida a identificação da sessão antiga pela verificação já existente.

## Documentos ao selecionar o aluno

Selecionar o nome ou “Ver anexos” abre a ficha correspondente, traz o painel para a área visível e consulta o histórico pelo servidor autenticado. São aceitos PDF, PNG e JPEG, até 5 MiB por arquivo, com corpo multipart limitado, origem conferida e confirmação de conteúdo fictício. A identificação de formato por assinatura não equivale a varredura antimalware ou validação jurídica.

Cada envio reserva uma versão sob bloqueio da matrícula. Objetos têm nome aleatório, criação exclusiva e não sobrescrevem versões anteriores. O estado só passa a disponível depois de conferir tamanho e SHA-256 do original e da segunda cópia. Interrupções e falhas deixam metadados pendentes ou de falha para reconciliação; objetos não são apagados silenciosamente. A abertura exige sessão atual, estado disponível, hash e tamanho corretos, e registra auditoria. As respostas impedem cache e interpretação como conteúdo ativo da aplicação. Não há URL pública permanente.

As pastas locais foram configuradas fora do código e de `public`, com acesso restrito ao usuário atual do Windows e SYSTEM. Há duas raízes locais distintas. Elas ficam no mesmo computador e **não substituem backup externo independente** contra falha da máquina. A recuperação de bytes de teste pela segunda origem foi exercitada após perda e corrupção da principal. Backup consistente do banco, cópias externas, restauração do conjunto completo, retenção, reconciliação operacional e proteção antimalware precisam ser concluídos antes de liberar documentos reais na hospedagem futura.

O arquivo enviado não é automaticamente considerado assinado ou juridicamente conferido. A tela indica “assinatura não conferida”.

## Logs técnicos e auditoria

“Gerenciar Usuários → Logs do sistema” apresenta os 100 eventos técnicos mais recentes. O acesso direto é igualmente restrito ao principal. Nesta etapa, o registrador foi conectado às novas operações de cadastro, edição e documentos; isto não representa cobertura automática de todos os fluxos antigos da aplicação.

Somente data, nível, operação interna, código de uma lista fechada e referência aleatória são persistidos. Mensagem crua, stack, SQL, formulário, CPF, contato, saúde, conteúdo do arquivo, credenciais e chaves privadas não entram no registro. Códigos desconhecidos viram um marcador genérico. Falha de banco utiliza arquivo JSONL privado; se esse fallback também falhar, o console recebe exclusivamente os mesmos campos seguros. Os arquivos de fallback não são automaticamente reenviados ao banco e não aparecem na tela enquanto o banco estiver indisponível.

Um aviso `TESTE_CONTROLADO`, operação `teste_diagnostico`, foi gravado e lido no MySQL atual e conferido na interface. É uma verificação explícita, sem provocar erro real. Auditoria cadastral e de documentos fica em tabela separada e registra ato/autoria sem payload pessoal. Não há exclusão de eventos pela interface nem retenção automática nesta entrega.

## Verificação e limites

- 96 testes de regras, máscaras, autorização, edição, transações, arquivos e sanitização passaram.
- Compilação de produção e TypeScript concluíram.
- 32 verificações HTTP dos perfis e rotas anteriores passaram com driver fictício isolado.
- 13 verificações HTTP adicionais passaram: sessão, origem, formato, limite, versões preservadas, bytes, cabeçalhos, recuperação e bloqueio de logs para professor.
- Edição de nome e cadastro pelo formulário foram concluídos na interface com contas e banco inteiramente fictícios. Nenhuma conta real foi editada durante os testes.
- Lista com oito alunos, consulta de anexos vazios por seleção e evento técnico foram conferidos no sistema local usando os registros de teste autorizados.

Pagamentos, relatórios e histórico esportivo continuam demonstrativos em memória. Os cadastros novos ainda não alimentam esses módulos. Persistência financeira, estornos auditáveis, cobranças recorrentes e persistência de lutas exigem a próxima estrutura e integração, com revisão antes de qualquer migração adicional. O aviso está visível na tela. Validar a interface não equivale a liberar dados pessoais reais ou a concluir a operação em produção.
