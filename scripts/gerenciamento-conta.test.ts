// Executa testes sem conectar ao MySQL nem alterar usuários reais.
import { test } from "node:test";
// Usa asserções estritas para conferir autorização, efeitos e mensagens.
import assert from "node:assert/strict";
// Exercita o serviço real e os tipos de comando usados na persistência.
import { executarOperacaoConta, validarOperacaoConta, type DependenciasConta, type ComandoConta, type OperacaoConta } from "../lib/gerenciamento-conta";
// Exercita o adaptador SQL real com um executor que mantém tudo em memória.
import { operarContaMysql, consultasConta } from "../lib/operacao-conta-mysql";
// Usa apenas a tipagem do executor MySQL2 para o simulador de consultas.
import type { Pool } from "mysql2/promise";

// Monta um pedido válido de exclusão com credenciais fictícias de teste.
function formulario(alteracoes: Record<string, string> = {}) {
  // Um FormData independente evita interferência entre os cenários.
  const dados = new FormData();
  // Fornece os campos obrigatórios, permitindo substituir somente os valores do cenário.
  const campos = { usuarioId: "4", operacao: "excluir", confirmacaoUsuario: "teste", senhaAdministrador: "senha ficticia", ...alteracoes };
  // Acrescenta cada valor textual ao formulário simulado.
  for (const [campo, valor] of Object.entries(campos)) dados.set(campo, valor);
  // Entrega a entrada completa ao serviço real.
  return dados;
// Finaliza a preparação do formulário.
}

// Simula sessão, banco e verificação de senha, registrando chamadas ao comando final.
function ambiente(alteracoes: Partial<DependenciasConta> = {}) {
  // Armazena somente comandos simulados, sem efetuar alterações no banco.
  const comandos: ComandoConta[] = [];
  // Conta consultas para conferir que solicitações sem permissão são bloqueadas cedo.
  const chamadas = { alvos: 0, verificacoes: 0 };
  // Mantém dependências válidas por padrão, com substituições isoladas para cada cenário.
  const dependencias: DependenciasConta = {
    // O administrador principal tem identificador diferente da conta alvo.
    obterAdministrador: async () => ({ id: 1, perfil: "admin_principal" }),
    // O alvo padrão é um administrador comum ativo, como a conta de teste da tela.
    obterAlvo: async () => { chamadas.alvos++; return { id: 4, usuario: "teste", perfil: "administrador", ativo: true }; },
    // O hash fictício permite conferir que a senha original nunca chega à persistência.
    obterCredencial: async () => "hash-do-autor",
    // Aceita a confirmação padrão sem executar Argon2id para acelerar cenários de autorização.
    verificarSenha: async () => { chamadas.verificacoes++; return true; },
    // Guarda a solicitação apenas na memória para inspeção pelas asserções.
    operar: async (comando) => { comandos.push(comando); return "concluido"; },
    // Aplica falhas ou variações específicas sem compartilhar estado com outros testes.
    ...alteracoes,
  // Finaliza a lista das dependências simuladas.
  };
  // Expõe os efeitos observáveis do cenário.
  return { dependencias, comandos, chamadas };
// Finaliza o ambiente independente de teste.
}

// Cobre entradas manipuladas sem depender da validação HTML dos formulários.
test("recusa identificadores, operações e campos inválidos", () => {
  // Lista entradas que nunca devem chegar a consultas de alteração.
  const invalidas: Record<string, string>[] = [
    // Bloqueia identificadores ausentes, negativos, fracionários e fora do intervalo seguro.
    { usuarioId: "" }, { usuarioId: "-1" }, { usuarioId: "1.5" }, { usuarioId: "9007199254740992" },
    // O identificador não pode conter SQL nem indicar a conta zero.
    { usuarioId: "4 OR 1=1" }, { usuarioId: "0" },
    // Só as três operações conhecidas são aceitas.
    { operacao: "promover" }, { operacao: "" },
    // Confirmação e senha são obrigatórias e limitadas.
    { confirmacaoUsuario: "" }, { confirmacaoUsuario: "a".repeat(51) }, { senhaAdministrador: "" }, { senhaAdministrador: "a".repeat(1025) },
  // Finaliza a matriz de entradas malformadas.
  ];
  // Todos os exemplos devem ser recusados pelo mesmo contrato do servidor.
  for (const entrada of invalidas) assert.ok("erro" in validarOperacaoConta(formulario(entrada)));
  // Um formulário vazio também não seleciona uma conta por padrão.
  assert.ok("erro" in validarOperacaoConta(new FormData()));
// Finaliza o cenário de validação de valores.
});

