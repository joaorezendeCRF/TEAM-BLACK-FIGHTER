// Define exclusivamente as operações disponíveis para o administrador principal.
export type OperacaoConta = "inativar" | "reativar" | "excluir";
// Retorna apenas informações públicas que podem aparecer na interface.
export type ResultadoConta = { sucesso: boolean; mensagem: string };
// Representa a conta alvo sem incluir dados de senha.
export type ContaGerenciada = { id: number; usuario: string; perfil: string; ativo: boolean };
// Agrupa os valores já validados antes de consultar a conta escolhida.
type EntradaConta = { usuarioId: number; operacao: OperacaoConta; confirmacaoUsuario: string; senhaAdministrador: string };
// Encaminha ao banco somente identificadores, hash confirmado e estado esperado.
export type ComandoConta = { alvoId: number; autorId: number; credencial: string; usuarioConfirmado: string; ativoEsperado: boolean; operacao: OperacaoConta };
// Distingue a conclusão de uma alteração concorrente ou de vínculos que impedem excluir.
export type ResultadoPersistenciaConta = "concluido" | "alterado" | "vinculado";
// Permite testar todas as regras sem abrir conexão ou alterar contas reais.
export interface DependenciasConta {
  // Consulta novamente a identidade autenticada e o perfil atual do autor.
  obterAdministrador: () => Promise<{ id: number; perfil: string } | null>;
  // Consulta os dados atuais da conta escolhida, sem confiar na linha exibida na tela.
  obterAlvo: (id: number) => Promise<ContaGerenciada | null>;
  // Lê somente a credencial de um administrador principal que continua ativo.
  obterCredencial: (id: number) => Promise<string | null>;
  // Usa a verificação Argon2id existente para reconfirmar a identidade do autor.
  verificarSenha: (hash: string, senha: string) => Promise<boolean>;
  // Efetua uma única operação e revalida as condições no instante da gravação.
  operar: (comando: ComandoConta) => Promise<ResultadoPersistenciaConta>;
// Finaliza o contrato das dependências substituídas por simuladores nos testes.
}

// Valida os campos recebidos mesmo quando a solicitação não veio da interface.
export function validarOperacaoConta(dados: FormData): EntradaConta | { erro: string } {
  // Lista todos os campos obrigatórios para impedir arquivos e parâmetros duplicados.
  const campos = ["usuarioId", "operacao", "confirmacaoUsuario", "senhaAdministrador"];
  // Examina cada campo antes de realizar conversões de valores.
  for (const campo of campos) {
    // Exige exatamente uma ocorrência textual, recusando arquivos e campos ausentes.
    if (dados.getAll(campo).length !== 1 || typeof dados.get(campo) !== "string") {
      // Uma entrada ambígua não pode selecionar contas ou operações diferentes.
      return { erro: "Dados da operação inválidos." };
    // Finaliza a recusa do campo inválido.
    }
  // Finaliza a verificação dos quatro campos obrigatórios.
  }
  // Recupera o identificador textual depois de verificar seu tipo.
  const idTexto = dados.get("usuarioId") as string;
  // Recupera a operação sem aceitar nomes de métodos ou instruções livres do cliente.
  const operacao = dados.get("operacao") as string;
  // Mantém o login confirmado exatamente como digitado, inclusive maiúsculas.
  const confirmacaoUsuario = dados.get("confirmacaoUsuario") as string;
  // Mantém a senha intacta; espaços podem fazer parte da credencial.
  const senhaAdministrador = dados.get("senhaAdministrador") as string;
  // Recusa identificadores negativos, fracionários, inseguros ou com conteúdo SQL.
  if (!/^[1-9]\d*$/.test(idTexto) || !Number.isSafeInteger(Number(idTexto))) {
    // Nenhuma conta é consultada a partir de um identificador inválido.
    return { erro: "Usuário inválido." };
  // Finaliza a validação do identificador.
  }
  // A lista fechada impede solicitar uma ação diferente das três autorizadas.
  if (operacao !== "inativar" && operacao !== "reativar" && operacao !== "excluir") {
    // Uma operação desconhecida nunca chega à persistência.
    return { erro: "Operação inválida." };
  // Finaliza a validação da operação.
  }
  // Confere o tamanho do login e da senha antes de consultar o banco ou executar Argon2id.
  if (!confirmacaoUsuario || confirmacaoUsuario.length > 50 || !senhaAdministrador || senhaAdministrador.length > 1024) {
    // Pede os dados necessários sem expor informações internas da conta.
    return { erro: "Confirme o usuário escolhido e informe sua senha." };
  // Finaliza a validação dos valores textuais.
  }
  // Retorna somente os campos reconhecidos e o identificador convertido com segurança.
  return { usuarioId: Number(idTexto), operacao, confirmacaoUsuario, senhaAdministrador };
// Finaliza a validação da entrada administrativa.
}

