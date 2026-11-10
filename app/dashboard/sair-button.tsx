
// Marca este módulo para executar interações e estado no navegador.
"use client";

/*
=====================================================
PROJETO: TEAM BLACK FIGHTER
ARQUIVO: app/dashboard/sair-button.tsx
OBJETIVO: Botão para encerrar a sessão
=====================================================
*/

// Importa o controle de estado.
import { useState } from "react";

// Importa os recursos de navegação.
import { useRouter } from "next/navigation";

// Define o botão de logout.
export default function SairButton() {

  // Permite redirecionar o usuário.
  const router = useRouter();

  // Controla o estado de encerramento.
  const [saindo, setSaindo] = useState(false);

  // Executa o encerramento da sessão.
  async function sair() {

    // Evita solicitações duplicadas.
    if (saindo) return;

    // Ativa o estado de carregamento.
    setSaindo(true);

    // Inicia o trecho que pode falhar e será protegido pelo tratamento de exceções.
    try {

      // Solicita ao servidor o encerramento da sessão.
      const resposta = await fetch("/api/logout", {
        // Método HTTP utilizado para enviar a solicitação.
        method: "POST",
      // Conclui o objeto de dados ou opções passado à operação, preservando a estrutura e o escopo definidos.
      });

      // Confirma que o servidor processou a solicitação.
      if (!resposta.ok) {
        // Interrompe a operação ao detectar uma condição inválida, com a mensagem indicada.
        throw new Error("Falha ao encerrar a sessão.");
      // Conclui a condição de validação e seu bloco de tratamento, preservando a estrutura e o escopo definidos.
      }

      // Retorna o usuário para a tela de login.
      router.replace("/");

      // Atualiza os dados do roteador.
      router.refresh();

    // Captura falhas desta operação para apresentar uma resposta controlada.
    } catch {

      // Informa se o logout não foi concluído.
      alert("Não foi possível sair. Tente novamente.");

    // Executa a finalização mesmo quando a operação termina com erro.
    } finally {

      // Libera o botão para novas tentativas.
      setSaindo(false);

    // Conclui o bloco de tratamento de falhas da operação, preservando a estrutura e o escopo definidos.
    }
  // Conclui a função sair, preservando a estrutura e o escopo definidos.
  }

  // Apresenta o botão.
  return (
    // Apresenta controle que executa a ação indicada pelo texto com as propriedades e os estilos definidos nesta linha.
    <button
      // Define o comportamento nativo deste campo ou botão.
      type="button"
      // Executa a ação correspondente ao clique do usuário.
      onClick={sair}
      // Bloqueia a interação enquanto a operação correspondente está pendente.
      disabled={saindo}
      // Aplica as classes Tailwind indicadas: disposição, espaçamento e cores do elemento.
      className="mt-8 rounded-xl border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition-colors hover:border-red-600 hover:bg-red-600 focus-visible:border-red-600 focus-visible:bg-red-600 disabled:opacity-50"
    // Conclui as propriedades deste elemento para iniciar seu conteúdo ou encerrar o campo.
    >
      {/* Insere o resultado desta expressão React no conteúdo exibido ao usuário. */}
      {saindo ? "Saindo..." : "Sair do sistema"}
    {/* Finaliza controle que executa a ação indicada pelo texto e mantém os próximos elementos fora desse agrupamento. */}
    </button>
  // Conclui a função SairButton, preservando a estrutura e o escopo definidos.
  );
// Conclui a função SairButton, preservando a estrutura e o escopo definidos.
}