// Arquivos e parâmetros repetidos não podem escolher operações diferentes da confirmação visível.
test("recusa arquivos e parâmetros duplicados", () => {
  // Percorre os quatro campos obrigatórios para não deixar uma entrada sem verificação de tipo.
  for (const campo of ["usuarioId", "operacao", "confirmacaoUsuario", "senhaAdministrador"]) {
    // Prepara uma entrada válida antes de substituir um único campo por arquivo.
    const arquivo = formulario();
    // Simula um arquivo malicioso em vez de texto.
    arquivo.set(campo, new Blob(["conteudo"]), "arquivo.txt");
    // O contrato do servidor precisa recusar essa representação.
    assert.ok("erro" in validarOperacaoConta(arquivo));
    // Prepara um segundo formulário para testar a ambiguidade de valores repetidos.
    const duplicado = formulario();
    // Acrescenta outra ocorrência sem substituir a original.
    duplicado.append(campo, "outro");
    // Uma escolha ambígua nunca pode executar uma operação.
    assert.ok("erro" in validarOperacaoConta(duplicado));
  // Finaliza a verificação de todos os campos.
  }
// Finaliza o cenário de tipos e repetições.
});

// A exclusividade precisa existir no servidor, não apenas na visibilidade dos botões.
test("bloqueia sessão ausente, professor e administrador comum em todas as operações", async () => {
  // Verifica cada perfil sem permissão, inclusive uma sessão que deixou de existir.
  for (const autor of [null, { id: 2, perfil: "professor" }, { id: 2, perfil: "administrador" }]) {
    // Aplica a mesma exigência a inativar, reativar e excluir.
    for (const operacao of ["inativar", "reativar", "excluir"]) {
      // Substitui exclusivamente a identidade do autor deste cenário.
      const contexto = ambiente({ obterAdministrador: async () => autor });
      // Executa o serviço real com a operação solicitada.
      const resultado = await executarOperacaoConta(formulario({ operacao }), contexto.dependencias);
      // Nenhuma operação deve anunciar sucesso para estes perfis.
      assert.equal(resultado.sucesso, false);
      // Nem mesmo consultas do alvo ou verificações de senha são permitidas nesse caso.
      assert.deepEqual(contexto.chamadas, { alvos: 0, verificacoes: 0 });
      // Confirma a ausência total de alterações simuladas.
      assert.equal(contexto.comandos.length, 0);
    // Finaliza as três operações para o autor deste cenário.
    }
  // Finaliza a matriz de perfis bloqueados.
  }
// Finaliza a proteção exclusiva do desenvolvedor.
});

// Nenhuma funcionalidade deve permitir perder a conta do próprio administrador principal.
test("protege a própria conta em todas as operações", async () => {
  // O identificador um corresponde ao autor autenticado no simulador.
  for (const operacao of ["inativar", "reativar", "excluir"]) {
    // Cria um ambiente independente para cada operação.
    const contexto = ambiente();
    // Tenta gerenciar a própria conta, mesmo passando um login arbitrário.
    const resultado = await executarOperacaoConta(formulario({ usuarioId: "1", operacao }), contexto.dependencias);
    // A recusa precisa acontecer antes de consultar ou alterar a conta.
    assert.equal(resultado.sucesso, false);
    // Não deve haver nenhuma consulta do alvo para uma operação já proibida.
    assert.equal(contexto.chamadas.alvos, 0);
    // Não deve haver qualquer comando de alteração.
    assert.equal(contexto.comandos.length, 0);
  // Finaliza as tentativas contra a própria conta.
  }
// Finaliza a proteção de autogerenciamento destrutivo.
});

