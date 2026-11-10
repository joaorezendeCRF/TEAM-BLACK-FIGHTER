// Marca este módulo para executar interações e estado no navegador.
"use client";

// O cadastro usa uma ação de servidor; segredos não são guardados em estado React.
import { useActionState, useId, useRef, useState } from "react";
// Importa os recursos de @/lib/cadastro-usuario usados pelas operações deste arquivo.
import type { ResultadoCadastro } from "@/lib/cadastro-usuario";
// Compartilha a confirmação verde temporária com a redefinição de senhas.
import MensagemSucesso from "./mensagem-sucesso";
// Importa os recursos de ./criar-usuario-action usados pelas operações deste arquivo.
import { criarUsuario } from "./criar-usuario-action";

/** Formulário recolhível de cadastro com permissão administrativa desmarcada por padrão. */
// Define CriarUsuario e seus parâmetros; as próximas linhas implementam essa responsabilidade.
export default function CriarUsuario() {
  // Mantém detalhes como referência estável sem provocar renderizações adicionais.
  const detalhes = useRef<HTMLDetailsElement>(null);
  // Inicializa [administrador, definirAdministrador] com seu valor inicial e a função que atualiza esse estado visual.
  const [administrador, definirAdministrador] = useState(false);
  // Uma nova chave reinicia os três segundos mesmo em sucessos consecutivos.
  const [sucessoId, definirSucessoId] = useState(0);
  // Prepara prefixo com o valor indicado para uso nas próximas etapas deste fluxo.
  const prefixo = useId();
  // Associa o resultado, o envio e o estado pendente à ação protegida de servidor.
  const [estado, enviar, pendente] = useActionState<ResultadoCadastro, FormData>(async (anterior, dados: FormData) => {
    // Aguarda o resultado de criarUsuario(anterior, dados) e o guarda em resultado.
    const resultado = await criarUsuario(anterior, dados);
    // Fecha somente após a criação efetiva; uma falha continua visível no formulário.
    if (resultado.sucesso) {
      // Verifica (detalhes.current) detalhes.current.open = false; antes de permitir a continuação desta operação.
      if (detalhes.current) detalhes.current.open = false;
      // Atualiza o estado visual indicado para refletir o andamento desta interação.
      definirAdministrador(false);
      // Reinicia a confirmação de sucesso desta operação.
      definirSucessoId((anterior) => anterior + 1);
    // Conclui a condição de validação e seu bloco de tratamento, preservando a estrutura e o escopo definidos.
    }
    // Retorna este resultado ao chamador e encerra o caminho atual da função.
    return resultado;
  // Conclui o manipulador e inicializa o estado da ação sem mensagem nem sucesso anterior.
  }, { sucesso: false, mensagem: "" });
  // Prepara campo com o valor indicado para uso nas próximas etapas deste fluxo.
  const campo = "mt-2 w-full rounded-lg border border-white/20 bg-zinc-950 px-3 py-2 text-white";

  // Inicia a estrutura visual retornada por este componente.
  return (
    // Apresenta seção com conteúdo relacionado com as propriedades e os estilos definidos nesta linha.
    <section className="create-user-section mt-8">
      {/* Apresenta painel recolhível que começa fechado e é recolhido após o sucesso com as propriedades e os estilos definidos nesta linha. */}
      <details ref={detalhes}>
        {/* Apresenta controle que abre ou fecha o painel com as propriedades e os estilos definidos nesta linha. */}
        <summary className="create-user-trigger">
          {/* Ícone e instrução identificam uma ação de cadastro, mantendo abertura nativa pelo teclado. */}
          <span className="create-user-icon" aria-hidden="true">+</span><span>Criar usuário<small>Cadastre professores e administradores</small></span><span className="create-user-chevron" aria-hidden="true">⌄</span>
        </summary>
        {/* Apresenta formulário que reúne os campos e controla seu envio com as propriedades e os estilos definidos nesta linha. */}
        <form autoComplete="off" action={enviar} className="mt-6">
          {/* O fieldset impede alterações ou novos envios enquanto a criação está pendente. */}
          <fieldset disabled={pendente} className="grid gap-5 sm:grid-cols-2 disabled:opacity-60">
            {/* Apresenta agrupamento visual dos elementos com as propriedades e os estilos definidos nesta linha. */}
            <div>
              {/* Apresenta rótulo acessível do campo de entrada com as propriedades e os estilos definidos nesta linha. */}
              <label htmlFor={prefixo + "-nome"}>Nome</label>
              {/* Apresenta campo de entrada com validação nativa e proteção adicional no servidor com as propriedades e os estilos definidos nesta linha. */}
              <input id={prefixo + "-nome"} name="nome" required maxLength={150} autoComplete="off" className={campo} />
            {/* Finaliza agrupamento visual dos elementos e mantém os próximos elementos fora desse agrupamento. */}
            </div>
            {/* Apresenta agrupamento visual dos elementos com as propriedades e os estilos definidos nesta linha. */}
            <div>
              {/* Apresenta rótulo acessível do campo de entrada com as propriedades e os estilos definidos nesta linha. */}
              <label htmlFor={prefixo + "-usuario"}>Usuário de acesso</label>
              {/* Apresenta campo de entrada com validação nativa e proteção adicional no servidor com as propriedades e os estilos definidos nesta linha. */}
              <input id={prefixo + "-usuario"} name="usuario" required maxLength={50} pattern="[a-zA-Z0-9._\-]+" autoComplete="off" aria-describedby={prefixo + "-usuario-ajuda"} className={campo} />
              {/* Apresenta parágrafo de orientação ou retorno da operação com as propriedades e os estilos definidos nesta linha. */}
              <p id={prefixo + "-usuario-ajuda"} className="mt-1 text-xs text-zinc-400">Letras sem acento, números, ponto, hífen ou sublinhado.</p>
            {/* Finaliza agrupamento visual dos elementos e mantém os próximos elementos fora desse agrupamento. */}
            </div>
            {/* Apresenta agrupamento visual dos elementos com as propriedades e os estilos definidos nesta linha. */}
            <div className="sm:col-span-2">
              {/* Apresenta rótulo acessível do campo de entrada com as propriedades e os estilos definidos nesta linha. */}
              <label htmlFor={prefixo + "-email"}>E-mail (opcional)</label>
              {/* Apresenta campo de entrada com validação nativa e proteção adicional no servidor com as propriedades e os estilos definidos nesta linha. */}
              <input id={prefixo + "-email"} name="email" type="email" maxLength={150} autoComplete="off" className={campo} />
            {/* Finaliza agrupamento visual dos elementos e mantém os próximos elementos fora desse agrupamento. */}
            </div>
            {/* Uma única opção explícita escolhe entre professor e administrador comum. */}
            <div className="rounded-xl border border-white/15 bg-zinc-950 p-4 sm:col-span-2">
              {/* Apresenta rótulo acessível do campo de entrada com as propriedades e os estilos definidos nesta linha. */}
              <label htmlFor={prefixo + "-admin"} className="flex cursor-pointer items-center gap-3 font-medium">
                {/* Apresenta campo de entrada com validação nativa e proteção adicional no servidor com as propriedades e os estilos definidos nesta linha. */}
                <input id={prefixo + "-admin"} name="administrador" type="checkbox" checked={administrador} onChange={(evento) => definirAdministrador(evento.target.checked)} className="size-5 accent-white" />
                Permitir acesso de administrador
              {/* Finaliza rótulo acessível do campo de entrada e mantém os próximos elementos fora desse agrupamento. */}
              </label>
              {/* Apresenta parágrafo de orientação ou retorno da operação com as propriedades e os estilos definidos nesta linha. */}
              <p className="mt-2 text-sm text-zinc-400">
                {/* Insere o resultado desta expressão React no conteúdo exibido ao usuário. */}
                {administrador ? "Administrador: poderá gerenciar usuários e redefinir senhas de professores." : "Professor: terá acesso ao sistema sem gerenciar usuários."}
              {/* Finaliza parágrafo de orientação ou retorno da operação e mantém os próximos elementos fora desse agrupamento. */}
              </p>
            {/* Finaliza agrupamento visual dos elementos e mantém os próximos elementos fora desse agrupamento. */}
            </div>
            {/* A regra de senha de novos administradores permanece explícita na interface. */}
            <div>
              {/* Apresenta rótulo acessível do campo de entrada com as propriedades e os estilos definidos nesta linha. */}
              <label htmlFor={prefixo + "-senha"}>Senha do novo usuário</label>
              {/* Apresenta campo de entrada com validação nativa e proteção adicional no servidor com as propriedades e os estilos definidos nesta linha. */}
              <input id={prefixo + "-senha"} name="senha" type="password" required minLength={administrador ? 6 : undefined} maxLength={1024} autoComplete="new-password" aria-describedby={prefixo + "-senha-ajuda"} className={campo} />
              {/* Apresenta parágrafo de orientação ou retorno da operação com as propriedades e os estilos definidos nesta linha. */}
              <p id={prefixo + "-senha-ajuda"} className="mt-1 text-xs text-zinc-400">{administrador ? "Para administrador, mínimo de 6 caracteres." : "Senha livre; não pode ficar vazia."}</p>
            {/* Finaliza agrupamento visual dos elementos e mantém os próximos elementos fora desse agrupamento. */}
            </div>
            {/* Apresenta agrupamento visual dos elementos com as propriedades e os estilos definidos nesta linha. */}
            <div>
              {/* Apresenta rótulo acessível do campo de entrada com as propriedades e os estilos definidos nesta linha. */}
              <label htmlFor={prefixo + "-confirmacao"}>Confirmar senha</label>
              {/* Apresenta campo de entrada com validação nativa e proteção adicional no servidor com as propriedades e os estilos definidos nesta linha. */}
              <input id={prefixo + "-confirmacao"} name="confirmacao" type="password" required maxLength={1024} autoComplete="new-password" className={campo} />
            {/* Finaliza agrupamento visual dos elementos e mantém os próximos elementos fora desse agrupamento. */}
            </div>
            {/* Reautentica o criador sem alterar sua senha ou sua sessão. */}
            <div className="sm:col-span-2">
              {/* Apresenta rótulo acessível do campo de entrada com as propriedades e os estilos definidos nesta linha. */}
              <label htmlFor={prefixo + "-senha-admin"}>Sua senha de administrador</label>
              {/* Apresenta campo de entrada com validação nativa e proteção adicional no servidor com as propriedades e os estilos definidos nesta linha. */}
              <input id={prefixo + "-senha-admin"} name="senhaAdministrador" type="password" required maxLength={1024} autoComplete="current-password" className={campo} />
            {/* Finaliza agrupamento visual dos elementos e mantém os próximos elementos fora desse agrupamento. */}
            </div>
            {/* Apresenta controle que executa a ação indicada pelo texto com as propriedades e os estilos definidos nesta linha. */}
            <button type="submit" className="w-fit rounded-lg bg-white px-5 py-3 font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-wait">
              {/* Insere o resultado desta expressão React no conteúdo exibido ao usuário. */}
              {pendente ? "Criando..." : "Criar usuário"}
            {/* Finaliza controle que executa a ação indicada pelo texto e mantém os próximos elementos fora desse agrupamento. */}
            </button>
          {/* Finaliza grupo de campos bloqueado durante o processamento e mantém os próximos elementos fora desse agrupamento. */}
          </fieldset>
          {/* Erros permanecem ao lado dos campos para correção imediata. */}
          {!estado.sucesso && <p role="status" className="mt-4 text-sm text-zinc-300">{estado.mensagem}</p>}
        {/* Finaliza formulário que reúne os campos e controla seu envio e mantém os próximos elementos fora desse agrupamento. */}
        </form>
      {/* Finaliza painel recolhível que começa fechado e é recolhido após o sucesso e mantém os próximos elementos fora desse agrupamento. */}
      </details>
      {/* A confirmação aparece em verde por três segundos, mesmo com o formulário fechado. */}
      {estado.sucesso && <MensagemSucesso key={sucessoId} mensagem={estado.mensagem} />}
    {/* Finaliza seção com conteúdo relacionado e mantém os próximos elementos fora desse agrupamento. */}
    </section>
  // Conclui a função CriarUsuario, preservando a estrutura e o escopo definidos.
  );
// Conclui a função CriarUsuario, preservando a estrutura e o escopo definidos.
}




