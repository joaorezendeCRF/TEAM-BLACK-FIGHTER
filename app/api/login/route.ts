
/*
=====================================================
PROJETO: TEAM BLACK FIGHTER
ARQUIVO: app/api/login/route.ts
OBJETIVO: Autenticar usuários diretamente no MySQL
=====================================================
*/

// Importa a conexão direta com MySQL.
import pool from "@/lib/mysql";

// Importa a função de verificação de senha.
import { verificarSenha } from "@/lib/senha";

// Importa a função que cria a sessão.
import { criarSessao } from "@/lib/sessao";

// Importa a resposta HTTP do Next.js.
import { NextResponse } from "next/server";

// Importa a tipagem das linhas do MySQL.
import type { RowDataPacket } from "mysql2";

// Define as informações do professor.
interface Professor extends RowDataPacket {
  // Identificador inteiro que localiza uma única conta no banco.
  id: number;
  // Nome de apresentação da pessoa, separado do identificador de login.
  nome: string;
  // Identificador único usado para acessar o sistema.
  usuario: string;
  // Hash Argon2id armazenado no banco, nunca a senha original.
  senha_hash: string;
  // Situação da conta; somente contas ativas podem autenticar ou autorizar alterações.
  ativo: number;
// Conclui a estrutura de tipos Professor, preservando a estrutura e o escopo definidos.
}

