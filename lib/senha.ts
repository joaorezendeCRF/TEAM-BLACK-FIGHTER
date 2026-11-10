
/*
=====================================================
PROJETO: TEAM BLACK FIGHTER
ARQUIVO: lib/senha.ts
OBJETIVO: Proteger e verificar senhas com Argon2id
=====================================================
*/

// Impede que este módulo seja importado no navegador.
import "server-only";

// Importa a biblioteca de proteção de senhas.
import argon2 from "argon2";

// Define uma função assíncrona para gerar hashes.
export async function gerarHashSenha(
  // Recebe a senha original como argumento.
  senha: string,
  // Cadastro e redefinição de professores optam explicitamente pela senha livre.
  // Os demais chamadores continuam exigindo 6 caracteres por padrão.
  politica: "padrao" | "redefinicao-professor" | "cadastro-professor" = "padrao"
// Declara o tipo do resultado assíncrono: ): Promise<string>.
): Promise<string> {

  // Rejeita credenciais vazias em ambas as políticas, sem remover espaços.
  if (senha.length === 0) {
    // Interrompe a operação ao detectar uma condição inválida, com a mensagem indicada.
    throw new Error("A senha não pode estar vazia.");
  // Conclui a condição de validação e seu bloco de tratamento, preservando a estrutura e o escopo definidos.
  }

  // Aplica o mínimo administrativo de seis caracteres solicitado e preserva a senha livre de professores.
  if (politica === "padrao" && senha.length < 6) {

    // Interrompe a operação quando a senha é muito curta.
    throw new Error("A senha deve ter pelo menos 6 caracteres.");
  // Conclui a condição de validação e seu bloco de tratamento, preservando a estrutura e o escopo definidos.
  }

  // Gera um hash seguro usando o algoritmo Argon2id.
  const hash = await argon2.hash(senha, {

    // Seleciona explicitamente a variante Argon2id.
    type: argon2.argon2id,

    // Define o custo de memória em KiB (64 MiB).
    memoryCost: 65536,

    // Define o número de iterações.
    timeCost: 3,

    // Define o grau de paralelismo.
    parallelism: 1,

  // Conclui o objeto de dados ou opções passado à operação, preservando a estrutura e o escopo definidos.
  });

  // Retorna somente o hash gerado.
  return hash;
// Conclui a função gerarHashSenha, preservando a estrutura e o escopo definidos.
}

// Define uma função para verificar uma senha informada.
export async function verificarSenha(
  // Hash armazenado no banco de dados.
  hashArmazenado: string,

  // Senha informada pelo usuário no login.
  senhaDigitada: string
// Declara o tipo do resultado assíncrono: ): Promise<boolean>.
): Promise<boolean> {

  // Compara a senha digitada com o hash existente.
  return argon2.verify(hashArmazenado, senhaDigitada);
// Conclui a função verificarSenha, preservando a estrutura e o escopo definidos.
}



