/**
 * Testes do cadastro com dependências simuladas. Não abrem conexão com MySQL
 * nem criam usuários reais. A criptografia também é verificada com Argon2id real.
 * Executar: node --conditions=react-server --import tsx --test scripts/cadastro-usuario.test.ts
 */
// Importa os recursos de node:test usados pelas operações deste arquivo.
import { test } from "node:test";
// Importa os recursos de node:assert/strict usados pelas operações deste arquivo.
import assert from "node:assert/strict";
// Importa os recursos de ../lib/cadastro-usuario usados pelas operações deste arquivo.
import { executarCadastro, validarCadastro, type DependenciasCadastro, type NovoUsuarioBanco } from "../lib/cadastro-usuario";
// Importa os recursos de ../lib/senha usados pelas operações deste arquivo.
import { gerarHashSenha, verificarSenha } from "../lib/senha";

// Cria uma entrada válida de professor com senha curta, conforme a regra solicitada.
function formulario(alteracoes: Record<string, string> = {}) {
  // Reúne os valores do formulário em dados para conferência antes de processar a operação.
  const dados = new FormData();
  // Percorre os valores indicados para aplicar a mesma validação ou configuração em cada item.
  for (const [campo, valor] of Object.entries({
    // Nome de apresentação da pessoa, separado do identificador de login.
    nome: "Professor de Teste", usuario: "professor.teste", email: "",
    // Senha original mantida apenas durante a validação, sem remoção de espaços.
    senha: "1", confirmacao: "1", senhaAdministrador: "senha do autor", ...alteracoes,
  // Conclui a lista de entradas fictícias e adiciona cada par de nome e valor ao formulário do teste.
  })) dados.set(campo, valor);
  // Retorna este resultado ao chamador e encerra o caminho atual da função.
  return dados;
// Conclui a função formulario, preservando a estrutura e o escopo definidos.
}

// Espiões permitem garantir que falhas de autorização nunca gerem hash ou gravação.
function ambiente(alteracoes: Partial<DependenciasCadastro> = {}) {
  // Prepara chamadas com o valor indicado para uso nas próximas etapas deste fluxo.
  const chamadas = { hashes: 0, insercoes: 0 };
  // Prepara registros: NovoUsuarioBanco[] com o valor indicado para uso nas próximas etapas deste fluxo.
  const registros: NovoUsuarioBanco[] = [];
  // Prepara dependencias: DependenciasCadastro com o valor indicado para uso nas próximas etapas deste fluxo.
  const dependencias: DependenciasCadastro = {
    // Dependência que consulta a sessão e retorna apenas uma conta com permissão administrativa.
    obterAdministrador: async () => ({ id: 1, perfil: "admin_principal" }),
    // Dependência que consulta o hash atual da conta que autoriza a operação.
    obterCredencial: async () => "hash-do-autor",
    // Dependência que compara a senha digitada ao hash existente.
    verificarSenha: async () => true,
    // Dependência que aplica Argon2id segundo o perfil da conta criada.
    gerarHash: async () => { chamadas.hashes++; return "hash-do-novo-usuario"; },
    // Dependência que grava somente a conta nova após revalidar a autorização.
    inserir: async (novo, autorId, credencial) => {
      // Conta as tentativas de inserção simulada para detectar gravações indevidas.
      chamadas.insercoes++;
      // Confere a condição ou o valor esperado para detectar regressões neste cenário.
      assert.equal(autorId, 1);
      // Confere a condição ou o valor esperado para detectar regressões neste cenário.
      assert.equal(credencial, "hash-do-autor");
      // Guarda o registro recebido apenas na memória do teste, sem gravar no MySQL.
      registros.push(novo);
      // Retorna este resultado ao chamador e encerra o caminho atual da função.
      return true;
    // Conclui o manipulador ou retorno assíncrono da operação, preservando a estrutura e o escopo definidos.
    },
    // Inclui os valores já definidos nesta configuração, mantendo a ordem de composição.
    ...alteracoes,
  // Conclui o objeto de dados ou opções passado à operação, preservando a estrutura e o escopo definidos.
  };
  // Retorna este resultado ao chamador e encerra o caminho atual da função.
  return { chamadas, registros, dependencias };
// Conclui a função ambiente, preservando a estrutura e o escopo definidos.
}