// Outros administradores principais e perfis desconhecidos também ficam protegidos.
test("protege todos os administradores principais e perfis desconhecidos", async () => {
  // Uma nova categoria de perfil não se torna gerenciável sem avaliação explícita.
  for (const perfil of ["admin_principal", "perfil_futuro"]) {
    // Simula a conta alvo protegida com identificador diferente do autor.
    const contexto = ambiente({ obterAlvo: async () => ({ id: 4, usuario: "teste", perfil, ativo: true }) });
    // A exclusão é recusada mesmo depois de selecionar um alvo existente.
    assert.equal((await executarOperacaoConta(formulario(), contexto.dependencias)).sucesso, false);
    // Nenhum comando chega à persistência.
    assert.equal(contexto.comandos.length, 0);
  // Finaliza a verificação dos perfis protegidos.
  }
// Finaliza a proteção de administradores principais.
});

// A confirmação precisa continuar identificando exatamente a conta escolhida.
test("recusa conta ausente, alvo divergente e login confirmado incorretamente", async () => {
  // Percorre situações que tornariam a seleção da tela inválida ou desatualizada.
  for (const obterAlvo of [
    // Uma conta removida em outra solicitação não existe mais.
    async () => null,
    // Um adaptador que retorna outro identificador também deve ser recusado.
    async () => ({ id: 5, usuario: "teste", perfil: "professor", ativo: true }),
    // O login atual não corresponde mais à confirmação preenchida.
    async () => ({ id: 4, usuario: "Teste", perfil: "professor", ativo: true }),
  // Finaliza as variações de consulta do alvo.
  ]) {
    // Instala a variação atual sem alterar outros requisitos do cenário.
    const contexto = ambiente({ obterAlvo });
    // Cada identidade divergente precisa impedir o sucesso.
    assert.equal((await executarOperacaoConta(formulario(), contexto.dependencias)).sucesso, false);
    // Nenhuma tentativa de alteração deve ter ocorrido.
    assert.equal(contexto.comandos.length, 0);
  // Finaliza as variações de identidade.
  }
// Finaliza a confirmação exata da conta.
});

// Uma senha errada ou uma credencial que deixou de existir sempre interrompe a operação.
test("exige a senha correta do administrador principal", async () => {
  // Simula tanto a ausência da credencial quanto uma comparação Argon2id negativa.
  for (const alteracoes of [{ obterCredencial: async () => null }, { verificarSenha: async () => false }]) {
    // Monta uma solicitação válida nas demais condições.
    const contexto = ambiente(alteracoes);
    // A senha não confirmada impede a alteração.
    assert.equal((await executarOperacaoConta(formulario(), contexto.dependencias)).sucesso, false);
    // O banco não deve receber nenhum comando de alteração.
    assert.equal(contexto.comandos.length, 0);
  // Finaliza as falhas de confirmação administrativa.
  }
// Finaliza a exigência de reconfirmação de senha.
});

// As ações reversíveis precisam corresponder à situação atual para evitar respostas enganosas.
test("recusa inativar conta já inativa e reativar conta já ativa", async () => {
  // Avalia as duas combinações que não representam mudança de situação.
  for (const [operacao, ativo] of [["inativar", false], ["reativar", true]] as const) {
    // Define a situação atual retornada pela consulta do alvo.
    const contexto = ambiente({ obterAlvo: async () => ({ id: 4, usuario: "teste", perfil: "professor", ativo }) });
    // O serviço solicita atualizar a tela em vez de informar uma mudança inexistente.
    assert.equal((await executarOperacaoConta(formulario({ operacao }), contexto.dependencias)).sucesso, false);
    // Nenhuma atualização é tentada para um estado que já estava correto.
    assert.equal(contexto.comandos.length, 0);
  // Finaliza a verificação de situações já aplicadas.
  }
// Finaliza a proteção contra telas desatualizadas.
});

