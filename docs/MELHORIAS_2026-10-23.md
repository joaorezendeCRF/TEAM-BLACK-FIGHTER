# Melhorias do sistema principal — 23/10/2026

Entrega aplicada em `C:\Projetos\team-black-fighter`, a versão com login utilizada pelo usuário. A pasta do protótipo no OneDrive recusou novos arquivos nesta sessão; fontes preparados, cópias anteriores e evidências ficaram na pasta `melhorias-23` desta entrega, fora do OneDrive. Nenhum dado real foi importado ou alterado. Não foram executadas migrações.

## Comportamentos entregues

- Gerenciar Usuários ganhou seletor de fundo branco/preto, com sol/lua e a mesma preferência `tbf-gestao-theme` das outras telas. A autorização, a consulta e as ações de contas continuam no servidor.
- Criar usuário ganhou ícone de adição, orientação e seta de abertura. A validação e as permissões existentes foram preservadas.
- Confirmações de lutas e de pagamentos desaparecem após cinco segundos. Uma confirmação nova recebe o prazo completo mesmo se repetir o texto. Erros de validação não expiram.
- Cancelar luta é amarelo e solicita justificativa obrigatória, com até 500 caracteres. Uma luta pendente, inclusive futura, pode ser cancelada; resultado concluído não pode ser apagado por cancelamento.
- Lutas canceladas preserva atleta, adversário, data originalmente prevista, local, dia do cancelamento e motivo. Não inclui o cancelamento em lutas concluídas, vitórias ou derrotas.
- A seleção de atleta tem busca por nome sem diferenciar caixa e acentuação. O agendamento exige selecionar um aluno conhecido por ID, além do texto pesquisado.
- A visita começa com seis confrontos fictícios adicionais: duas próximas lutas, três resultados e um cancelamento justificado. Os resultados são somados ao histórico fictício anterior do ranking; nenhuma participação é duplicada por troca de tela. Hugo permanece sem resultados para exemplificar Nunca lutaram.
- Derrotas por luta aparece ao lado de Vitórias por luta. Classifica do maior para o menor percentual de derrotas sobre todas as participações concluídas. Quem nunca lutou aparece por último, sem divisão por zero. A tabela também mostra o percentual de derrotas.
- Menu administrativo: Alunos, Graduações, Registro de lutas, Pagamentos, Gerenciar Usuários, Relatórios. Professores mantêm apenas as opções já autorizadas e Relatórios fica por último.
- Histórico de recebimentos ganhou Atraso no pagamento: Sem atraso ou Sim e a quantidade de dias. Usa o vencimento preservado e a data daquele recebimento, inclusive para parciais; não usa a data atual para aumentar um atraso histórico.
- A opção Alerta pulsando foi corrigida: o seletor anterior procurava a classe em um descendente, mas ela fica no próprio contêiner. O ponto vermelho agora recebe `late-pulse` quando a opção está ligada e perde a animação ao desmarcar. Preferência por movimento reduzido continua prevalecendo. É um aviso visual interno.

## Verificações

69 testes automatizados passaram, incluindo justificativa obrigatória, proteção de resultados, imutabilidade, exclusão de cancelamentos do ranking, exemplos na virada de ano e ordenação exata do percentual de derrotas. TypeScript e compilação de produção concluídos. As 32 verificações HTTP passaram com contas fictícias e banco de teste bloqueado para escrita.

No navegador foram conferidos branco/preto em usuários, abertura do cadastro sem envio, menu, busca de Hugo, agendamento, cancelamento de Carla com motivo preservado ao trocar de página, confirmação sumindo após cinco segundos, ranking de derrotas e estados ligado/desligado da animação. No histórico financeiro apareceram Bruno com 13 dias, Diego com 8 e uma simulação antecipada de Elisa com Sem atraso.

Evidências: `usuarios-branco.png`, `lutas-cancelamento.png` e `historico-atrasos.png`. Os fontes anteriores ficam em `antes/` e os aplicados em `principal/`. TS/TSX criados ou alterados contêm comentários em português junto à lógica.

Os módulos financeiros e esportivos continuam demonstrativos em memória. Lutas confirmadas/canceladas permanecem entre páginas na mesma visita e reiniciam ao recarregar ou sair; a agenda fictícia inicial é restaurada na próxima visita. Nenhum armazenamento esportivo definitivo foi implementado ou prometido nesta entrega.