// Centraliza autorização, confirmação e proteção das contas antes de qualquer alteração.
export async function executarOperacaoConta(dados: FormData, dependencias: DependenciasConta): Promise<ResultadoConta> {
  // Protege o fluxo contra erros de consulta, verificação de senha e persistência.
  try {
    // Revalida a sessão em cada operação, mesmo se o botão já estava visível.
    const autor = await dependencias.obterAdministrador();
    // Professor e administrador comum não podem excluir, inativar ou reativar contas.
    if (!autor || autor.perfil !== "admin_principal") {
      // A recusa ocorre antes de consultar o alvo ou verificar credenciais.
      return { sucesso: false, mensagem: "Apenas o administrador principal pode gerenciar a situação ou excluir usuários." };
    // Finaliza a verificação exclusiva do perfil de desenvolvedor atual.
    }
    // Valida a solicitação antes de procurar o registro escolhido.
    const entrada = validarOperacaoConta(dados);
    // Devolve erros de preenchimento sem tentar alterar uma conta.
    if ("erro" in entrada) return { sucesso: false, mensagem: entrada.erro };
    // Protege a própria conta antes de realizar qualquer consulta adicional.
    if (entrada.usuarioId === autor.id) return { sucesso: false, mensagem: "Sua própria conta está protegida." };
    // Lê a conta atual, pois nome, situação e perfil podem mudar depois de abrir a tela.
    const alvo = await dependencias.obterAlvo(entrada.usuarioId);
    // Não trata uma conta inexistente ou removida por outra solicitação como sucesso.
    if (!alvo) return { sucesso: false, mensagem: "Usuário não encontrado. Atualize a página." };
    // A identidade retornada também precisa corresponder ao identificador solicitado.
    if (alvo.id !== entrada.usuarioId) return { sucesso: false, mensagem: "Usuário inválido." };
    // Protege todos os administradores principais e quaisquer perfis desconhecidos.
    if (alvo.perfil !== "professor" && alvo.perfil !== "administrador") {
      // Impede tanto a perda do administrador principal quanto alterações de perfis futuros não avaliados.
      return { sucesso: false, mensagem: "Esta conta está protegida." };
    // Finaliza a verificação dos perfis que podem ser gerenciados.
    }
    // Confere a confirmação pelo login atual, e não pelo nome de apresentação.
    if (entrada.confirmacaoUsuario !== alvo.usuario) return { sucesso: false, mensagem: "A confirmação deve corresponder exatamente ao usuário escolhido." };
    // Evita anunciar uma inativação que já ocorreu em outra solicitação.
    if (entrada.operacao === "inativar" && !alvo.ativo) return { sucesso: false, mensagem: "Este usuário já está inativo. Atualize a página." };
    // Evita anunciar uma reativação que já ocorreu em outra solicitação.
    if (entrada.operacao === "reativar" && alvo.ativo) return { sucesso: false, mensagem: "Este usuário já está ativo. Atualize a página." };
    // Recupera a credencial somente se o autor ainda estiver ativo e for administrador principal.
    const credencial = await dependencias.obterCredencial(autor.id);
    // Reconfirma a senha do autor antes de permitir qualquer alteração.
    if (!credencial || !(await dependencias.verificarSenha(credencial, entrada.senhaAdministrador))) {
      // A falha não prossegue para o comando de banco.
      return { sucesso: false, mensagem: "Senha do administrador incorreta." };
    // Finaliza a confirmação administrativa.
    }
    // Monta explicitamente o comando sem encaminhar a senha digitada à persistência.
    const resultado = await dependencias.operar({ alvoId: alvo.id, autorId: autor.id, credencial, usuarioConfirmado: alvo.usuario, ativoEsperado: alvo.ativo, operacao: entrada.operacao });
    // Vínculos ou efeitos de exclusão em outras tabelas bloqueiam a remoção permanente.
    if (resultado === "vinculado") return { sucesso: false, mensagem: "A exclusão está bloqueada por vínculos ou regras do banco. Prefira inativar o usuário." };
    // Nenhuma linha alterada indica que a conta ou a autorização mudou durante a confirmação.
    if (resultado !== "concluido") return { sucesso: false, mensagem: "A conta ou sua autorização mudou. Atualize a página e tente novamente." };
    // Escolhe o retorno público adequado à operação realmente concluída.
    const mensagens = { excluir: "Usuário excluído com sucesso.", inativar: "Usuário inativado com sucesso.", reativar: "Usuário reativado com sucesso." };
    // Confirma o resultado sem devolver credenciais ou dados internos.
    return { sucesso: true, mensagem: mensagens[entrada.operacao] };
  // Captura falhas sem divulgar o SQL, o hash ou a senha informada.
  } catch (erro) {
    // Chaves estrangeiras restritivas impedem a remoção de usuários referenciados.
    if (erro && typeof erro === "object" && "code" in erro && ["ER_ROW_IS_REFERENCED", "ER_ROW_IS_REFERENCED_2"].includes(String(erro.code))) {
      // Orienta a alternativa que mantém o cadastro e seus vínculos.
      return { sucesso: false, mensagem: "Este usuário possui registros vinculados. Prefira inativá-lo." };
    // Finaliza o tratamento específico dos vínculos protegidos pelo MySQL.
    }
    // Outros erros são apresentados sem expor detalhes do servidor.
    return { sucesso: false, mensagem: "Não foi possível concluir a operação. Tente novamente." };
  // Finaliza o tratamento de falhas.
  }
// Finaliza o fluxo administrativo de gerenciamento da conta.
}