// Confere que as três ações são autorizadas para professores e administradores comuns.
test("executa cada operação autorizada sem passar a senha original ao banco", async () => {
  // Ambos os perfis gerenciáveis precisam respeitar o mesmo contrato.
  for (const perfil of ["professor", "administrador"]) {
    // As três ações devem funcionar quando há uma mudança válida.
    for (const operacao of ["inativar", "reativar", "excluir"] as OperacaoConta[]) {
      // A reativação parte de uma conta inativa; as demais operações partem de ativa.
      const ativo = operacao !== "reativar";
      // Simula a conta com o perfil e a situação escolhidos.
      const contexto = ambiente({ obterAlvo: async () => ({ id: 4, usuario: "teste", perfil, ativo }) });
      // Confere que a ação foi concluída pelo fluxo real de autorização.
      assert.equal((await executarOperacaoConta(formulario({ operacao }), contexto.dependencias)).sucesso, true);
      // O comando não contém a senha original, apenas o hash previamente confirmado.
      assert.deepEqual(contexto.comandos, [{ alvoId: 4, autorId: 1, credencial: "hash-do-autor", usuarioConfirmado: "teste", ativoEsperado: ativo, operacao }]);
    // Finaliza cada ação válida para o perfil atual.
    }
  // Finaliza os dois perfis gerenciáveis.
  }
// Finaliza a verificação de comandos autorizados.
});

// Uma alteração concorrente não deve ser anunciada como sucesso.
test("trata perda de autorização e vínculos sem anunciar sucesso", async () => {
  // Os dois resultados de bloqueio têm mensagens distintas, mas ambos recusam o sucesso.
  for (const resultadoBanco of ["alterado", "vinculado"] as const) {
    // O simulador representa o resultado real da revalidação no instante da gravação.
    const contexto = ambiente({ operar: async () => resultadoBanco });
    // A operação precisa refletir o bloqueio da persistência.
    assert.equal((await executarOperacaoConta(formulario(), contexto.dependencias)).sucesso, false);
  // Finaliza os resultados sem alteração.
  }
// Finaliza o tratamento de bloqueios de persistência.
});

// Vínculos restritivos oferecem a inativação, enquanto erros internos não expõem segredos.
test("orienta inativação quando há vínculos e oculta erros internos", async () => {
  // Simula a restrição do MySQL e uma falha interna desconhecida.
  for (const erro of [{ code: "ER_ROW_IS_REFERENCED_2" }, new Error("SQL e hash privados")]) {
    // Faz a persistência lançar a falha escolhida sem qualquer conexão real.
    const contexto = ambiente({ operar: async () => { throw erro; } });
    // Executa o tratamento público do erro.
    const resultado = await executarOperacaoConta(formulario(), contexto.dependencias);
    // Uma falha nunca deve ser apresentada como operação concluída.
    assert.equal(resultado.sucesso, false);
    // O retorno não deve conter o detalhe privado do erro.
    assert.ok(!resultado.mensagem.includes("privados"));
    // Uma referência restritiva deve sugerir a alternativa reversível.
    if ("code" in erro) assert.match(resultado.mensagem, /inativ/);
  // Finaliza a verificação das falhas da persistência.
  }
// Finaliza a proteção das mensagens públicas.
});

// Constrói o comando que será passado ao adaptador SQL sem incluir a senha original.
function comando(operacao: OperacaoConta): ComandoConta {
  // A situação esperada permite reconhecer alterações concorrentes no mesmo registro.
  return { alvoId: 4, autorId: 1, credencial: "hash-do-autor", usuarioConfirmado: "teste", ativoEsperado: operacao !== "reativar", operacao };
// Finaliza a preparação do comando de persistência.
}

// O executor simulado captura SQL e parâmetros para conferir o adaptador real.
function bancoSimulado(total = 0, afetadas = 1) {
  // Captura as chamadas sem executar nenhuma instrução contra um banco.
  const chamadas: { sql: string; parametros: unknown }[] = [];
  // Reproduz o formato das tuplas devolvidas pelo driver MySQL2.
  const executor = {
    // Aceita a instrução fixa e os parâmetros separados pela implementação real.
    execute: async (sql: string, parametros?: unknown) => {
      // Guarda a consulta para asserções de segurança e de escopo.
      chamadas.push({ sql, parametros });
      // A inspeção de vínculos retorna linhas; a mutação retorna metadados de linhas afetadas.
      return [sql === consultasConta.vinculos ? [{ total }] : { affectedRows: afetadas }, []];
    // Finaliza a resposta do executor simulado.
    },
  // A conversão fica restrita ao teste porque a API real do driver possui múltiplas sobrecargas.
  } as unknown as Pick<Pool, "execute">;
  // Expõe o executor e o histórico de chamadas para cada cenário independente.
  return { executor, chamadas };
// Finaliza a preparação da persistência simulada.
}

