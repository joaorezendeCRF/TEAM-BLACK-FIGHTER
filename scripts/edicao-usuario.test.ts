// Testes exercitam regras administrativas com contas inteiramente fictícias.
import test from "node:test";
// Asserções conferem ausência de escrita em todos os cenários recusados.
import assert from "node:assert/strict";
// O serviço não abre conexões: todas as dependências são explícitas.
import { executarEdicao, versaoConta, type ContaEditavel, type DependenciasEdicao, type ComandoEdicao } from "../lib/edicao-usuario";
// Nenhum nome ou login real é utilizado nos testes.
const alvo: ContaEditavel = { id: 20, nome: "Professor Fictício", usuario: "prof-ficticio", email: null, perfil: "professor", ativo: 1 };
// Cada execução começa com formulário novo, para não compartilhar alterações entre testes.
function formulario() {
  // Campos representam a mesma versão que foi apresentada ao administrador fictício.
  const dados = new FormData();
  // A senha é pública e só pertence ao dublê, sem conexão com uma conta real.
  for (const [chave, valor] of Object.entries({ id: String(alvo.id), versao: versaoConta(alvo), nome: "Nome corrigido fictício", usuario: "prof-corrigido", email: "", perfil: "professor", senhaAdministrador: "senha-ficticia" })) dados.set(chave, valor);
  // O chamador altera somente o cenário que deseja exercitar.
  return dados;
}
// Dublês registram comandos permitidos sem executar SQL.
function ambiente(ajustes: Partial<DependenciasEdicao> = {}) {
  // A lista permite garantir que uma recusa aconteceu antes da persistência.
  const gravados: ComandoEdicao[] = [];
  // Os hashes são marcadores fictícios, nunca resultados de credenciais reais.
  const deps: DependenciasEdicao = { autor: async () => ({ id: 1, perfil: "admin_principal" }), alvo: async () => ({ ...alvo }), credencial: async () => "hash-ficticio", verificar: async (_hash, senha) => senha === "senha-ficticia", hash: async () => "novo-hash-ficticio", gravar: async (comando) => { gravados.push(comando); return true; }, ...ajustes };
  // Cada teste recebe estado isolado.
  return { deps, gravados };
}
// Revalidação de sessão impede usar diretamente uma ação escondida pela interface.
test("edição recusa visitante e professor antes de consultar ou gravar alvo", async () => {
  // Perfis não administrativos e sessões ausentes têm o mesmo bloqueio de acesso.
  for (const autor of [null, { id: 1, perfil: "professor" }]) {
    // Qualquer consulta indevida falha explicitamente no teste.
    const { deps, gravados } = ambiente({ autor: async () => autor, alvo: async () => { throw new Error("Consulta indevida"); } });
    // Não autoriza sequer consultar os dados da conta escolhida.
    assert.equal((await executarEdicao(formulario(), deps)).sucesso, false);
    // A recusa não produziu comando de alteração.
    assert.equal(gravados.length, 0);
  }
});
// Protege identidade e poder administrativo do principal.
test("edição protege própria conta e qualquer administrador principal", async () => {
  // São dois caminhos diferentes que devem terminar sem escrita.
  for (const protegido of [{ ...alvo, id: 1 }, { ...alvo, perfil: "admin_principal" }]) {
    // O dublê retorna a conta protegida independentemente do formulário adulterado.
    const { deps, gravados } = ambiente({ alvo: async () => protegido });
    // O serviço recusa a tentativa.
    assert.equal((await executarEdicao(formulario(), deps)).sucesso, false);
    // Nenhum UPDATE foi solicitado.
    assert.equal(gravados.length, 0);
  }
});
// Valores ambiguamente duplicados ou enviados como arquivo não são aceitos.
test("edição recusa duplicatas, arquivos, login e e-mail inválidos", async () => {
  // Cada preparação modifica somente um aspecto do pedido válido.
  const preparar = [(d: FormData) => d.append("nome", "duplicado"), (d: FormData) => d.set("nome", new Blob(["arquivo"])), (d: FormData) => d.set("usuario", "login com espaço"), (d: FormData) => d.set("email", "sem-arroba"), (d: FormData) => d.set("perfil", "admin_principal")];
  // Todas as entradas devem ser recusadas antes de persistir.
  for (const modificar of preparar) {
    // Formulário e dublês novos não compartilham dados entre casos.
    const dados = formulario(), { deps, gravados } = ambiente();
    // Aplica a adulteração de teste.
    modificar(dados);
    // A validação de servidor não depende da validação HTML.
    assert.equal((await executarEdicao(dados, deps)).sucesso, false);
    // Não grava nenhum campo de um pedido parcialmente válido.
    assert.equal(gravados.length, 0);
  }
});
// Uma versão alterada não pode ser sobrescrita por uma tela desatualizada.
test("edição recusa versão antiga e senha administrativa incorreta", async () => {
  // Um dado público diferente muda o resumo de versão.
  const antigo = ambiente({ alvo: async () => ({ ...alvo, nome: "Outra edição fictícia" }) });
  // A versão carregada pelo formulário não confere mais.
  assert.equal((await executarEdicao(formulario(), antigo.deps)).sucesso, false);
  // Um segredo incorreto também precisa impedir a gravação.
  const dados = formulario(), senha = ambiente();
  // Usa somente um valor sintético deliberadamente incorreto.
  dados.set("senhaAdministrador", "incorreta");
  // Não permite editar com uma sessão aberta sem reconfirmar a senha.
  assert.equal((await executarEdicao(dados, senha.deps)).sucesso, false);
  // Nenhuma das recusas produziu comando de persistência.
  assert.equal(antigo.gravados.length + senha.gravados.length, 0);
});
// Administradores comuns mantêm a permissão de editar apenas professores.
test("administrador edita professor sem poder promover ou editar outro administrador", async () => {
  // O autor é administrativo, porém não é principal.
  const autor = async () => ({ id: 1, perfil: "administrador" });
  // Correções cadastrais de professor continuam permitidas.
  const permitido = ambiente({ autor });
  // O e-mail vazio deve permanecer opcional.
  assert.equal((await executarEdicao(formulario(), permitido.deps)).sucesso, true);
  // O comando preserva a senha e não inventa um endereço eletrônico.
  assert.equal(permitido.gravados[0].email, null);
  // Não troca a senha durante uma edição comum.
  assert.equal(permitido.gravados[0].senhaHash, null);
  // A tentativa de promoção é recusada mesmo com um formulário forjado.
  const dados = formulario(), promocao = ambiente({ autor });
  // O cliente não concede perfil a si mesmo.
  dados.set("perfil", "administrador");
  // Somente principal pode alterar perfil.
  assert.equal((await executarEdicao(dados, promocao.deps)).sucesso, false);
  // Outro administrador é igualmente protegido contra o autor comum.
  const outro = ambiente({ autor, alvo: async () => ({ ...alvo, perfil: "administrador" }) });
  // O serviço deve recusar esta segunda tentativa.
  assert.equal((await executarEdicao(formulario(), outro.deps)).sucesso, false);
});
// Promoção não deve conservar uma senha livre de professor sem conferir a política administrativa.
test("principal promove professor somente com nova senha confirmada e adequada", async () => {
  // A mesma pessoa fictícia receberá um novo perfil.
  const dados = formulario(), { deps, gravados } = ambiente();
  // O perfil pode ser escolhido pelo principal, mas não basta sozinho.
  dados.set("perfil", "administrador");
  // Sem nova senha a promoção falha.
  assert.equal((await executarEdicao(dados, deps)).sucesso, false);
  // Preenche uma credencial de teste que satisfaz a política administrativa.
  dados.set("novaSenha", "TesteAdministrativo123"); dados.set("confirmacao", "TesteAdministrativo123");
  // A confirmação válida permite gerar o hash no servidor.
  assert.equal((await executarEdicao(dados, deps)).sucesso, true);
  // O comando não inclui as senhas originais.
  assert.equal(gravados[0].senhaHash, "novo-hash-ficticio");
  // A persistência recebe a nova permissão explicitamente validada.
  assert.equal(gravados[0].perfil, "administrador");
});
// Falhas do banco nunca devem devolver mensagens do driver ou conteúdo de registros.
test("duplicidade, conflito concorrente e falha inesperada têm retorno controlado", async () => {
  // Conflito transacional exige atualizar a página.
  assert.equal((await executarEdicao(formulario(), ambiente({ gravar: async () => false }).deps)).sucesso, false);
  // Duplicidade é tratada sem revelar qual pessoa já usa o valor.
  const duplicado = await executarEdicao(formulario(), ambiente({ gravar: async () => { throw { code: "ER_DUP_ENTRY" }; } }).deps);
  // A mensagem é genérica e útil para corrigir o formulário.
  assert.match(duplicado.mensagem, /já cadastrado/);
  // Uma exceção interna não deve aparecer no navegador.
  const erro = await executarEdicao(formulario(), ambiente({ gravar: async () => { throw new Error("DETALHE_INTERNO_FICTICIO"); } }).deps);
  // Nenhum detalhe inesperado do adaptador é exposto.
  assert.ok(!erro.mensagem.includes("DETALHE_INTERNO"));
});
