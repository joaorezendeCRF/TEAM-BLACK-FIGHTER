// O formulário recebe dados públicos e versão; autorização é repetida no servidor.
import EditarUsuario from "./editar-usuario";
// A matriz impede editar a própria conta e qualquer principal.
import { podeEditarConta, versaoConta } from "@/lib/edicao-usuario";
// Mostra o gerenciamento de situação e exclusão exclusivamente ao administrador principal.
import AcoesConta from "./acoes-conta";
// Mantém a confirmação verde fora da linha que pode ser removida da tabela.
import FeedbackContas from "./feedback-contas";
// A aparência envolve somente a apresentação; autorização e consulta continuam no servidor.
import TemaUsuarios from "./tema-usuarios";

/*
=====================================================
PROJETO: TEAM BLACK FIGHTER
ARQUIVO: app/dashboard/usuarios/page.tsx
OBJETIVO: Listar usuários cadastrados no sistema
=====================================================
*/

// Disponibiliza o formulário de redefinição apenas para contas de professores.
import RedefinirSenha from "./redefinir-senha";

// Disponibiliza o cadastro com seleção de permissão administrativa.
import CriarUsuario from "./criar-usuario";

// Importa o Suspense do React.
import { Suspense } from "react";

// Importa o componente de navegação.
import Link from "next/link";

// Importa o redirecionamento do Next.js.
import { redirect } from "next/navigation";

// Importa a verificação administrativa.
import { obterAdministrador } from "@/lib/autorizacao";

// Importa a conexão com o MySQL.
import pool from "@/lib/mysql";

// Importa a tipagem das consultas SQL.
import type { RowDataPacket } from "mysql2";

// Define os dados retornados pelo banco.
interface UsuarioBanco extends RowDataPacket {
  // Identificador inteiro que localiza uma única conta no banco.
  id: number;
  // Nome de apresentação da pessoa, separado do identificador de login.
  nome: string;
  // Identificador único usado para acessar o sistema.
  usuario: string;
  // Contato opcional; null permite contas sem e-mail sem conflitar com o índice único.
  email: string | null;
  // Nível de acesso usado pelo servidor para autorizar operações.
  perfil: string;
  // Situação da conta; somente contas ativas podem autenticar ou autorizar alterações.
  ativo: number;
// Conclui a estrutura de tipos UsuarioBanco, preservando a estrutura e o escopo definidos.
}

// Converte o perfil em um nome amigável.
function nomePerfil(perfil: string): string {
  // Verifica (perfil === "admin_principal") antes de permitir a continuação desta operação.
  if (perfil === "admin_principal") {
    // Retorna este resultado ao chamador e encerra o caminho atual da função.
    return "Administrador principal";
  // Conclui a condição de validação e seu bloco de tratamento, preservando a estrutura e o escopo definidos.
  }

  // Verifica (perfil === "administrador") antes de permitir a continuação desta operação.
  if (perfil === "administrador") {
    // Retorna este resultado ao chamador e encerra o caminho atual da função.
    return "Administrador";
  // Conclui a condição de validação e seu bloco de tratamento, preservando a estrutura e o escopo definidos.
  }

  // Retorna este resultado ao chamador e encerra o caminho atual da função.
  return "Professor";
// Conclui a função nomePerfil, preservando a estrutura e o escopo definidos.
}