// Normalização pública não pode modificar senhas, inclusive senhas com espaços.
test("valida professor, normaliza campos e converte e-mail vazio para null", () => {
  // Prepara resultado com o valor indicado para uso nas próximas etapas deste fluxo.
  const resultado = validarCadastro(formulario({ nome: "  Ana  ", usuario: " ana ", senha: " ", confirmacao: " " }));
  // Confere a condição ou o valor esperado para detectar regressões neste cenário.
  assert.ok(!("erro" in resultado));
  // Confere a condição ou o valor esperado para detectar regressões neste cenário.
  assert.equal(resultado.perfil, "professor");
  // Confere a condição ou o valor esperado para detectar regressões neste cenário.
  assert.equal(resultado.email, null);
  // Confere a condição ou o valor esperado para detectar regressões neste cenário.
  assert.equal(resultado.nome, "Ana");
  // Confere a condição ou o valor esperado para detectar regressões neste cenário.
  assert.equal(resultado.usuario, "ana");
  // Confere a condição ou o valor esperado para detectar regressões neste cenário.
  assert.equal(resultado.senha, " ");
// Conclui o manipulador ou retorno assíncrono da operação, preservando a estrutura e o escopo definidos.
});

// O servidor decide o perfil a partir da opção restrita, nunca de um perfil arbitrário.
test("opção administrativa cria administrador comum, nunca principal", () => {
  // Prepara resultado com o valor indicado para uso nas próximas etapas deste fluxo.
  const resultado = validarCadastro(formulario({ administrador: "on", senha: "senha longa segura", confirmacao: "senha longa segura", perfil: "admin_principal" }));
  // Confere a condição ou o valor esperado para detectar regressões neste cenário.
  assert.ok(!("erro" in resultado));
  // Confere a condição ou o valor esperado para detectar regressões neste cenário.
  assert.equal(resultado.perfil, "administrador");
  // Prepara professor com o valor indicado para uso nas próximas etapas deste fluxo.
  const professor = validarCadastro(formulario({ perfil: "admin_principal" }));
  // Confere a condição ou o valor esperado para detectar regressões neste cenário.
  assert.ok(!("erro" in professor));
  // Confere a condição ou o valor esperado para detectar regressões neste cenário.
  assert.equal(professor.perfil, "professor");
// Conclui o manipulador ou retorno assíncrono da operação, preservando a estrutura e o escopo definidos.
});

// A regra atual de senha administrativa permanece mesmo com envio direto ao servidor.
test("novos administradores mantêm mínimo de 6 caracteres", () => {
  // Confere a condição ou o valor esperado para detectar regressões neste cenário.
  assert.ok("erro" in validarCadastro(formulario({ administrador: "on" })));
// Conclui o manipulador ou retorno assíncrono da operação, preservando a estrutura e o escopo definidos.
});

// Valida comprimentos de acordo com os tipos reais já presentes no banco.
test("rejeita campos inválidos e comprimentos excessivos", () => {
  // Prepara entradasInvalidas: Record<string, string>[] com o valor indicado para uso nas próximas etapas deste fluxo.
  const entradasInvalidas: Record<string, string>[] = [
    // Prepara valores deliberadamente inválidos para verificar limites, campos obrigatórios e permissões.
    { nome: "" }, { nome: "a".repeat(151) }, { usuario: "a b" },
    // Prepara valores deliberadamente inválidos para verificar limites, campos obrigatórios e permissões.
    { usuario: "a".repeat(51) }, { usuario: "' OR 1=1" }, { email: "invalido" },
    // Prepara valores deliberadamente inválidos para verificar limites, campos obrigatórios e permissões.
    { email: "a".repeat(145) + "@site.com" }, { senha: "" },
    // Prepara valores deliberadamente inválidos para verificar limites, campos obrigatórios e permissões.
    { senha: "a".repeat(1025) }, { senhaAdministrador: "" },
    // Prepara valores deliberadamente inválidos para verificar limites, campos obrigatórios e permissões.
    { senhaAdministrador: "a".repeat(1025) }, { confirmacao: "diferente" },
    // Prepara valores deliberadamente inválidos para verificar limites, campos obrigatórios e permissões.
    { administrador: "admin_principal" },
  // Conclui o manipulador ou retorno assíncrono da operação, preservando a estrutura e o escopo definidos.
  ];
  // Percorre os valores indicados para aplicar a mesma validação ou configuração em cada item.
  for (const alteracao of entradasInvalidas) assert.ok("erro" in validarCadastro(formulario(alteracao)));
// Conclui o manipulador ou retorno assíncrono da operação, preservando a estrutura e o escopo definidos.
});

