
/*
=====================================================
PROJETO: TEAM BLACK FIGHTER
ARQUIVO: app/api/teste-mysql/route.ts
OBJETIVO: Testar a conexão direta com MySQL
=====================================================
*/

// Importa o pool de conexões com o banco.
import pool from "@/lib/mysql";

// Importa os recursos de resposta do Next.js.
import { NextResponse } from "next/server";

// Importa o tipo dos resultados de consultas SQL.
import type { RowDataPacket } from "mysql2";

// Define a estrutura do resultado esperado.
interface ResultadoConsulta extends RowDataPacket {
  // Define total com o tipo ou valor exigido por este objeto de dados.
  total: number;
// Conclui a estrutura de tipos ResultadoConsulta, preservando a estrutura e o escopo definidos.
}

// Define a função executada nas requisições GET.
export async function GET() {

  // Impede que a rota de teste seja utilizada em produção.
  if (process.env.NODE_ENV !== "development") {
    // Retorna este resultado ao chamador e encerra o caminho atual da função.
    return NextResponse.json(
      // Define uma mensagem pública de resposta sem divulgar SQL, hashes ou credenciais.
      { mensagem: "Rota indisponível." },
      // Define o código HTTP 404 para identificar a categoria desta resposta.
      { status: 404 }
    // Conclui a condição de validação e seu bloco de tratamento, preservando a estrutura e o escopo definidos.
    );
  // Conclui a condição de validação e seu bloco de tratamento, preservando a estrutura e o escopo definidos.
  }

  // Inicia o trecho que pode falhar e será protegido pelo tratamento de exceções.
  try {

    // Executa uma consulta SQL diretamente no MySQL.
    const [resultado] = await pool.query<ResultadoConsulta[]>(
      // Fornece este texto ou valor literal ao parâmetro ou à lista em construção.
      "SELECT COUNT(*) AS total FROM professores"
    // Conclui o bloco de tratamento de falhas da operação, preservando a estrutura e o escopo definidos.
    );

    // Retorna uma mensagem confirmando a conexão.
    return NextResponse.json({
      // Indicador público que distingue uma conclusão bem-sucedida de uma falha.
      sucesso: true,
      // Texto público apresentado na interface, sem detalhes internos do banco.
      mensagem: "Conexão direta com MySQL funcionando!",
      // Define professores_cadastrados com o tipo ou valor exigido por este objeto de dados.
      professores_cadastrados: resultado[0].total,
    // Conclui o objeto de dados ou opções passado à operação, preservando a estrutura e o escopo definidos.
    });

  // Captura falhas desta operação para apresentar uma resposta controlada.
  } catch (erro) {

    // Registra o erro somente no terminal do servidor.
    console.error("Erro na conexão MySQL:", erro);

    // Retorna uma mensagem sem expor dados internos.
    return NextResponse.json(
      // Inicia o objeto de retorno ou configuração cujos campos são explicados nas próximas linhas.
      {
        // Indicador público que distingue uma conclusão bem-sucedida de uma falha.
        sucesso: false,
        // Texto público apresentado na interface, sem detalhes internos do banco.
        mensagem: "Não foi possível conectar ao MySQL.",
      // Conclui o objeto de dados ou opções passado à operação, preservando a estrutura e o escopo definidos.
      },
      // Define o código HTTP 500 para identificar a categoria desta resposta.
      { status: 500 }
    // Conclui o bloco de tratamento de falhas da operação, preservando a estrutura e o escopo definidos.
    );

  // Conclui o bloco de tratamento de falhas da operação, preservando a estrutura e o escopo definidos.
  }
// Conclui a função GET, preservando a estrutura e o escopo definidos.
}