// Carrega o conteúdo protegido da página.
async function ConteudoUsuarios() {

  // Verifica a autorização do usuário.
  const administrador = await obterAdministrador();

  // Bloqueia o acesso sem permissão.
  if (!administrador) {
    // Redireciona à página permitida quando a sessão não autoriza este acesso.
    redirect("/dashboard");
  // Conclui a condição de validação e seu bloco de tratamento, preservando a estrutura e o escopo definidos.
  }

  // Consulta os usuários cadastrados.
  // Não consulta nem exibe hashes de senha.
  const [usuarios] = await pool.execute<UsuarioBanco[]>(
    // Inicia a consulta parametrizada que lê os campos necessários da tabela existente.
    `SELECT
       -- Continua a seleção parametrizada desta instrução SQL.
       id,
       -- Continua a seleção parametrizada desta instrução SQL.
       nome,
       -- Continua a seleção parametrizada desta instrução SQL.
       usuario,
       -- Continua a seleção parametrizada desta instrução SQL.
       email,
       -- Continua a seleção parametrizada desta instrução SQL.
       perfil,
       -- Continua a seleção parametrizada desta instrução SQL.
       ativo
     -- Lê a tabela existente, sem criar ou remover estruturas.
     FROM professores
     -- Ordena o resultado para apresentar a listagem de maneira previsível.
     ORDER BY nome ASC`
  // Conclui a função ConteudoUsuarios, preservando a estrutura e o escopo definidos.
  );

  // Apresenta a página de gerenciamento.
  return (
    // Apresenta área principal da página com as propriedades e os estilos definidos nesta linha.
    <TemaUsuarios><main className="bg-zinc-950 text-white">

      {/* Apresenta agrupamento visual dos elementos com as propriedades e os estilos definidos nesta linha. */}
      <div className="mx-auto w-full">

        {/* Navegação para o Dashboard. */}
        <Link
          // Define a página interna acessada ao ativar este link.
          href="/dashboard"
          // Aplica as classes Tailwind indicadas: disposição, espaçamento e cores do elemento.
          className="text-sm text-zinc-400 transition hover:text-white"
        // Conclui as propriedades deste elemento para iniciar seu conteúdo ou encerrar o campo.
        >
          ← Voltar ao Dashboard
        {/* Finaliza link de navegação interna do Next.js e mantém os próximos elementos fora desse agrupamento. */}
        </Link>

        {/* Cabeçalho da página. */}
        <header className="mt-8">

          {/* Apresenta parágrafo de orientação ou retorno da operação com as propriedades e os estilos definidos nesta linha. */}
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
            Team Black Fighter
          {/* Finaliza parágrafo de orientação ou retorno da operação e mantém os próximos elementos fora desse agrupamento. */}
          </p>

          {/* Apresenta título principal da tela com as propriedades e os estilos definidos nesta linha. */}
          <h1 className="mt-4 text-3xl font-bold">
            Gerenciar Usuários
          {/* Finaliza título principal da tela e mantém os próximos elementos fora desse agrupamento. */}
          </h1>

          {/* Apresenta parágrafo de orientação ou retorno da operação com as propriedades e os estilos definidos nesta linha. */}
          <p className="mt-3 text-sm text-zinc-400">
            Consulte as contas cadastradas e seus níveis de acesso.
          {/* Finaliza parágrafo de orientação ou retorno da operação e mantém os próximos elementos fora desse agrupamento. */}
          </p>

        {/* Finaliza cabeçalho de identificação da tela e mantém os próximos elementos fora desse agrupamento. */}
        </header>

        {/* Informações gerais. */}
        <section className="mt-8 rounded-2xl border border-white/15 bg-white/5 p-6">

          {/* Apresenta parágrafo de orientação ou retorno da operação com as propriedades e os estilos definidos nesta linha. */}
          <p className="text-sm text-zinc-400">
            Total de usuários cadastrados
          {/* Finaliza parágrafo de orientação ou retorno da operação e mantém os próximos elementos fora desse agrupamento. */}
          </p>

          {/* Apresenta parágrafo de orientação ou retorno da operação com as propriedades e os estilos definidos nesta linha. */}
          <p className="mt-2 text-3xl font-bold">
            {/* Insere o resultado desta expressão React no conteúdo exibido ao usuário. */}
            {usuarios.length}
          {/* Finaliza parágrafo de orientação ou retorno da operação e mantém os próximos elementos fora desse agrupamento. */}
          </p>

        {/* Finaliza seção com conteúdo relacionado e mantém os próximos elementos fora desse agrupamento. */}
        </section>

        {/* O cadastro só é renderizado depois da autorização administrativa. */}
        <CriarUsuario />
        {/* Diagnóstico técnico fica restrito ao principal, inclusive no acesso direto à página. */}
        {administrador.perfil === "admin_principal" && <Link className="reset-password-trigger mt-4" href="/dashboard/logs">Logs do sistema</Link>}

        {/* Listagem de usuários. */}
        <FeedbackContas>
        {/* Preserva a tabela no servidor e mantém o retorno das operações fora de suas linhas. */}
        <section className="mt-8 overflow-hidden rounded-2xl border border-white/15">

          {/* Apresenta agrupamento visual dos elementos com as propriedades e os estilos definidos nesta linha. */}
          <div className="border-b border-white/15 bg-white/5 px-5 py-4">
            {/* Apresenta título desta seção com as propriedades e os estilos definidos nesta linha. */}
            <h2 className="font-semibold">
              Usuários cadastrados
            {/* Finaliza título desta seção e mantém os próximos elementos fora desse agrupamento. */}
            </h2>
          {/* Finaliza agrupamento visual dos elementos e mantém os próximos elementos fora desse agrupamento. */}
          </div>

          {/* Apresenta agrupamento visual dos elementos com as propriedades e os estilos definidos nesta linha. */}
          <div className="overflow-x-auto">

            {/* Reduz o espaçamento das células e remove larguras vazias dos controles fechados para aproximar as colunas. */}
            <table role="table" data-mobile-cards className="w-full min-w-175 text-left text-sm [&_td]:align-middle">

              {/* Apresenta cabeçalho das colunas da tabela com as propriedades e os estilos definidos nesta linha. */}
              <thead role="rowgroup" className="bg-white/5 text-zinc-400">
                {/* Apresenta linha da tabela com as propriedades e os estilos definidos nesta linha. */}
                <tr role="row">
                  {/* Apresenta identificação de uma coluna da tabela com as propriedades e os estilos definidos nesta linha. */}
                  <th role="columnheader" className="px-3 py-3">Nome</th>
                  {/* Apresenta identificação de uma coluna da tabela com as propriedades e os estilos definidos nesta linha. */}
                  <th role="columnheader" className="px-3 py-3">Usuário</th>
                  {/* Apresenta identificação de uma coluna da tabela com as propriedades e os estilos definidos nesta linha. */}
                  <th role="columnheader" className="px-3 py-3">Perfil</th>
                  {/* Apresenta identificação de uma coluna da tabela com as propriedades e os estilos definidos nesta linha. */}
                  <th role="columnheader" className="px-3 py-3">Situação</th>
                  {/* Apresenta identificação de uma coluna da tabela com as propriedades e os estilos definidos nesta linha. */}
                  <th role="columnheader" className="px-3 py-3">Ações</th>
                  {/* Somente o administrador principal visualiza a coluna de controle das contas. */}
                  {administrador.perfil === "admin_principal" && <th role="columnheader" className="px-3 py-3">Gerenciar conta</th>}
                {/* Finaliza linha da tabela e mantém os próximos elementos fora desse agrupamento. */}
                </tr>
              {/* Finaliza cabeçalho das colunas da tabela e mantém os próximos elementos fora desse agrupamento. */}
              </thead>

              {/* Apresenta conjunto de usuários retornados pela consulta com as propriedades e os estilos definidos nesta linha. */}
              <tbody role="rowgroup">

                {/* Define o comportamento executado para cada evento ou item recebido por esta função. */}
                {usuarios.map((usuario) => (

                  // Apresenta linha da tabela com as propriedades e os estilos definidos nesta linha.
                  <tr role="row"
                    // Distingue itens ou operações para controlar a preservação e o reinício do estado.
                    key={usuario.id}
                    // Aplica as classes Tailwind indicadas: disposição, espaçamento e cores do elemento.
                    className="border-t border-white/10"
                  // Conclui as propriedades deste elemento para iniciar seu conteúdo ou encerrar o campo.
                  >

                    {/* Apresenta célula da tabela com a informação da conta com as propriedades e os estilos definidos nesta linha. */}
                    <td role="cell" data-label="Nome" className="px-3 py-3 font-medium">
                      {/* Insere o resultado desta expressão React no conteúdo exibido ao usuário. */}
                      {usuario.nome}
                    {/* Finaliza célula da tabela com a informação da conta e mantém os próximos elementos fora desse agrupamento. */}
                    </td>

                    {/* Apresenta célula da tabela com a informação da conta com as propriedades e os estilos definidos nesta linha. */}
                    <td role="cell" data-label="Usuário" className="px-3 py-3 text-zinc-300">
                      {/* Insere o resultado desta expressão React no conteúdo exibido ao usuário. */}
                      {usuario.usuario}
                    {/* Finaliza célula da tabela com a informação da conta e mantém os próximos elementos fora desse agrupamento. */}
                    </td>

                    {/* Apresenta célula da tabela com a informação da conta com as propriedades e os estilos definidos nesta linha. */}
                    <td role="cell" data-label="Perfil" className="px-3 py-3 text-zinc-300">
                      {/* Insere o resultado desta expressão React no conteúdo exibido ao usuário. */}
                      {nomePerfil(usuario.perfil)}
                    {/* Finaliza célula da tabela com a informação da conta e mantém os próximos elementos fora desse agrupamento. */}
                    </td>

                    {/* Apresenta célula da tabela com a informação da conta com as propriedades e os estilos definidos nesta linha. */}
                    <td role="cell" data-label="Situação" className="px-3 py-3">

                      {/* Apresenta trecho visual ou indicador de situação com as propriedades e os estilos definidos nesta linha. */}
                      <span
                        // Aplica as classes Tailwind indicadas: disposição, espaçamento e cores do elemento.
                        className={
                          // Seleciona a cor do selo a partir da situação atual da conta.
                          usuario.ativo
                            // Usa selo arredondado verde translúcido para identificar a conta ativa.
                            ? "rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-400"
                            // Usa selo arredondado vermelho translúcido para identificar a conta inativa.
                            : "rounded-full bg-red-500/15 px-3 py-1 text-xs font-semibold text-red-400"
                        // Conclui o manipulador ou retorno assíncrono da operação, preservando a estrutura e o escopo definidos.
                        }
                      // Conclui as propriedades deste elemento para iniciar seu conteúdo ou encerrar o campo.
                      >
                        {/* Insere o resultado desta expressão React no conteúdo exibido ao usuário. */}
                        {usuario.ativo ? "Ativo" : "Inativo"}
                      {/* Finaliza trecho visual ou indicador de situação e mantém os próximos elementos fora desse agrupamento. */}
                      </span>

                    {/* Finaliza célula da tabela com a informação da conta e mantém os próximos elementos fora desse agrupamento. */}
                    </td>

                    {/* A interface limita a ação a professores; o servidor verifica novamente. */}
                    <td role="cell" data-label="Ações" className="px-3 py-3">
                      {/* Edição e senha têm ações independentes; contas protegidas não recebem formulário. */}
                      <div className="flex flex-col items-start gap-2">
                        {/* A chave muda quando os dados mudam, reiniciando campos com a versão atual. */}
                        {podeEditarConta(administrador, usuario) && <EditarUsuario key={versaoConta(usuario)} conta={{ id: usuario.id, nome: usuario.nome, usuario: usuario.usuario, email: usuario.email, perfil: usuario.perfil, ativo: usuario.ativo }} versao={versaoConta(usuario)} alteraPerfil={administrador.perfil === "admin_principal"} />}
                        {/* Redefinição existente permanece separada da correção cadastral. */}
                        {usuario.perfil === "professor" ? <RedefinirSenha professorId={usuario.id} nome={usuario.nome} /> : !podeEditarConta(administrador, usuario) ? "—" : null}
                      </div>
                    {/* Finaliza célula da tabela com a informação da conta e mantém os próximos elementos fora desse agrupamento. */}
                    </td>
                    {/* A situação e a exclusão são exclusivas do administrador principal, inclusive no servidor. */}
                    {administrador.perfil === "admin_principal" && (
                      // Mantém a coluna alinhada também nas contas protegidas que não oferecem controles.
                      <td role="cell" data-label="Gerenciar conta" className="px-3 py-3">
                        {/* A própria conta e todos os administradores principais ficam protegidos. */}
                        {usuario.id !== administrador.id && ["professor", "administrador"].includes(usuario.perfil) ? <AcoesConta id={usuario.id} nome={usuario.nome} usuario={usuario.usuario} ativo={Boolean(usuario.ativo)} /> : <span className="text-xs text-zinc-500">Conta protegida</span>}
                      {/* Finaliza a célula de gerenciamento da conta. */}
                      </td>
                    // Finaliza a exibição condicional exclusiva do desenvolvedor.
                    )}
                  {/* Finaliza linha da tabela e mantém os próximos elementos fora desse agrupamento. */}
                  </tr>

                // Conclui o manipulador ou retorno assíncrono da operação, preservando a estrutura e o escopo definidos.
                ))}

              {/* Finaliza conjunto de usuários retornados pela consulta e mantém os próximos elementos fora desse agrupamento. */}
              </tbody>

            {/* Finaliza tabela de usuários cadastrados e mantém os próximos elementos fora desse agrupamento. */}
            </table>

          {/* Finaliza agrupamento visual dos elementos e mantém os próximos elementos fora desse agrupamento. */}
          </div>

        {/* Finaliza seção com conteúdo relacionado e mantém os próximos elementos fora desse agrupamento. */}
        </section>
        {/* Finaliza a área cujo aviso de sucesso sobrevive à exclusão de uma linha. */}
        </FeedbackContas>

        {/* Informação sobre as próximas funções. */}
        <p className="mt-6 text-sm text-zinc-500">
          Edite nome, usuário e e-mail com confirmação da sua senha. Alterações de perfil são exclusivas do administrador principal.
        {/* Finaliza parágrafo de orientação ou retorno da operação e mantém os próximos elementos fora desse agrupamento. */}
        </p>

      {/* Finaliza agrupamento visual dos elementos e mantém os próximos elementos fora desse agrupamento. */}
      </div>

    {/* Finaliza área principal da página e mantém os próximos elementos fora desse agrupamento. */}
    </main></TemaUsuarios>
  // Conclui a função ConteudoUsuarios, preservando a estrutura e o escopo definidos.
  );
// Conclui a função ConteudoUsuarios, preservando a estrutura e o escopo definidos.
}