// FormData pode trazer arquivos ou campos repetidos; ambos são recusados.
test("rejeita arquivos, entradas ausentes e permissões repetidas", () => {
  // Confere a condição ou o valor esperado para detectar regressões neste cenário.
  assert.ok("erro" in validarCadastro(new FormData()));
  // Prepara arquivo com o valor indicado para uso nas próximas etapas deste fluxo.
  const arquivo = formulario();
  // Simula um arquivo no campo nome para verificar a rejeição de tipos não textuais.
  arquivo.set("nome", new Blob(["nome"]), "nome.txt");
  // Confere a condição ou o valor esperado para detectar regressões neste cenário.
  assert.ok("erro" in validarCadastro(arquivo));
  // Prepara repetido com o valor indicado para uso nas próximas etapas deste fluxo.
  const repetido = formulario();
  // Adiciona uma ocorrência da permissão administrativa para testar parâmetros repetidos.
  repetido.append("administrador", "on");
  // Adiciona uma ocorrência da permissão administrativa para testar parâmetros repetidos.
  repetido.append("administrador", "on");
  // Confere a condição ou o valor esperado para detectar regressões neste cenário.
  assert.ok("erro" in validarCadastro(repetido));
// Conclui o manipulador ou retorno assíncrono da operação, preservando a estrutura e o escopo definidos.
});

// Uma sessão ausente ou de professor não pode iniciar o fluxo de criação.
test("bloqueia não autenticados e professores sem gerar hash ou gravar", async () => {
  // Percorre os valores indicados para aplicar a mesma validação ou configuração em cada item.
  for (const autor of [null, { id: 2, perfil: "professor" }]) {
    // Prepara contexto com o valor indicado para uso nas próximas etapas deste fluxo.
    const contexto = ambiente({ obterAdministrador: async () => autor });
    // Aguarda o resultado de executarCadastro(formulario(), contexto.dependencias) e o guarda em resultado.
    const resultado = await executarCadastro(formulario(), contexto.dependencias);
    // Confere a condição ou o valor esperado para detectar regressões neste cenário.
    assert.equal(resultado.sucesso, false);
    // Compara toda a estrutura retornada com o resultado esperado para este cenário.
    assert.deepEqual(contexto.chamadas, { hashes: 0, insercoes: 0 });
  // Conclui a repetição sobre os valores examinados, preservando a estrutura e o escopo definidos.
  }
// Conclui o manipulador ou retorno assíncrono da operação, preservando a estrutura e o escopo definidos.
});

// A conta administrativa precisa continuar válida e confirmar sua própria senha.
test("bloqueia credencial ausente e senha administrativa incorreta", async () => {
  // Percorre os valores indicados para aplicar a mesma validação ou configuração em cada item.
  for (const alteracao of [
    // Define o comportamento executado para cada evento ou item recebido por esta função.
    { obterCredencial: async () => null },
    // Define o comportamento executado para cada evento ou item recebido por esta função.
    { verificarSenha: async () => false },
  // Conclui as variações de entrada e inicia a verificação individual de cada cenário.
  ]) {
    // Prepara contexto com o valor indicado para uso nas próximas etapas deste fluxo.
    const contexto = ambiente(alteracao);
    // Aguarda o resultado de executarCadastro(formulario(), contexto.dependencias) e o guarda em resultado.
    const resultado = await executarCadastro(formulario(), contexto.dependencias);
    // Confere a condição ou o valor esperado para detectar regressões neste cenário.
    assert.equal(resultado.sucesso, false);
    // Compara toda a estrutura retornada com o resultado esperado para este cenário.
    assert.deepEqual(contexto.chamadas, { hashes: 0, insercoes: 0 });
  // Conclui a repetição sobre os valores examinados, preservando a estrutura e o escopo definidos.
  }
// Conclui o manipulador ou retorno assíncrono da operação, preservando a estrutura e o escopo definidos.
});

