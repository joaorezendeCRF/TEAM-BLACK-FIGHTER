
/*
=====================================================
PROJETO: TEAM BLACK FIGHTER
ARQUIVO: app/api/logout/route.ts
OBJETIVO: Encerrar a sessão do usuário autenticado
=====================================================
*/

// Importa a função que encerra a sessão.
import { encerrarSessao } from "@/lib/sessao";

// Importa o recurso de resposta HTTP do Next.js.
import { NextResponse } from "next/server";

// Recebe a solicitação de logout.
export async function POST() {

  // Remove o cookie de autenticação do navegador.
  await encerrarSessao();

  // Confirma o encerramento da sessão.
  return NextResponse.json(
    // Inicia o objeto de retorno ou configuração cujos campos são explicados nas próximas linhas.
    {
      // Indicador público que distingue uma conclusão bem-sucedida de uma falha.
      sucesso: true,
      // Texto público apresentado na interface, sem detalhes internos do banco.
      mensagem: "Sessão encerrada com sucesso.",
    // Conclui o objeto de dados ou opções passado à operação, preservando a estrutura e o escopo definidos.
    },
    // Inicia o objeto de retorno ou configuração cujos campos são explicados nas próximas linhas.
    {
      // Cabeçalhos HTTP que descrevem o conteúdo e as regras de cache.
      headers: {
        // Fornece este texto ou valor literal ao parâmetro ou à lista em construção.
        "Cache-Control": "no-store",
      // Conclui o objeto de dados ou opções passado à operação, preservando a estrutura e o escopo definidos.
      },
    // Conclui o objeto de dados ou opções passado à operação, preservando a estrutura e o escopo definidos.
    }
  // Conclui a função POST, preservando a estrutura e o escopo definidos.
  );
// Conclui a função POST, preservando a estrutura e o escopo definidos.
}