// Página de gerenciamento de usuários.
export default function PaginaUsuarios() {

  // Aguarda a autenticação e a consulta ao banco.
  return (
    // Apresenta limite que aguarda dados assíncronos da tela com as propriedades e os estilos definidos nesta linha.
    <Suspense
      // Conteúdo exibido enquanto os dados protegidos ainda estão carregando.
      fallback={
        // Apresenta área principal da página com as propriedades e os estilos definidos nesta linha.
        <main className="flex min-h-80 items-center justify-center bg-zinc-950 text-zinc-400">
          Carregando usuários...
        {/* Finaliza área principal da página e mantém os próximos elementos fora desse agrupamento. */}
        </main>
      // Conclui a função PaginaUsuarios, preservando a estrutura e o escopo definidos.
      }
    // Conclui as propriedades deste elemento para iniciar seu conteúdo ou encerrar o campo.
    >
      {/* Apresenta componente ConteudoUsuarios com as propriedades e os estilos definidos nesta linha. */}
      <ConteudoUsuarios />
    {/* Finaliza limite que aguarda dados assíncronos da tela e mantém os próximos elementos fora desse agrupamento. */}
    </Suspense>
  // Conclui a função PaginaUsuarios, preservando a estrutura e o escopo definidos.
  );
// Conclui a função PaginaUsuarios, preservando a estrutura e o escopo definidos.
}