// Apenas dados públicos e o hash final chegam à gravação.
test("cria professor ativo pelo padrão do banco sem enviar senhas para persistência", async () => {
  // Prepara contexto com o valor indicado para uso nas próximas etapas deste fluxo.
  const contexto = ambiente();
  // Aguarda o resultado de executarCadastro(formulario(), contexto.dependencias) e o guarda em resultado.
  const resultado = await executarCadastro(formulario(), contexto.dependencias);
  // Confere a condição ou o valor esperado para detectar regressões neste cenário.
  assert.equal(resultado.sucesso, true);
  // Compara toda a estrutura retornada com o resultado esperado para este cenário.
  assert.deepEqual(contexto.registros, [{
    // Nome de apresentação da pessoa, separado do identificador de login.
    nome: "Professor de Teste", usuario: "professor.teste", email: null,
    // Nível de acesso usado pelo servidor para autorizar operações.
    perfil: "professor", senhaHash: "hash-do-novo-usuario",
  // Conclui o objeto de dados ou opções passado à operação, preservando a estrutura e o escopo definidos.
  }]);
  // Compara toda a estrutura retornada com o resultado esperado para este cenário.
  assert.deepEqual(contexto.chamadas, { hashes: 1, insercoes: 1 });
// Conclui o manipulador ou retorno assíncrono da operação, preservando a estrutura e o escopo definidos.
});

// Ambos os perfis administrativos existentes podem usar a opção de criação.
test("administrador comum cria outro administrador com confirmação válida", async () => {
  // Prepara contexto com o valor indicado para uso nas próximas etapas deste fluxo.
  const contexto = ambiente({ obterAdministrador: async () => ({ id: 1, perfil: "administrador" }) });
  // Aguarda o resultado de executarCadastro(formulario( e o guarda em resultado.
  const resultado = await executarCadastro(formulario({
    // Define administrador com o tipo ou valor exigido por este objeto de dados.
    administrador: "on", senha: "senha longa segura", confirmacao: "senha longa segura", email: "novo@example.com",
  // Entrega o formulário preparado e as dependências simuladas ao fluxo real sob teste.
  }), contexto.dependencias);
  // Confere a condição ou o valor esperado para detectar regressões neste cenário.
  assert.equal(resultado.sucesso, true);
  // Confere a condição ou o valor esperado para detectar regressões neste cenário.
  assert.equal(contexto.registros[0].perfil, "administrador");
// Conclui o manipulador ou retorno assíncrono da operação, preservando a estrutura e o escopo definidos.
});

// O INSERT condicionado pode recusar uma autorização que mudou durante o processamento.
test("não anuncia sucesso quando a autorização muda antes da gravação", async () => {
  // Prepara contexto com o valor indicado para uso nas próximas etapas deste fluxo.
  const contexto = ambiente({ inserir: async () => false });
  // Confere a condição ou o valor esperado para detectar regressões neste cenário.
  assert.equal((await executarCadastro(formulario(), contexto.dependencias)).sucesso, false);
// Conclui o manipulador ou retorno assíncrono da operação, preservando a estrutura e o escopo definidos.
});

