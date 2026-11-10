
/*
=====================================================
PROJETO: TEAM BLACK FIGHTER
ARQUIVO: lib/sessao.ts
OBJETIVO: Criar, validar e encerrar sessões de login
=====================================================
*/

// Impede a importação em componentes do navegador.
import "server-only";

// Importa as funções de assinatura e verificação de JWT.
import { SignJWT, jwtVerify } from "jose";

// Permite gerenciar cookies no Next.js.
import { cookies } from "next/headers";

// Define o nome do cookie da sessão.
const NOME_COOKIE = "team_black_fighter_sessao";

// Define a validade da sessão: 8 horas.
const DURACAO_SESSAO = 60 * 60 * 8;

// Obtém a chave secreta configurada no .env.
function obterChaveSecreta(): Uint8Array {
  // Prepara segredo com o valor indicado para uso nas próximas etapas deste fluxo.
  const segredo = process.env.SESSION_SECRET;

  // Impede a utilização de uma chave ausente ou fraca.
  if (!segredo || segredo.length < 32) {
    // Interrompe a operação ao detectar uma condição inválida, com a mensagem indicada.
    throw new Error("SESSION_SECRET inválida ou não configurada.");
  // Conclui a condição de validação e seu bloco de tratamento, preservando a estrutura e o escopo definidos.
  }

  // Converte a chave para o formato utilizado pelo JOSE.
  return new TextEncoder().encode(segredo);
// Conclui a função obterChaveSecreta, preservando a estrutura e o escopo definidos.
}

// Representa as informações armazenadas na sessão.
export type UsuarioSessao = {
  // Identificador inteiro que localiza uma única conta no banco.
  id: number;
  // Identificador único usado para acessar o sistema.
  usuario: string;
// Conclui a construção sintática iniciada nas linhas anteriores, preservando a estrutura e o escopo definidos.
};

// Cria um token assinado para o usuário autenticado.
export async function criarSessao(
  // Identificador único usado para acessar o sistema.
  usuario: UsuarioSessao
// Declara o tipo do resultado assíncrono: ): Promise<void>.
): Promise<void> {
  // Calcula quando a sessão deverá expirar.
  const expiracao = new Date(
    // Calcula a expiração somando a duração da sessão, convertida de segundos para milissegundos.
    Date.now() + DURACAO_SESSAO * 1000
  // Conclui a função criarSessao, preservando a estrutura e o escopo definidos.
  );

  // Cria o token JWT com o identificador do usuário.
  const token = await new SignJWT({
    // Identificador único usado para acessar o sistema.
    usuario: usuario.usuario,
  // Conclui o objeto de dados ou opções passado à operação, preservando a estrutura e o escopo definidos.
  })
    // Define o algoritmo de assinatura.
    .setProtectedHeader({ alg: "HS256" })

    // Identifica o usuário autenticado.
    .setSubject(String(usuario.id))

    // Registra o momento de emissão.
    .setIssuedAt()

    // Define a expiração do token.
    .setExpirationTime(expiracao)

    // Assina o token com a chave secreta.
    .sign(obterChaveSecreta());

  // Obtém o gerenciador de cookies do Next.js.
  const armazenamento = await cookies();

  // Armazena a sessão no navegador.
  armazenamento.set(NOME_COOKIE, token, {
    // Impede acesso ao cookie via JavaScript.
    httpOnly: true,

    // Usa HTTPS obrigatório em produção.
    secure: process.env.NODE_ENV === "production",

    // Protege contra requisições cross-site comuns.
    sameSite: "lax",

    // Disponibiliza o cookie em todo o sistema.
    path: "/",

    // Apaga o cookie quando atingir o prazo.
    expires: expiracao,
  // Conclui o objeto de dados ou opções passado à operação, preservando a estrutura e o escopo definidos.
  });
// Conclui a função criarSessao, preservando a estrutura e o escopo definidos.
}

// Verifica a sessão recebida do navegador.
export async function obterSessao(): Promise<UsuarioSessao | null> {
  // Obtém o cookie enviado pelo navegador.
  const armazenamento = await cookies();
  // Prepara token com o valor indicado para uso nas próximas etapas deste fluxo.
  const token = armazenamento.get(NOME_COOKIE)?.value;

  // Sem cookie, o usuário não está autenticado.
  if (!token) {
    // Retorna este resultado ao chamador e encerra o caminho atual da função.
    return null;
  // Conclui a condição de validação e seu bloco de tratamento, preservando a estrutura e o escopo definidos.
  }

  // Inicia o trecho que pode falhar e será protegido pelo tratamento de exceções.
  try {
    // Confere a assinatura e a validade do token.
    const { payload } = await jwtVerify(
      // Define token com o tipo ou valor exigido por este objeto de dados.
      token,
      // Fornece a chave privada configurada no servidor para conferir a assinatura do token.
      obterChaveSecreta(),
      // Inicia o objeto de retorno ou configuração cujos campos são explicados nas próximas linhas.
      {
        // Define algorithms com o tipo ou valor exigido por este objeto de dados.
        algorithms: ["HS256"],
      // Conclui o objeto de dados ou opções passado à operação, preservando a estrutura e o escopo definidos.
      }
    // Conclui o bloco de tratamento de falhas da operação, preservando a estrutura e o escopo definidos.
    );

    // Converte o identificador recebido em número.
    const id = Number(payload.sub);

    // Verifica a estrutura das informações.
    if (
      // Rejeita identificadores fora do intervalo de inteiros seguros de JavaScript.
      !Number.isSafeInteger(id) ||
      // Rejeita identificadores menores ou iguais a zero, que não representam contas válidas.
      id <= 0 ||
      // Exige que payload.usuario seja do tipo string antes de processar este valor.
      typeof payload.usuario !== "string" ||
      // Rejeita o valor ausente ou vazio indicado nesta condição.
      !payload.usuario
    // Conclui a condição composta e inicia o tratamento executado quando ela é atendida.
    ) {
      // Retorna este resultado ao chamador e encerra o caminho atual da função.
      return null;
    // Conclui a condição de validação e seu bloco de tratamento, preservando a estrutura e o escopo definidos.
    }

    // Retorna os dados da sessão validada.
    return {
      // Identificador inteiro que localiza uma única conta no banco.
      id,
      // Identificador único usado para acessar o sistema.
      usuario: payload.usuario,
    // Conclui o objeto de dados ou opções passado à operação, preservando a estrutura e o escopo definidos.
    };
  // Captura falhas desta operação para apresentar uma resposta controlada.
  } catch {
    // Tokens inválidos ou expirados não são aceitos.
    return null;
  // Conclui o bloco de tratamento de falhas da operação, preservando a estrutura e o escopo definidos.
  }
// Conclui a função obterSessao, preservando a estrutura e o escopo definidos.
}

// Encerra a sessão removendo seu cookie.
export async function encerrarSessao(): Promise<void> {
  // Aguarda o resultado de cookies() e o guarda em armazenamento.
  const armazenamento = await cookies();

  // Remove somente o cookie da sessão do navegador, sem remover a conta cadastrada.
  armazenamento.delete(NOME_COOKIE);
// Conclui a função encerrarSessao, preservando a estrutura e o escopo definidos.
}