// Recebe as tentativas de login.
export async function POST(request: Request) {

  // Verifica se a requisição contém JSON válido.
  let dados: unknown;

  // Inicia o trecho que pode falhar e será protegido pelo tratamento de exceções.
  try {
    // Interpreta o JSON recebido e encaminha conteúdo malformado ao tratamento de exceções.
    dados = await request.json();
  // Captura falhas desta operação para apresentar uma resposta controlada.
  } catch {
    // Retorna este resultado ao chamador e encerra o caminho atual da função.
    return NextResponse.json(
      // Define uma mensagem pública de resposta sem divulgar SQL, hashes ou credenciais.
      { mensagem: "Dados inválidos." },
      // Define o código HTTP 400 para identificar a categoria desta resposta.
      { status: 400 }
    // Conclui o bloco de tratamento de falhas da operação, preservando a estrutura e o escopo definidos.
    );
  // Conclui o bloco de tratamento de falhas da operação, preservando a estrutura e o escopo definidos.
  }

  // Verifica se foi enviado um objeto.
  if (
    // Rejeita a ausência do objeto de entrada antes de acessar seus campos.
    !dados ||
    // Exige um objeto JSON em vez de um número, texto ou outro valor primitivo.
    typeof dados !== "object" ||
    // Rejeita listas: esta operação espera um objeto com propriedades nomeadas.
    Array.isArray(dados)
  // Conclui a condição composta e inicia o tratamento executado quando ela é atendida.
  ) {
    // Retorna este resultado ao chamador e encerra o caminho atual da função.
    return NextResponse.json(
      // Define uma mensagem pública de resposta sem divulgar SQL, hashes ou credenciais.
      { mensagem: "Dados inválidos." },
      // Define o código HTTP 400 para identificar a categoria desta resposta.
      { status: 400 }
    // Conclui a condição de validação e seu bloco de tratamento, preservando a estrutura e o escopo definidos.
    );
  // Conclui a condição de validação e seu bloco de tratamento, preservando a estrutura e o escopo definidos.
  }

  // Obtém os dados enviados.
  const entrada = dados as Record<string, unknown>;

  // Valida os tipos de usuário e senha.
  if (
    // Exige que entrada.usuario seja do tipo string antes de processar este valor.
    typeof entrada.usuario !== "string" ||
    // Exige que entrada.senha seja do tipo string antes de processar este valor.
    typeof entrada.senha !== "string"
  // Conclui a condição composta e inicia o tratamento executado quando ela é atendida.
  ) {
    // Retorna este resultado ao chamador e encerra o caminho atual da função.
    return NextResponse.json(
      // Define uma mensagem pública de resposta sem divulgar SQL, hashes ou credenciais.
      { mensagem: "Informe usuário e senha." },
      // Define o código HTTP 400 para identificar a categoria desta resposta.
      { status: 400 }
    // Conclui a condição de validação e seu bloco de tratamento, preservando a estrutura e o escopo definidos.
    );
  // Conclui a condição de validação e seu bloco de tratamento, preservando a estrutura e o escopo definidos.
  }

  // Remove espaços extras do nome de usuário.
  const usuario = entrada.usuario.trim();

  // Mantém a senha exatamente como digitada.
  const senha = entrada.senha;

  // Verifica se os campos são válidos.
  if (
    // Rejeita o valor ausente ou vazio indicado nesta condição.
    !usuario ||
    // Rejeita o valor ausente ou vazio indicado nesta condição.
    !senha ||
    // Rejeita usuario quando ultrapassa a capacidade técnica de entrada indicada nesta condição.
    usuario.length > 50 ||
    // Rejeita senha quando ultrapassa a capacidade técnica de entrada indicada nesta condição.
    senha.length > 1024
  // Conclui a condição composta e inicia o tratamento executado quando ela é atendida.
  ) {
    // Retorna este resultado ao chamador e encerra o caminho atual da função.
    return NextResponse.json(
      // Define uma mensagem pública de resposta sem divulgar SQL, hashes ou credenciais.
      { mensagem: "Usuário ou senha inválidos." },
      // Define o código HTTP 401 para identificar a categoria desta resposta.
      { status: 401 }
    // Conclui a condição de validação e seu bloco de tratamento, preservando a estrutura e o escopo definidos.
    );
  // Conclui a condição de validação e seu bloco de tratamento, preservando a estrutura e o escopo definidos.
  }

  // Inicia o trecho que pode falhar e será protegido pelo tratamento de exceções.
  try {

    // Consulta o professor pelo nome de usuário.
    // O parâmetro ? evita injeção de SQL.
    const [registros] = await pool.execute<Professor[]>(
      // Inicia a consulta parametrizada que lê os campos necessários da tabela existente.
      `SELECT id, nome, usuario, senha_hash, ativo
       -- Lê a tabela existente, sem criar ou remover estruturas.
       FROM professores
       -- Restringe a operação ao identificador ou à condição informada por parâmetro.
       WHERE usuario = ?
       -- Limita o retorno para não carregar registros desnecessários.
       LIMIT 1`,
      // Associa usuario aos placeholders SQL, separando valores da instrução.
      [usuario]
    // Conclui o bloco de tratamento de falhas da operação, preservando a estrutura e o escopo definidos.
    );

    // Obtém o primeiro registro encontrado.
    const professor = registros[0];

    // Impede acesso de contas inexistentes ou inativas.
    if (!professor || !professor.ativo) {
      // Retorna este resultado ao chamador e encerra o caminho atual da função.
      return NextResponse.json(
        // Define uma mensagem pública de resposta sem divulgar SQL, hashes ou credenciais.
        { mensagem: "Usuário ou senha inválidos." },
        // Define o código HTTP 401 para identificar a categoria desta resposta.
        { status: 401 }
      // Conclui a condição de validação e seu bloco de tratamento, preservando a estrutura e o escopo definidos.
      );
    // Conclui a condição de validação e seu bloco de tratamento, preservando a estrutura e o escopo definidos.
    }

    // Verifica se a senha corresponde ao hash.
    const senhaCorreta = await verificarSenha(
      // Fornece o hash armazenado para verificar a senha recebida sem descriptografar credenciais.
      professor.senha_hash,
      // Fornece a senha digitada exatamente como recebida, incluindo espaços.
      senha
    // Conclui o bloco de tratamento de falhas da operação, preservando a estrutura e o escopo definidos.
    );

    // Rejeita senhas incorretas.
    if (!senhaCorreta) {
      // Retorna este resultado ao chamador e encerra o caminho atual da função.
      return NextResponse.json(
        // Define uma mensagem pública de resposta sem divulgar SQL, hashes ou credenciais.
        { mensagem: "Usuário ou senha inválidos." },
        // Define o código HTTP 401 para identificar a categoria desta resposta.
        { status: 401 }
      // Conclui a condição de validação e seu bloco de tratamento, preservando a estrutura e o escopo definidos.
      );
    // Conclui a condição de validação e seu bloco de tratamento, preservando a estrutura e o escopo definidos.
    }

    // Cria a sessão do usuário autenticado.
    await criarSessao({
      // Identificador inteiro que localiza uma única conta no banco.
      id: professor.id,
      // Identificador único usado para acessar o sistema.
      usuario: professor.usuario,
    // Conclui o objeto de dados ou opções passado à operação, preservando a estrutura e o escopo definidos.
    });

    // Confirma a autenticação.
    return NextResponse.json(
      // Inicia o objeto de retorno ou configuração cujos campos são explicados nas próximas linhas.
      {
        // Indicador público que distingue uma conclusão bem-sucedida de uma falha.
        sucesso: true,
        // Texto público apresentado na interface, sem detalhes internos do banco.
        mensagem: "Login realizado com sucesso.",
        // Identificador único usado para acessar o sistema.
        usuario: {
          // Identificador inteiro que localiza uma única conta no banco.
          id: professor.id,
          // Nome de apresentação da pessoa, separado do identificador de login.
          nome: professor.nome,
          // Identificador único usado para acessar o sistema.
          usuario: professor.usuario,
        // Conclui o objeto de dados ou opções passado à operação, preservando a estrutura e o escopo definidos.
        },
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
    // Conclui o bloco de tratamento de falhas da operação, preservando a estrutura e o escopo definidos.
    );

  // Captura falhas desta operação para apresentar uma resposta controlada.
  } catch (erro) {

    // Registra a falha somente no servidor.
    console.error("Erro interno no login:", erro);

    // Retorna uma mensagem genérica.
    return NextResponse.json(
      // Inicia o objeto de retorno ou configuração cujos campos são explicados nas próximas linhas.
      {
        // Indicador público que distingue uma conclusão bem-sucedida de uma falha.
        sucesso: false,
        // Texto público apresentado na interface, sem detalhes internos do banco.
        mensagem: "Não foi possível realizar o login.",
      // Conclui o objeto de dados ou opções passado à operação, preservando a estrutura e o escopo definidos.
      },
      // Define o código HTTP 500 para identificar a categoria desta resposta.
      { status: 500 }
    // Conclui o bloco de tratamento de falhas da operação, preservando a estrutura e o escopo definidos.
    );
  // Conclui o bloco de tratamento de falhas da operação, preservando a estrutura e o escopo definidos.
  }
// Conclui a função POST, preservando a estrutura e o escopo definidos.
}