// Os detalhes internos do banco nunca aparecem ao usuário.
test("trata duplicidade e oculta erros internos", async () => {
  // Percorre os valores indicados para aplicar a mesma validação ou configuração em cada item.
  for (const erro of [{ code: "ER_DUP_ENTRY", sql: "segredo" }, new Error("segredo")]) {
    // Prepara contexto com o valor indicado para uso nas próximas etapas deste fluxo.
    const contexto = ambiente({ inserir: async () => { throw erro; } });
    // Aguarda o resultado de executarCadastro(formulario(), contexto.dependencias) e o guarda em resultado.
    const resultado = await executarCadastro(formulario(), contexto.dependencias);
    // Confere a condição ou o valor esperado para detectar regressões neste cenário.
    assert.equal(resultado.sucesso, false);
    // Confere a condição ou o valor esperado para detectar regressões neste cenário.
    assert.ok(!resultado.mensagem.includes("segredo"));
    // Verifica ("code" in erro) assert.match(resultado.mensagem, /já cadastrado/); antes de permitir a continuação desta operação.
    if ("code" in erro) assert.match(resultado.mensagem, /já cadastrado/);
  // Conclui a repetição sobre os valores examinados, preservando a estrutura e o escopo definidos.
  }
// Conclui o manipulador ou retorno assíncrono da operação, preservando a estrutura e o escopo definidos.
});

// Integra as regras com a implementação real de hash sem persistir qualquer conta.
test("cadastro de professor aceita senha curta com Argon2id e mantém política administrativa", async () => {
  // Prepara contexto com o valor indicado para uso nas próximas etapas deste fluxo.
  const contexto = ambiente({
    // Dependência que aplica Argon2id segundo o perfil da conta criada.
    gerarHash: (senha, perfil) => gerarHashSenha(senha, perfil === "professor" ? "cadastro-professor" : "padrao"),
    // Dependência que grava somente a conta nova após revalidar a autorização.
    inserir: async (novo) => {
      // Confere a condição ou o valor esperado para detectar regressões neste cenário.
      assert.equal(novo.senhaHash.split("$")[1], "argon2id");
      // Confere a condição ou o valor esperado para detectar regressões neste cenário.
      assert.equal(await verificarSenha(novo.senhaHash, "1"), true);
      // Confere a condição ou o valor esperado para detectar regressões neste cenário.
      assert.equal(await verificarSenha(novo.senhaHash, "outra"), false);
      // Retorna este resultado ao chamador e encerra o caminho atual da função.
      return true;
    // Conclui o manipulador ou retorno assíncrono da operação, preservando a estrutura e o escopo definidos.
    },
  // Conclui o objeto de dados ou opções passado à operação, preservando a estrutura e o escopo definidos.
  });
  // Confere a condição ou o valor esperado para detectar regressões neste cenário.
  assert.equal((await executarCadastro(formulario(), contexto.dependencias)).sucesso, true);
  // Confirma que uma entrada proibida é recusada pela operação assíncrona.
  await assert.rejects(gerarHashSenha("1"), /6 caracteres/);
// Conclui o manipulador ou retorno assíncrono da operação, preservando a estrutura e o escopo definidos.
});




// Exercita os limites exatos: cinco caracteres falham e seis são aceitos para administrador.
test("administrador exige seis caracteres e aceita exatamente seis", async () => {
  // Cinco caracteres ficam abaixo do mínimo solicitado.
  const curta = validarCadastro(formulario({ administrador: "on", senha: "12345", confirmacao: "12345" }));
  // A validação precisa bloquear mesmo se o navegador não aplicar minLength.
  assert.ok("erro" in curta);
  // Seis caracteres atendem ao mínimo tanto na confirmação quanto no campo principal.
  const valida = validarCadastro(formulario({ administrador: "on", senha: "123456", confirmacao: "123456" }));
  // A entrada deve ser aprovada antes de gerar o hash.
  assert.ok(!("erro" in valida));
  // O perfil administrativo não é perdido quando a senha possui exatamente seis caracteres.
  assert.equal(valida.perfil, "administrador");
  // Usa Argon2id real para verificar que o gerador também aceita a nova fronteira.
  const hash = await gerarHashSenha("123456");
  // A credencial deve continuar verificável pela autenticação existente.
  assert.equal(await verificarSenha(hash, "123456"), true);
  // O gerador compartilhado também bloqueia uma senha administrativa de cinco caracteres.
  await assert.rejects(gerarHashSenha("12345"), /6 caracteres/);
// Finaliza o cenário de fronteira do mínimo administrativo.
});

