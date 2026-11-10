// Os painéis e estados de envio executam no navegador, mantendo as regras no servidor.
"use client";
// useActionState controla o envio; referências fecham painéis e useId associa rótulos.
import { useActionState, useId, useRef } from "react";
// Usa os mesmos nomes de operação e retorno reconhecidos pelo serviço de autorização.
import type { OperacaoConta, ResultadoConta } from "@/lib/gerenciamento-conta";
// Encaminha a solicitação à ação que confirma o administrador principal.
import { gerenciarConta } from "./gerenciar-conta-action";
// Publica o sucesso fora da linha que pode ser excluída.
import { useFeedbackContas } from "./feedback-contas";

// Agrupa somente os dados públicos necessários para identificar a conta escolhida.
type DadosConta = { id: number; nome: string; usuario: string; ativo: boolean };
// Define rótulos fixos, sem aceitar textos ou comandos de operação fornecidos pelo cliente.
const rotulos = { excluir: "Excluir usuário", inativar: "Inativar usuário", reativar: "Reativar usuário" };
// Define a confirmação visível correspondente à ação aberta pelo administrador principal.
const confirmacoes = { excluir: "Confirmar exclusão", inativar: "Confirmar inativação", reativar: "Confirmar reativação" };

// Diferencia as ações por cor sem alterar o fundo preto e grafite da aplicação.
const estilosOperacao = {
  // Usa fundo vermelho translúcido e texto vermelho no mesmo padrão do selo de situação.
  excluir: { texto: "bg-red-500/15 text-red-400 hover:bg-red-500/25 hover:text-red-300", botao: "border-red-500/40 bg-red-500/15 text-red-300 hover:bg-red-500/25" },
  // Usa fundo amarelo translúcido e texto amarelo para o bloqueio reversível do acesso.
  inativar: { texto: "bg-yellow-500/15 text-yellow-400 hover:bg-yellow-500/25 hover:text-yellow-300", botao: "border-yellow-500/40 bg-yellow-500/15 text-yellow-300 hover:bg-yellow-500/25" },
  // Reutiliza o fundo verde translúcido e o texto verde do selo Ativo na reativação.
  reativar: { texto: "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 hover:text-emerald-300", botao: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25" },
// Finaliza o mapa de estilos fixos reconhecidos pelo Tailwind durante a compilação.
};

// Cada operação possui um formulário independente para não misturar senha, erros ou confirmações.
function OperacaoUsuario({ conta, operacao }: { conta: DadosConta; operacao: OperacaoConta }) {
  // Permite recolher o painel somente quando o servidor confirma a conclusão.
  const detalhes = useRef<HTMLDetailsElement>(null);
  // Associa os rótulos aos campos sem duplicar identificadores entre usuários.
  const prefixo = useId();
  // Publica a confirmação em um componente que não será removido com a conta.
  const informar = useFeedbackContas();
  // O estado inicial não reutiliza resultados de outra operação ou de visitas anteriores.
  const [estado, enviar, pendente] = useActionState<ResultadoConta, FormData>(async (anterior, dados) => {
    // A ação executa a validação da conta, a senha e a autorização atual no servidor.
    const resultado = await gerenciarConta(anterior, dados);
    // Um erro precisa permanecer visível, por isso só recolhe o formulário após sucesso.
    if (resultado.sucesso) {
      // Fecha o painel sem alterar o estado de outros formulários.
      if (detalhes.current) detalhes.current.open = false;
      // A confirmação verde permanece por três segundos mesmo se a linha desaparecer.
      informar(resultado.mensagem);
    // Finaliza o tratamento de conclusão bem-sucedida.
    }
    // Guarda somente o resultado público, nunca a senha digitada.
    return resultado;
  // Define o resultado inicial sem mensagem e sem operação concluída.
  }, { sucesso: false, mensagem: "" });
  // Mantém os campos no mesmo padrão preto, branco e grafite do restante da tela.
  const campo = "mt-2 w-full rounded-lg border border-white/20 bg-zinc-950 px-3 py-2 text-white";
  // Seleciona o mesmo destaque de cor para abrir a ação e confirmar seu envio.
  const destaque = estilosOperacao[operacao];
  // Renderiza uma confirmação recolhível, separada da execução efetiva.
  return (
    // Mantém o controle fechado compacto e reserva largura para os campos somente ao abrir.
    <details ref={detalhes} className="max-w-xs open:min-w-56">
      {/* Repete o formato do selo Situação: arredondado, compacto e com fundo translúcido; oculta a seta e mantém foco visível pelo teclado. */}
      <summary className={"inline-flex w-fit cursor-pointer list-none items-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current [&::-webkit-details-marker]:hidden " + destaque.texto}>{rotulos[operacao]}</summary>
      {/* Desliga a restauração automática e associa o envio à ação protegida. */}
      <form action={enviar} autoComplete="off" className="mt-4 space-y-3">
        {/* O identificador apenas seleciona o alvo; a permissão sempre é conferida no servidor. */}
        <input type="hidden" name="usuarioId" value={conta.id} />
        {/* O servidor valida esta operação contra uma lista fechada de ações conhecidas. */}
        <input type="hidden" name="operacao" value={operacao} />
        {/* Exibe a identidade completa para evitar confundir nome de apresentação e login. */}
        <p className="text-sm text-zinc-300">{conta.nome} ({conta.usuario})</p>
        {/* Explica a diferença entre remoção permanente e bloqueio reversível do acesso. */}
        <p className="text-xs text-zinc-400">{operacao === "excluir" ? "A exclusão é permanente. Para preservar o cadastro, prefira inativar." : operacao === "inativar" ? "O cadastro será preservado e o acesso ao sistema ficará bloqueado." : "O acesso ao sistema será liberado novamente, mantendo a senha atual."}</p>
        {/* Impede alterações e envios repetidos enquanto a ação está sendo processada. */}
        <fieldset disabled={pendente} className="space-y-3 disabled:opacity-60">
          {/* Excluir exige digitar o login; as ações reversíveis carregam a identidade mostrada na confirmação. */}
          {operacao === "excluir" ? (
            // Agrupa a confirmação explícita necessária para remover a conta permanentemente.
            <div>
              {/* Solicita o login exato em vez de uma confirmação genérica de sim ou não. */}
              <label htmlFor={prefixo + "-confirmacao"}>Digite {conta.usuario} para confirmar</label>
              {/* O servidor confere este texto novamente contra o login atual do banco. */}
              <input id={prefixo + "-confirmacao"} name="confirmacaoUsuario" required maxLength={50} autoComplete="off" className={campo} />
            {/* Finaliza o campo de confirmação da exclusão. */}
            </div>
          // A confirmação das ações reversíveis continua vinculada ao login exibido.
          ) : <input type="hidden" name="confirmacaoUsuario" value={conta.usuario} />}
          {/* A senha pertence ao administrador principal conectado, não à conta alvo. */}
          <div>
            {/* Associa o rótulo à entrada protegida de senha. */}
            <label htmlFor={prefixo + "-senha"}>Sua senha de administrador</label>
            {/* A credencial é transmitida apenas à ação e verificada pelo Argon2id existente. */}
            <input id={prefixo + "-senha"} name="senhaAdministrador" type="password" required maxLength={1024} autoComplete="current-password" className={campo} />
          {/* Finaliza o campo de reconfirmação da identidade administrativa. */}
          </div>
          {/* Repete a cor da ação na confirmação, mantendo borda e fundo translúcido sobre o grafite. */}
          <button type="submit" className={"rounded-lg border px-4 py-2 font-semibold transition disabled:cursor-wait " + destaque.botao}>{pendente ? "Processando..." : confirmacoes[operacao]}</button>
        {/* Finaliza o grupo de campos protegidos contra envios duplicados. */}
        </fieldset>
        {/* Erros ficam no formulário aberto; sucesso é mostrado no aviso global temporário. */}
        {!estado.sucesso && <p role="status" aria-live="polite" className="text-sm text-zinc-300">{estado.mensagem}</p>}
      {/* Finaliza o formulário de uma única operação sobre a conta. */}
      </form>
    {/* Finaliza o painel recolhível da operação. */}
    </details>
  // Finaliza a estrutura visual do formulário.
  );
// Finaliza o componente independente de confirmação.
}

// O servidor monta este conjunto somente para o administrador principal e contas não protegidas.
export default function AcoesConta(conta: DadosConta) {
  // Oferece ativação ou inativação conforme a situação atual retornada pelo banco.
  const situacao: OperacaoConta = conta.ativo ? "inativar" : "reativar";
  // Agrupa os dois controles com menos espaço vertical para compactar cada linha.
  return (
    // Aproxima as ações sem misturar seus formulários ou áreas de confirmação.
    <div className="flex flex-col gap-2">
      {/* Trocar a situação remonta este formulário para não reutilizar mensagens de uma ação anterior. */}
      <OperacaoUsuario key={situacao} conta={conta} operacao={situacao} />
      {/* A exclusão permanece uma ação independente, com sua própria confirmação e estado de envio. */}
      <OperacaoUsuario conta={conta} operacao="excluir" />
    {/* Finaliza o agrupamento dos controles administrativos. */}
    </div>
  // Finaliza o retorno do conjunto de ações.
  );
// Finaliza o componente de gerenciamento da conta.
}



