// Define exclusivamente os módulos demonstrativos aprovados para esta etapa.
export type SecaoGestao = "alunos" | "graduacoes" | "pagamentos" | "relatorios" | "lutas";
// Representa os três perfis já existentes sem criar novos privilégios no banco.
type Perfil = "admin_principal" | "administrador" | "professor";
// Cada item informa uma rota real e um rótulo de apresentação para a navegação comum.
export type ItemGestao = {
  // Identificador estável da seção, incluindo a administração já existente.
  id: SecaoGestao | "usuarios";
  // Nome apresentado em português no menu lateral.
  rotulo: string;
  // Endereço interno acessível também por navegação direta.
  href: string;
};
// Mantém a ordem aprovada; as telas de demonstração contêm apenas dados fictícios nesta etapa.
const modulos: ItemGestao[] = [
  // A consulta de alunos é a primeira tela após entrar no painel.
  { id: "alunos", rotulo: "Alunos", href: "/dashboard/alunos" },
  // A graduação descreve as oito faixas sem promover alunos automaticamente.
  { id: "graduacoes", rotulo: "Graduações", href: "/dashboard/graduacoes" },
  // Registro esportivo usa dados fictícios e a mesma proteção de sessão dos módulos existentes.
  { id: "lutas", rotulo: "Registro de lutas", href: "/dashboard/lutas" },
  // Pagamentos vem depois do registro esportivo.
  { id: "pagamentos", rotulo: "Pagamentos", href: "/dashboard/pagamentos" },
];
// Centraliza a apresentação do menu; o servidor continua verificando cada rota protegida.
export function itensGestao(perfil: Perfil): ItemGestao[] {
  // Os dois perfis administrativos conservam o acesso atual ao gerenciamento de contas.
  const administrador = perfil === "admin_principal" || perfil === "administrador";
  // Retorna uma lista nova para impedir que um componente altere o catálogo compartilhado.
  const contas: ItemGestao[] = administrador ? [{ id: "usuarios", rotulo: "Gerenciar Usuários", href: "/dashboard/usuarios" }] : []; // Mantém contas restritas aos perfis já autorizados.
  return [...modulos, { id: "relatorios", rotulo: "Relatórios", href: "/dashboard/relatorios" }, ...contas]; // Relatórios antecede contas, sem ampliar permissões do professor.
}
// Calcula o destaque do menu sem usar parâmetros ou informações pessoais na URL.
export function itemSelecionado(caminho: string, item: ItemGestao): boolean {
  // O endereço original do painel abre alunos, preservando o redirecionamento já usado pelo login.
  return caminho === item.href || (caminho === "/dashboard" && item.id === "alunos");
}
