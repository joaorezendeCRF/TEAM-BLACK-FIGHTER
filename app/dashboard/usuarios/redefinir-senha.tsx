// Marca este módulo para executar interações e estado no navegador.
"use client";

// O estado da ação apresenta o resultado e impede envios repetidos enquanto aguarda.
import { useActionState, useId, useRef, useState } from "react";
// Exibe a confirmação em verde e a remove automaticamente após três segundos.
import MensagemSucesso from "./mensagem-sucesso";
// Importa os recursos de ./actions usados pelas operações deste arquivo.
import { redefinirSenhaProfessor } from "./actions";

/** Formulário recolhível individual; recebe somente o identificador e nome públicos. */
// Define RedefinirSenha e seus parâmetros; as próximas linhas implementam essa responsabilidade.
export default function RedefinirSenha({ professorId, nome }: { professorId: number; nome: string }) {
  // A referência permite fechar o painel após uma resposta bem-sucedida do servidor.
  const detalhes = useRef<HTMLDetailsElement>(null);
  // Diferencia sucessos repetidos para que cada um receba três segundos completos.
  const [sucessoId, definirSucessoId] = useState(0);
  // Associa o resultado, o envio e o estado pendente à ação protegida de servidor.
  const [estado, enviar, pendente] = useActionState<{ sucesso: boolean; mensagem: string }, FormData>(async (anterior, dados: FormData) => {
    // Aguarda o resultado de redefinirSenhaProfessor(anterior, dados) e o guarda em resultado.
    const resultado = await redefinirSenhaProfessor(anterior, dados);
    // Em caso de erro o painel permanece aberto para mostrar a mensagem e corrigir os dados.
    if (resultado.sucesso) {
      // Recolhe o formulário somente quando a alteração foi confirmada pelo servidor.
      if (detalhes.current) detalhes.current.open = false;
      // Renova a mensagem temporária mesmo após outra redefinição bem-sucedida.
      definirSucessoId((anterior) => anterior + 1);
    // Conclui a condição de validação e seu bloco de tratamento, preservando a estrutura e o escopo definidos.
    }
    // Retorna este resultado ao chamador e encerra o caminho atual da função.
    return resultado;
  // Conclui o manipulador e inicializa o estado da ação sem mensagem nem sucesso anterior.
  }, { sucesso: false, mensagem: "" });
  // Prefixos únicos associam os rótulos aos campos, inclusive em várias linhas da tabela.
  const prefixo = useId();
  // Prepara campo com o valor indicado para uso nas próximas etapas deste fluxo.
  const campo = "mt-1 w-full rounded-lg border border-white/20 bg-zinc-950 px-3 py-2 text-white";
  // Inicia a estrutura visual retornada por este componente.
  return (
    // Evita reservar largura vazia para o formulário fechado e mantém seu tamanho máximo ao abrir.
    <div className="max-w-sm">
    {/* Reserva largura para os campos somente enquanto o painel de redefinição estiver aberto. */}
    <details ref={detalhes} className="open:min-w-56">
      {/* Apresenta controle que abre ou fecha o painel com as propriedades e os estilos definidos nesta linha. */}
      <summary className="reset-password-trigger">
        {/* Cadeado identifica a ação de senha sem depender somente de cor; o texto mantém o nome acessível. */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="3" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /><path d="M12 14v3" /></svg>
        {/* O painel continua nativo: Enter e espaço abrem os mesmos campos protegidos pelo servidor. */}
        <span>Redefinir senha</span><span className="reset-password-chevron" aria-hidden="true">⌄</span>
      </summary>
      {/* O formulário mantém a paleta existente e limpa os segredos após o envio. */}
      <form autoComplete="off" action={enviar} className="mt-4 space-y-3">
        {/* Apresenta parágrafo de orientação ou retorno da operação com as propriedades e os estilos definidos nesta linha. */}
        <p className="text-xs text-zinc-400">Redefinir senha de {nome}.</p>
        {/* Apresenta campo de entrada com validação nativa e proteção adicional no servidor com as propriedades e os estilos definidos nesta linha. */}
        <input type="hidden" name="professorId" value={professorId} />
        {/* Apresenta grupo de campos bloqueado durante o processamento com as propriedades e os estilos definidos nesta linha. */}
        <fieldset disabled={pendente} className="space-y-3 disabled:opacity-60">
          {/* A senha atual pertence ao administrador que está conectado. */}
          <div>
            {/* Apresenta rótulo acessível do campo de entrada com as propriedades e os estilos definidos nesta linha. */}
            <label htmlFor={prefixo + "-admin"}>Sua senha de administrador</label>
            {/* Apresenta campo de entrada com validação nativa e proteção adicional no servidor com as propriedades e os estilos definidos nesta linha. */}
            <input id={prefixo + "-admin"} name="senhaAdministrador" type="password" autoComplete="current-password" required maxLength={1024} className={campo} />
          {/* Finaliza agrupamento visual dos elementos e mantém os próximos elementos fora desse agrupamento. */}
          </div>
          {/* Aceita qualquer senha não vazia; mantém a confirmação e a validação no servidor. */}
          <div>
            {/* Apresenta rótulo acessível do campo de entrada com as propriedades e os estilos definidos nesta linha. */}
            <label htmlFor={prefixo + "-nova"}>Nova senha do professor</label>
            {/* Apresenta campo de entrada com validação nativa e proteção adicional no servidor com as propriedades e os estilos definidos nesta linha. */}
            <input id={prefixo + "-nova"} name="novaSenha" type="password" autoComplete="new-password" required maxLength={1024} className={campo} />
          {/* Finaliza agrupamento visual dos elementos e mantém os próximos elementos fora desse agrupamento. */}
          </div>
          {/* Apresenta agrupamento visual dos elementos com as propriedades e os estilos definidos nesta linha. */}
          <div>
            {/* Apresenta rótulo acessível do campo de entrada com as propriedades e os estilos definidos nesta linha. */}
            <label htmlFor={prefixo + "-confirmacao"}>Confirmar nova senha</label>
            {/* Apresenta campo de entrada com validação nativa e proteção adicional no servidor com as propriedades e os estilos definidos nesta linha. */}
            <input id={prefixo + "-confirmacao"} name="confirmacao" type="password" autoComplete="new-password" required maxLength={1024} className={campo} />
          {/* Finaliza agrupamento visual dos elementos e mantém os próximos elementos fora desse agrupamento. */}
          </div>
          {/* Apresenta controle que executa a ação indicada pelo texto com as propriedades e os estilos definidos nesta linha. */}
          <button type="submit" className="rounded-lg bg-white px-4 py-2 font-semibold text-black disabled:cursor-wait">
            {/* Insere o resultado desta expressão React no conteúdo exibido ao usuário. */}
            {pendente ? "Redefinindo..." : "Confirmar redefinição"}
          {/* Finaliza controle que executa a ação indicada pelo texto e mantém os próximos elementos fora desse agrupamento. */}
          </button>
        {/* Finaliza grupo de campos bloqueado durante o processamento e mantém os próximos elementos fora desse agrupamento. */}
        </fieldset>
        {/* A região viva anuncia tanto sucesso quanto falha sem depender de cores. */}
        {!estado.sucesso && <p role="status" aria-live="polite" className="text-sm text-zinc-300">{estado.mensagem}</p>}
      {/* Finaliza formulário que reúne os campos e controla seu envio e mantém os próximos elementos fora desse agrupamento. */}
      </form>
    {/* Finaliza painel recolhível que começa fechado e é recolhido após o sucesso e mantém os próximos elementos fora desse agrupamento. */}
    </details>
    {/* A confirmação verde fica visível por três segundos após o fechamento automático. */}
    {estado.sucesso && <MensagemSucesso key={sucessoId} mensagem={estado.mensagem} />}
    {/* Finaliza agrupamento visual dos elementos e mantém os próximos elementos fora desse agrupamento. */}
    </div>
  // Conclui a função RedefinirSenha, preservando a estrutura e o escopo definidos.
  );
// Conclui a função RedefinirSenha, preservando a estrutura e o escopo definidos.
}






