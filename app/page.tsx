
// Marca este módulo para executar interações e estado no navegador.
"use client";

/*
=====================================================
PROJETO: TEAM BLACK FIGHTER
ARQUIVO: app/page.tsx
OBJETIVO: Tela de login conectada à API
=====================================================
*/

// Importa o componente de imagens do Next.js.
import Image from "next/image";

// Importa os recursos de estado e eventos do React.
import { useState, type FormEvent } from "react";

// Importa o roteador para navegar após o login.
import { useRouter } from "next/navigation";

// Define a página inicial do sistema.
export default function Home() {

  // Permite navegar entre as páginas.
  const router = useRouter();

  // Controla a visibilidade da senha.
  const [mostrarSenha, setMostrarSenha] = useState(false);

  // Armazena mensagens de erro ou aviso.
  const [mensagem, setMensagem] = useState("");

  // Controla o carregamento durante o login.
  const [carregando, setCarregando] = useState(false);

  // Executa quando o formulário é enviado.
  async function enviarFormulario(
    // Define evento com o tipo ou valor exigido por este objeto de dados.
    evento: FormEvent<HTMLFormElement>
  // Conclui a condição composta e inicia o tratamento executado quando ela é atendida.
  ) {

    // Impede que o navegador recarregue a página.
    evento.preventDefault();

    // Evita múltiplas tentativas simultâneas.
    if (carregando) return;

    // Obtém os dados preenchidos no formulário.
    const formulario = new FormData(evento.currentTarget);

    // Recupera o nome de usuário.
    const usuario = String(formulario.get("usuario") ?? "");

    // Recupera a senha digitada.
    const senha = String(formulario.get("senha") ?? "");

    // Limpa mensagens anteriores.
    setMensagem("");

    // Ativa o estado de carregamento.
    setCarregando(true);

    // Inicia o trecho que pode falhar e será protegido pelo tratamento de exceções.
    try {

      // Envia as credenciais para nossa API de login.
      const resposta = await fetch("/api/login", {

        // Define o método HTTP.
        method: "POST",

        // Informa que os dados estão em formato JSON.
        headers: {
          // Fornece este texto ou valor literal ao parâmetro ou à lista em construção.
          "Content-Type": "application/json",
        // Conclui o objeto de dados ou opções passado à operação, preservando a estrutura e o escopo definidos.
        },

        // Converte os dados para JSON.
        body: JSON.stringify({
          // Identificador único usado para acessar o sistema.
          usuario,
          // Senha original mantida apenas durante a validação, sem remoção de espaços.
          senha,
        // Conclui o objeto de dados ou opções passado à operação, preservando a estrutura e o escopo definidos.
        }),

      // Conclui o objeto de dados ou opções passado à operação, preservando a estrutura e o escopo definidos.
      });

      // Interpreta a resposta retornada pelo servidor.
      const resultado = await resposta.json();

      // Verifica se ocorreu erro na autenticação.
      if (!resposta.ok) {

        // Mostra a mensagem recebida da API.
        setMensagem(
          // Usa a mensagem da API ou uma descrição de reserva quando ela não é informada.
          resultado.mensagem ?? "Não foi possível realizar o login."
        // Conclui a condição de validação e seu bloco de tratamento, preservando a estrutura e o escopo definidos.
        );

        // Interrompe o redirecionamento.
        return;
      // Conclui a condição de validação e seu bloco de tratamento, preservando a estrutura e o escopo definidos.
      }

      // Redireciona para a página administrativa.
      router.push("/dashboard");

      // Atualiza os dados do roteador.
      router.refresh();

    // Captura falhas desta operação para apresentar uma resposta controlada.
    } catch {

      // Trata falhas na comunicação com o servidor.
      setMensagem("Erro de conexão. Tente novamente.");

    // Executa a finalização mesmo quando a operação termina com erro.
    } finally {

      // Finaliza o estado de carregamento.
      setCarregando(false);

    // Conclui o bloco de tratamento de falhas da operação, preservando a estrutura e o escopo definidos.
    }
  // Conclui a função enviarFormulario, preservando a estrutura e o escopo definidos.
  }

  // Retorna a estrutura visual da página.
  return (
    // A altura dinâmica acompanha as barras do navegador e deixa o login rolar com o teclado aberto.
    <main className="login-screen relative isolate flex min-h-dvh items-center justify-center overflow-hidden bg-black px-4 py-8 text-white">

      {/* Next entrega uma versão proporcional à largura da tela e otimiza o formato da imagem de fundo. */}
      <Image src="/login-background.png" alt="" fill sizes="100vw" preload className="-z-20 object-cover object-center" />

      {/* Camada escura sobre a imagem. */}
      <div
        // Oculta elementos exclusivamente decorativos de leitores de tela.
        aria-hidden="true"
        // Aplica as classes Tailwind indicadas: disposição, espaçamento e cores do elemento.
        className="absolute inset-0 -z-10 bg-black/40"
      // Conclui as propriedades deste elemento para iniciar seu conteúdo ou encerrar o campo.
      />

      {/* Card com transparência e efeito de vidro. */}
      <section
        // Identifica o texto usado como nome acessível desta seção.
        aria-labelledby="titulo-login"
        // Aplica as classes Tailwind indicadas: disposição, espaçamento e cores do elemento.
        className="login-card w-full max-w-[460px] rounded-[28px] border border-white/25 bg-zinc-950/40 px-6 py-8 shadow-[0_25px_90px_rgba(0,0,0,0.7)] backdrop-blur-sm sm:px-9 sm:py-10"
      // Conclui as propriedades deste elemento para iniciar seu conteúdo ou encerrar o campo.
      >

        {/* Cabeçalho com a identidade da academia. */}
        <header className="text-center">

          {/* Logo original do Team Black Fighter. */}
          <Image
            // Aponta para a imagem local usada pela identidade visual da academia.
            src="/logo-black-fighter.png"
            // Descreve a imagem quando ela não é vista ou é lida por tecnologia assistiva.
            alt="Logo da academia Team Black Fighter"
            // Informa a largura de referência da imagem para reservar seu espaço.
            width={160}
            // Informa a altura de referência da imagem para reservar seu espaço.
            height={160}
            // Prioriza o carregamento desta imagem relevante para a primeira tela.
            priority
            // Aplica as classes Tailwind indicadas: disposição, espaçamento e cores do elemento.
            className="mx-auto h-36 w-36 rounded-full object-cover sm:h-40 sm:w-40"
          // Conclui as propriedades deste elemento para iniciar seu conteúdo ou encerrar o campo.
          />

          {/* Título do sistema. */}
          <h1
            // Identifica este elemento para associá-lo ao rótulo ou à descrição acessível.
            id="titulo-login"
            // Aplica as classes Tailwind indicadas: disposição, espaçamento e cores do elemento.
            className="mt-5 text-xs font-semibold uppercase tracking-[0.35em] text-zinc-200"
          // Conclui as propriedades deste elemento para iniciar seu conteúdo ou encerrar o campo.
          >
            Sistema de Gestão
          {/* Finaliza título principal da tela e mantém os próximos elementos fora desse agrupamento. */}
          </h1>

          {/* Descrição da plataforma. */}
          <p className="mt-4 text-sm leading-6 text-zinc-400">
            Acesse a plataforma para gerenciar alunos,
            mensalidades e desempenho esportivo.
          {/* Finaliza parágrafo de orientação ou retorno da operação e mantém os próximos elementos fora desse agrupamento. */}
          </p>

        {/* Finaliza cabeçalho de identificação da tela e mantém os próximos elementos fora desse agrupamento. */}
        </header>

        {/* Formulário de autenticação. */}
        <form
          // Executa o manipulador de envio sem navegação nativa indesejada.
          onSubmit={enviarFormulario}
          // Aplica as classes Tailwind indicadas: disposição, espaçamento e cores do elemento.
          className="mt-8 space-y-5"
        // Conclui as propriedades deste elemento para iniciar seu conteúdo ou encerrar o campo.
        >

          {/* Campo de usuário. */}
          <div>

            {/* Identificação do campo. */}
            <label
              // Relaciona o rótulo ao campo com o mesmo identificador.
              htmlFor="usuario"
              // Aplica as classes Tailwind indicadas: disposição, espaçamento e cores do elemento.
              className="mb-2 block text-sm font-semibold"
            // Conclui as propriedades deste elemento para iniciar seu conteúdo ou encerrar o campo.
            >
              Usuário
            {/* Finaliza rótulo acessível do campo de entrada e mantém os próximos elementos fora desse agrupamento. */}
            </label>

            {/* Entrada do nome de usuário. */}
            <input
              // Identifica este elemento para associá-lo ao rótulo ou à descrição acessível.
              id="usuario"
              // Nome do campo enviado ao servidor pelo FormData.
              name="usuario"
              // Define o comportamento nativo deste campo ou botão.
              type="text"
              // Controla a sugestão automática de valores conforme a finalidade do campo.
              autoComplete="username"
              // Orientação temporária exibida enquanto o campo está vazio.
              placeholder="Digite seu usuário"
              // Exige o preenchimento antes de permitir o envio pelo navegador.
              required
              // Bloqueia a interação enquanto a operação correspondente está pendente.
              disabled={carregando}
              // Aplica as classes Tailwind indicadas: disposição, espaçamento e cores do elemento.
              className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-white/60 focus:ring-2 focus:ring-white/10"
            // Conclui as propriedades deste elemento para iniciar seu conteúdo ou encerrar o campo.
            />

          {/* Finaliza agrupamento visual dos elementos e mantém os próximos elementos fora desse agrupamento. */}
          </div>

          {/* Campo de senha. */}
          <div>

            {/* Identificação do campo. */}
            <label
              // Relaciona o rótulo ao campo com o mesmo identificador.
              htmlFor="senha"
              // Aplica as classes Tailwind indicadas: disposição, espaçamento e cores do elemento.
              className="mb-2 block text-sm font-semibold"
            // Conclui as propriedades deste elemento para iniciar seu conteúdo ou encerrar o campo.
            >
              Senha
            {/* Finaliza rótulo acessível do campo de entrada e mantém os próximos elementos fora desse agrupamento. */}
            </label>

            {/* Container para posicionamento do botão Mostrar. */}
            <div className="relative">

              {/* Entrada da senha. */}
              <input
                // Identifica este elemento para associá-lo ao rótulo ou à descrição acessível.
                id="senha"
                // Nome do campo enviado ao servidor pelo FormData.
                name="senha"
                // Define o comportamento nativo deste campo ou botão.
                type={mostrarSenha ? "text" : "password"}
                // Controla a sugestão automática de valores conforme a finalidade do campo.
                autoComplete="current-password"
                // Orientação temporária exibida enquanto o campo está vazio.
                placeholder="Digite sua senha"
                // Exige o preenchimento antes de permitir o envio pelo navegador.
                required
                // Bloqueia a interação enquanto a operação correspondente está pendente.
                disabled={carregando}
                // Aplica as classes Tailwind indicadas: disposição, espaçamento e cores do elemento.
                className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 pr-24 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-white/60 focus:ring-2 focus:ring-white/10"
              // Conclui as propriedades deste elemento para iniciar seu conteúdo ou encerrar o campo.
              />

              {/* Alterna a visibilidade da senha. */}
              <button
                // Define o comportamento nativo deste campo ou botão.
                type="button"
                // Executa a ação correspondente ao clique do usuário.
                onClick={() => setMostrarSenha(!mostrarSenha)}
                // Fornece uma descrição acessível para um controle sem rótulo próprio.
                aria-label={
                  // Atualiza a descrição acessível do botão de acordo com a visibilidade atual da senha.
                  mostrarSenha ? "Ocultar senha" : "Mostrar senha"
                // Conclui a função Home, preservando a estrutura e o escopo definidos.
                }
                // Aplica as classes Tailwind indicadas: disposição, espaçamento e cores do elemento.
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-zinc-300 hover:text-white"
              // Conclui as propriedades deste elemento para iniciar seu conteúdo ou encerrar o campo.
              >
                {/* Insere o resultado desta expressão React no conteúdo exibido ao usuário. */}
                {mostrarSenha ? "Ocultar" : "Mostrar"}
              {/* Finaliza controle que executa a ação indicada pelo texto e mantém os próximos elementos fora desse agrupamento. */}
              </button>

            {/* Finaliza agrupamento visual dos elementos e mantém os próximos elementos fora desse agrupamento. */}
            </div>
          {/* Finaliza agrupamento visual dos elementos e mantém os próximos elementos fora desse agrupamento. */}
          </div>

          {/* Botão para iniciar a autenticação. */}
          <button
            // Define o comportamento nativo deste campo ou botão.
            type="submit"
            // Bloqueia a interação enquanto a operação correspondente está pendente.
            disabled={carregando}
            // Aplica as classes Tailwind indicadas: disposição, espaçamento e cores do elemento.
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-3.5 text-sm font-bold text-black transition-colors hover:bg-zinc-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-60"
          // Conclui as propriedades deste elemento para iniciar seu conteúdo ou encerrar o campo.
          >

            {/* Exibe o carregamento durante a autenticação. */}
            {carregando ? "Verificando acesso..." : "Entrar no sistema"}

            {/* Seta visual do botão. */}
            {!carregando && (
              // Apresenta trecho visual ou indicador de situação com as propriedades e os estilos definidos nesta linha.
              <span aria-hidden="true">→</span>
            // Conclui a função Home, preservando a estrutura e o escopo definidos.
            )}

          {/* Finaliza controle que executa a ação indicada pelo texto e mantém os próximos elementos fora desse agrupamento. */}
          </button>

          {/* Exibe os erros retornados pela API. */}
          {mensagem && (
            // Apresenta parágrafo de orientação ou retorno da operação com as propriedades e os estilos definidos nesta linha.
            <p
              // Identifica a finalidade acessível deste elemento para tecnologias assistivas.
              role="alert"
              // Aplica as classes Tailwind indicadas: disposição, espaçamento e cores do elemento.
              className="text-center text-xs leading-5 text-red-300"
            // Conclui as propriedades deste elemento para iniciar seu conteúdo ou encerrar o campo.
            >
              {/* Insere o resultado desta expressão React no conteúdo exibido ao usuário. */}
              {mensagem}
            {/* Finaliza parágrafo de orientação ou retorno da operação e mantém os próximos elementos fora desse agrupamento. */}
            </p>
          // Conclui a função Home, preservando a estrutura e o escopo definidos.
          )}

        {/* Finaliza formulário que reúne os campos e controla seu envio e mantém os próximos elementos fora desse agrupamento. */}
        </form>

        {/* Rodapé da tela de login. */}
        <footer className="mt-8 border-t border-white/15 pt-5 text-center text-xs text-zinc-400">
          Team Black Fighter • Acesso de professores
        {/* Finaliza rodapé informativo da tela e mantém os próximos elementos fora desse agrupamento. */}
        </footer>

      {/* Finaliza seção com conteúdo relacionado e mantém os próximos elementos fora desse agrupamento. */}
      </section>
    {/* Finaliza área principal da página e mantém os próximos elementos fora desse agrupamento. */}
    </main>
  // Conclui a função Home, preservando a estrutura e o escopo definidos.
  );
// Conclui a função Home, preservando a estrutura e o escopo definidos.
}