// Uma remoção só pode ocorrer depois da inspeção de efeitos automáticos.
test("SQL de exclusão verifica vínculos e parametriza autor, alvo e confirmação", async () => {
  // Monta um banco simulado sem cascatas ou gatilhos.
  const banco = bancoSimulado();
  // Confirma o sucesso quando exatamente uma linha seria removida.
  assert.equal(await operarContaMysql(banco.executor, comando("excluir")), "concluido");
  // A primeira instrução precisa ser exclusivamente de inspeção de metadados.
  assert.equal(banco.chamadas[0].sql, consultasConta.vinculos);
  // A segunda instrução é a remoção protegida, com os valores separados do texto SQL.
  assert.deepEqual(banco.chamadas[1], { sql: consultasConta.excluir, parametros: [1, 4, "hash-do-autor", "teste", 1] });
  // O próprio SQL também protege a identidade do autor e as contas principais.
  assert.match(consultasConta.excluir, /alvo.id <> autor.id/);
  // A autorização exclusiva é revalidada na mesma instrução da remoção.
  assert.match(consultasConta.excluir, /autor.perfil = 'admin_principal'/);
// Finaliza a verificação da remoção parametrizada.
});

// Cascatas e gatilhos não podem propagar a exclusão para outros dados.
test("não executa DELETE quando há regras que afetam outras tabelas", async () => {
  // Um total positivo representa ao menos uma cascata ou gatilho de exclusão.
  const banco = bancoSimulado(1);
  // A persistência deve oferecer um bloqueio explícito em vez de remover registros.
  assert.equal(await operarContaMysql(banco.executor, comando("excluir")), "vinculado");
  // Somente a inspeção de metadados pode ter ocorrido.
  assert.equal(banco.chamadas.length, 1);
// Finaliza a proteção contra efeitos de exclusão indiretos.
});

// Inativar e reativar devem alterar somente a coluna de situação.
test("inativar e reativar usam UPDATE da situação sem DELETE ou alteração de senha", async () => {
  // Cada operação possui um valor de situação esperado distinto.
  for (const [operacao, novoAtivo, esperado] of [["inativar", 0, 1], ["reativar", 1, 0]] as const) {
    // Monta um executor independente para esta atualização.
    const banco = bancoSimulado();
    // Confirma o resultado de uma única linha atualizada.
    assert.equal(await operarContaMysql(banco.executor, comando(operacao)), "concluido");
    // Deve haver uma única atualização, com situação nova e anterior separadas.
    assert.deepEqual(banco.chamadas, [{ sql: consultasConta.situacao, parametros: [1, novoAtivo, 4, "hash-do-autor", "teste", esperado] }]);
    // Somente a coluna ativo aparece no trecho SET da consulta fixa.
    assert.match(consultasConta.situacao, /SET alvo.ativo = \?/);
    // Nenhum comando de exclusão é necessário para bloquear ou liberar o acesso.
    assert.ok(!banco.chamadas[0].sql.startsWith("DELETE"));
  // Finaliza a verificação das duas situações.
  }
// Finaliza a preservação dos dados nas ações reversíveis.
});

// O adaptador não pode anunciar sucesso se nenhuma linha passou pelos filtros finais.
test("SQL recusa sucesso quando a linha ou autorização mudou", async () => {
  // Exercita a proteção final tanto na exclusão quanto nas atualizações.
  for (const operacao of ["excluir", "inativar", "reativar"] as OperacaoConta[]) {
    // Zero linhas afetadas simula uma mudança concorrente de situação, perfil ou credencial.
    const banco = bancoSimulado(0, 0);
    // O serviço receberá um bloqueio em vez de uma confirmação enganosa.
    assert.equal(await operarContaMysql(banco.executor, comando(operacao)), "alterado");
  // Finaliza a matriz de operações com autorização desatualizada.
  }
// Finaliza a proteção final contra concorrência.
});

