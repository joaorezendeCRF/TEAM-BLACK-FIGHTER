/**
 * Valida a entrada no servidor antes de consultar ou alterar contas.
 * Não remove espaços das senhas: eles fazem parte do segredo informado.
 */
// Define validarRedefinicao e seus parâmetros; as próximas linhas implementam essa responsabilidade.
export function validarRedefinicao(dados: FormData) {
  // Prepara idTexto com o valor indicado para uso nas próximas etapas deste fluxo.
  const idTexto = dados.get("professorId");
  // Credencial informada para reconfirmar a identidade do administrador conectado.
  const senhaAdministrador = dados.get("senhaAdministrador");
  // Prepara novaSenha com o valor indicado para uso nas próximas etapas deste fluxo.
  const novaSenha = dados.get("novaSenha");
  // Segunda digitação que deve corresponder exatamente à nova senha.
  const confirmacao = dados.get("confirmacao");
  // Na redefinição de professores, aceita qualquer senha não vazia, sem regra de composição.
  // Mantém o limite técnico de 1024 caracteres e valida o identificador recebido.
  if (typeof idTexto !== "string" || !/^[1-9]\d*$/.test(idTexto) ||
      // Rejeita identificadores fora do intervalo de inteiros seguros de JavaScript.
      !Number.isSafeInteger(Number(idTexto)) ||
      // Exige que senhaAdministrador seja do tipo string antes de processar este valor.
      typeof senhaAdministrador !== "string" || !senhaAdministrador ||
      // Rejeita senhaAdministrador quando ultrapassa a capacidade técnica de entrada indicada nesta condição.
      senhaAdministrador.length > 1024 ||
      // Exige que novaSenha seja do tipo string antes de processar este valor.
      typeof novaSenha !== "string" || novaSenha.length === 0 || novaSenha.length > 1024 ||
      // Exige que confirmacao seja do tipo string antes de processar este valor.
      typeof confirmacao !== "string") {
    // Retorna este resultado ao chamador e encerra o caminho atual da função.
    return { erro: "Informe a senha do administrador e uma nova senha não vazia, de até 1024 caracteres." } as const;
  // Conclui a condição de validação e seu bloco de tratamento, preservando a estrutura e o escopo definidos.
  }
  // A confirmação também é verificada no servidor, independentemente do navegador.
  if (novaSenha !== confirmacao) {
    // Retorna este resultado ao chamador e encerra o caminho atual da função.
    return { erro: "A nova senha e a confirmação devem ser iguais." } as const;
  // Conclui a condição de validação e seu bloco de tratamento, preservando a estrutura e o escopo definidos.
  }
  // Retorna este resultado ao chamador e encerra o caminho atual da função.
  return { professorId: Number(idTexto), senhaAdministrador, novaSenha } as const;
// Conclui a função validarRedefinicao, preservando a estrutura e o escopo definidos.
}


