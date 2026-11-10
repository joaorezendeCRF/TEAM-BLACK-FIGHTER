# Ajustes de empates e apresentação — 23/10/2026

Aplicado no sistema principal em C:\Projetos\team-black-fighter.

- Criar usuário agora ocupa somente a largura do botão. O formulário aberto conserva espaço para os campos e as permissões existentes.
- Relatórios aparece antes de Gerenciar Usuários. O menu de professores continua sem acesso à administração de contas.
- Registrar empate aparece em azul entre vitória e derrota. Exige confirmação, só pode ocorrer a partir da data da luta e não substitui um resultado concluído. Cancelamentos permanecem separados.
- Empates por luta fica ao lado de Derrotas por luta, com coluna percentual própria. A ordem é do maior para o menor percentual sobre todas as lutas concluídas; ausência de participação fica no fim. A comparação não arredonda frações antes de ordenar.
- O histórico usa verde na data do recebimento e vermelho no atraso efetivo. Pagamento sem atraso permanece identificado por texto e em verde. Datas e valores foram preservados.

Validação: 71 testes passaram; TypeScript e compilação de produção concluídos; 32 verificações HTTP passaram com contas fictícias e banco bloqueado para escrita. No navegador: botão compacto, menu, confirmação de empate para Hugo, ranking mostrando 1 luta e 100% de empates, resultado azul e cores do histórico nos dois temas.

Comentários em português acompanham a lógica TS/TSX criada ou alterada. Fontes anteriores preservados na pasta ajustes-empates/antes dentro de C:\Users\jgmr2\.codex\visualizations\2026\10\22\01a164f2-1165-7d32-b49f-b5333e7342be. Evidências na mesma pasta: usuarios-compacto.png e cores-historico.png.

Nenhuma migração ou alteração de dados reais. Os módulos esportivo e financeiro continuam como demonstração em memória, reiniciando ao recarregar ou sair.