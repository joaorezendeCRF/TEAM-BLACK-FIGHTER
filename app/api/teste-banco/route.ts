
/*
=====================================================
PROJETO: TEAM BLACK FIGHTER
ARQUIVO: app/api/teste-banco/route.ts
OBJETIVO: Testar a conexão entre Next.js e MySQL
=====================================================
*/

// Garante que este arquivo seja utilizado somente no servidor.
import "server-only";

// Importa a conexão com o banco MySQL configurada no Prisma.
import prisma from "@/lib/prisma";

// Importa a ferramenta do Next.js para retornar respostas HTTP.
import { NextResponse } from "next/server";

// Define a única função GET desta rota.
// Ela será executada quando acessarmos /api/teste-banco.
export async function GET() {

  // Diagnóstico do banco só existe no ambiente de desenvolvimento, como na outra rota de teste.
  if (process.env.NODE_ENV !== "development") {
    // A resposta pública não informa que tabelas ou contas existem na instalação.
    return NextResponse.json({ mensagem: "Rota indisponível." }, { status: 404 });
  }

  // Inicia o bloco de tratamento da consulta ao banco.
  try {

    // Consulta a quantidade de professores cadastrados.
    // O método count() retorna um número inteiro.
    const quantidade = await prisma.professores.count();

    // Retorna uma resposta HTTP com os dados em formato JSON.
    return NextResponse.json({

      // Indica que a consulta foi executada com sucesso.
      sucesso: true,

      // Mensagem de confirmação da conexão.
      mensagem: "Conexão com MySQL funcionando!",

      // Retorna o número de professores encontrados.
      professores_cadastrados: quantidade,

    // Conclui o objeto de dados ou opções passado à operação, preservando a estrutura e o escopo definidos.
    });

  // Captura possíveis erros durante a consulta.
  } catch (erro) {

    // Registra os detalhes do erro no terminal do servidor.
    // Não envia informações internas do banco ao navegador.
    console.error("Erro na consulta ao banco:", erro);

    // Retorna uma resposta JSON informando que ocorreu um erro.
    return NextResponse.json(

      // Corpo da resposta enviada ao navegador.
      {

        // Informa que a operação falhou.
        sucesso: false,

        // Exibe uma mensagem genérica de erro.
        mensagem: "Não foi possível consultar o banco.",

      // Conclui o objeto de dados ou opções passado à operação, preservando a estrutura e o escopo definidos.
      },

      // Configura o status HTTP da resposta.
      {

        // O código 500 representa um erro interno do servidor.
        status: 500,

      // Conclui o objeto de dados ou opções passado à operação, preservando a estrutura e o escopo definidos.
      }

    // Conclui o bloco de tratamento de falhas da operação, preservando a estrutura e o escopo definidos.
    );

  // Conclui o bloco de tratamento de falhas da operação, preservando a estrutura e o escopo definidos.
  }

// Conclui a função GET, preservando a estrutura e o escopo definidos.
}
