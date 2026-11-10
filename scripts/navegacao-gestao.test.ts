// O executor nativo verifica o catálogo de navegação sem conectar ao banco real.
import test from "node:test";
// As asserções estritas detectam destinos ausentes e alterações indevidas nos privilégios do menu.
import assert from "node:assert/strict";
// As regras testadas são as mesmas usadas na renderização da estrutura autenticada.
import { itensGestao, itemSelecionado } from "../lib/navegacao-gestao";
// Professores acessam apenas as telas fictícias; contas reais continuam restritas aos administradores.
test("menu de professor apresenta os cinco módulos demonstrativos sem administração de contas", () => {
  // A ordem faz parte do fluxo de navegação aprovado pelo usuário.
  assert.deepEqual(itensGestao("professor").map((item) => item.href), ["/dashboard/alunos", "/dashboard/graduacoes", "/dashboard/lutas", "/dashboard/pagamentos", "/dashboard/relatorios"]);
});
// Os dois tipos de administrador conservam a função de gerenciamento já existente.
test("administradores conservam o gerenciamento de usuários sem ampliar o menu de professores", () => {
  // Ambos os perfis administrativos devem apresentar a mesma rota de contas.
  for (const perfil of ["administrador", "admin_principal"] as const) {
    // Relatórios fica imediatamente antes de Contas, preservando as permissões existentes.
    assert.deepEqual(itensGestao(perfil).slice(-2).map((item) => item.href), ["/dashboard/relatorios", "/dashboard/usuarios"]);
  }
  // Chamadas administrativas não podem modificar o catálogo compartilhado do professor.
  assert.equal(itensGestao("professor").length, 5);
});
// O destaque do menu acompanha o endereço real, inclusive ao voltar para a entrada do painel.
test("a entrada original destaca alunos e cada módulo destaca somente sua própria rota", () => {
  // Os quatro destinos possuem identificadores únicos e endereços distintos.
  const itens = itensGestao("professor");
  // O login existente envia ao painel original e deve abrir a primeira seção.
  assert.deepEqual(itens.filter((item) => itemSelecionado("/dashboard", item)).map((item) => item.id), ["alunos"]);
  // Cada rota deve marcar exatamente o próprio item, sem múltiplas seleções.
  for (const selecionado of itens) {
    // Um resultado único mantém aria-current correto para tecnologias assistivas.
    assert.deepEqual(itens.filter((item) => itemSelecionado(selecionado.href, item)), [selecionado]);
  }
});
