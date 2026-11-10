/**
 * Regras do cadastro de usuários. As dependências explícitas permitem testar
 * autorização e gravação sem acessar ou alterar os cadastros reais.
 */

// Somente estes dois perfis podem ser criados pela interface administrativa.
export type PerfilNovoUsuario = "professor" | "administrador";
// Declara o contrato de ResultadoCadastro para validar os dados durante a compilação TypeScript.
export type ResultadoCadastro = { sucesso: boolean; mensagem: string };
// Declara o contrato de Administrador para validar os dados durante a compilação TypeScript.
type Administrador = { id: number; perfil: string };
// Declara o contrato de EntradaCadastro para validar os dados durante a compilação TypeScript.
type EntradaCadastro = {
  // Nome de apresentação da pessoa, separado do identificador de login.
  nome: string; usuario: string; email: string | null;
  // Senha original mantida apenas durante a validação, sem remoção de espaços.
  senha: string; senhaAdministrador: string; perfil: PerfilNovoUsuario;
// Conclui a construção sintática iniciada nas linhas anteriores, preservando a estrutura e o escopo definidos.
};

// A camada MySQL recebe o hash, nunca a senha original do novo usuário.
export type NovoUsuarioBanco = Omit<EntradaCadastro, "senha" | "senhaAdministrador"> & {
  // Hash Argon2id encaminhado à persistência no lugar do segredo original.
  senhaHash: string;
// Conclui a construção sintática iniciada nas linhas anteriores, preservando a estrutura e o escopo definidos.
};
// Declara o contrato de DependenciasCadastro para validar os dados durante a compilação TypeScript.
export interface DependenciasCadastro {
  // Dependência que consulta a sessão e retorna apenas uma conta com permissão administrativa.
  obterAdministrador: () => Promise<Administrador | null>;
  // Dependência que consulta o hash atual da conta que autoriza a operação.
  obterCredencial: (id: number) => Promise<string | null>;
  // Dependência que compara a senha digitada ao hash existente.
  verificarSenha: (hash: string, senha: string) => Promise<boolean>;
  // Dependência que aplica Argon2id segundo o perfil da conta criada.
  gerarHash: (senha: string, perfil: PerfilNovoUsuario) => Promise<string>;
  // Dependência que grava somente a conta nova após revalidar a autorização.
  inserir: (novo: NovoUsuarioBanco, administradorId: number, credencial: string) => Promise<boolean>;
// Conclui a estrutura de tipos DependenciasCadastro, preservando a estrutura e o escopo definidos.
}

/** Valida tipos e limites compatíveis com a tabela professores existente. */
// Define validarCadastro e seus parâmetros; as próximas linhas implementam essa responsabilidade.
export function validarCadastro(dados: FormData): EntradaCadastro | { erro: string } {
  // Prepara campos com o valor indicado para uso nas próximas etapas deste fluxo.
  const campos = ["nome", "usuario", "email", "senha", "confirmacao", "senhaAdministrador", "administrador"];
  // Rejeita arquivos e parâmetros repetidos em vez de escolher um valor ambíguo.
  for (const campo of campos) {
    // Verifica (dados.getAll(campo).length > 1 || antes de permitir a continuação desta operação.
    if (dados.getAll(campo).length > 1 ||
        // Rejeita arquivos ou outros valores enviados no lugar de um campo textual de cadastro.
        (dados.has(campo) && typeof dados.get(campo) !== "string")) {
      // Retorna este resultado ao chamador e encerra o caminho atual da função.
      return { erro: "Dados de cadastro inválidos." };
    // Conclui a condição de validação e seu bloco de tratamento, preservando a estrutura e o escopo definidos.
    }
  // Conclui a repetição sobre os valores examinados, preservando a estrutura e o escopo definidos.
  }
  // Normaliza somente informações públicas; senhas mantêm todos os espaços.
  const nome = String(dados.get("nome") ?? "").trim();
  // Identificador único usado para acessar o sistema.
  const usuario = String(dados.get("usuario") ?? "").trim();
  // Contato opcional; null permite contas sem e-mail sem conflitar com o índice único.
  const email = String(dados.get("email") ?? "").trim();
  // Senha original mantida apenas durante a validação, sem remoção de espaços.
  const senha = String(dados.get("senha") ?? "");
  // Segunda digitação que deve corresponder exatamente à nova senha.
  const confirmacao = dados.get("confirmacao");
  // Credencial informada para reconfirmar a identidade do administrador conectado.
  const senhaAdministrador = String(dados.get("senhaAdministrador") ?? "");
  // Prepara permissao com o valor indicado para uso nas próximas etapas deste fluxo.
  const permissao = dados.get("administrador");

  // Verifica (!nome || nome.length > 150 || !/^[a-zA-Z0-9._-]{1,50}$/.test(usuario)) antes de permitir a continuação desta operação.
  if (!nome || nome.length > 150 || !/^[a-zA-Z0-9._-]{1,50}$/.test(usuario)) {
    // Retorna este resultado ao chamador e encerra o caminho atual da função.
    return { erro: "Informe nome (até 150 caracteres) e usuário válido (até 50 caracteres, sem espaços)." };
  // Conclui a condição de validação e seu bloco de tratamento, preservando a estrutura e o escopo definidos.
  }
  // Verifica (email && (email.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) antes de permitir a continuação desta operação.
  if (email && (email.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    // Retorna este resultado ao chamador e encerra o caminho atual da função.
    return { erro: "Informe um e-mail válido de até 150 caracteres ou deixe em branco." };
  // Conclui a condição de validação e seu bloco de tratamento, preservando a estrutura e o escopo definidos.
  }
  // O cliente não escolhe livremente um perfil: nunca é criado admin_principal.
  if (permissao !== null && permissao !== "on") return { erro: "Permissão inválida." };
  // Prepara perfil: PerfilNovoUsuario com o valor indicado para uso nas próximas etapas deste fluxo.
  const perfil: PerfilNovoUsuario = permissao === "on" ? "administrador" : "professor";
  // Verifica (!senha || senha.length > 1024 || !senhaAdministrador || senhaAdministrador.length > 1024) antes de permitir a continuação desta operação.
  if (!senha || senha.length > 1024 || !senhaAdministrador || senhaAdministrador.length > 1024) {
    // Retorna este resultado ao chamador e encerra o caminho atual da função.
    return { erro: "Informe a nova senha e sua senha de administrador (até 1024 caracteres)." };
  // Conclui a condição de validação e seu bloco de tratamento, preservando a estrutura e o escopo definidos.
  }
  // A senha livre é aplicada a professores; administradores mantêm a política atual.
  if (perfil === "administrador" && senha.length < 6) {
    // Retorna este resultado ao chamador e encerra o caminho atual da função.
    return { erro: "Novos administradores precisam de senha com pelo menos 6 caracteres." };
  // Conclui a condição de validação e seu bloco de tratamento, preservando a estrutura e o escopo definidos.
  }
  // Verifica (senha !== confirmacao) return { erro: "A senha e a confirmação devem ser iguais." }; antes de permitir a continuação desta operação.
  if (senha !== confirmacao) return { erro: "A senha e a confirmação devem ser iguais." };
  // Retorna este resultado ao chamador e encerra o caminho atual da função.
  return { nome, usuario, email: email || null, senha, senhaAdministrador, perfil };
// Conclui a função validarCadastro, preservando a estrutura e o escopo definidos.
}

/** Só gera o hash e insere a conta depois de autenticar novamente o administrador. */
// Define executarCadastro e seus parâmetros; as próximas linhas implementam essa responsabilidade.
export async function executarCadastro(
  // Define dados com o tipo ou valor exigido por este objeto de dados.
  dados: FormData, dependencias: DependenciasCadastro,
// Declara o tipo do resultado assíncrono: ): Promise<ResultadoCadastro>.
): Promise<ResultadoCadastro> {
  // Inicia o trecho que pode falhar e será protegido pelo tratamento de exceções.
  try {
    // Aguarda o resultado de dependencias.obterAdministrador() e o guarda em administrador.
    const administrador = await dependencias.obterAdministrador();
    // Verifica (!administrador || !["admin_principal", "administrador"].includes(administrador.perfil)) antes de permitir a continuação desta operação.
    if (!administrador || !["admin_principal", "administrador"].includes(administrador.perfil)) {
      // Retorna este resultado ao chamador e encerra o caminho atual da função.
      return { sucesso: false, mensagem: "Acesso administrativo necessário." };
    // Conclui a condição de validação e seu bloco de tratamento, preservando a estrutura e o escopo definidos.
    }
    // Prepara entrada com o valor indicado para uso nas próximas etapas deste fluxo.
    const entrada = validarCadastro(dados);
    // Verifica ("erro" in entrada) return { sucesso: false, mensagem: entrada.erro }; antes de permitir a continuação desta operação.
    if ("erro" in entrada) return { sucesso: false, mensagem: entrada.erro };
    // Aguarda o resultado de dependencias.obterCredencial(administrador.id) e o guarda em credencial.
    const credencial = await dependencias.obterCredencial(administrador.id);
    // Verifica (!credencial || !(await dependencias.verificarSenha(credencial, entrada.senhaAdministrador))) antes de permitir a continuação desta operação.
    if (!credencial || !(await dependencias.verificarSenha(credencial, entrada.senhaAdministrador))) {
      // Retorna este resultado ao chamador e encerra o caminho atual da função.
      return { sucesso: false, mensagem: "Senha do administrador incorreta." };
    // Conclui a condição de validação e seu bloco de tratamento, preservando a estrutura e o escopo definidos.
    }
    // Hash Argon2id encaminhado à persistência no lugar do segredo original.
    const senhaHash = await dependencias.gerarHash(entrada.senha, entrada.perfil);
    // Monta explicitamente o registro, sem encaminhar senhas originais à persistência.
    const inserido = await dependencias.inserir({
      // Nome de apresentação da pessoa, separado do identificador de login.
      nome: entrada.nome, usuario: entrada.usuario, email: entrada.email,
      // Nível de acesso usado pelo servidor para autorizar operações.
      perfil: entrada.perfil, senhaHash,
    // Conclui os dados públicos e fornece o autor autenticado e o hash usado na confirmação administrativa.
    }, administrador.id, credencial);
    // Verifica (!inserido) return { sucesso: false, mensagem: "Sua autorização mudou. Atualize a página e tente novamente." }; antes de permitir a continuação desta operação.
    if (!inserido) return { sucesso: false, mensagem: "Sua autorização mudou. Atualize a página e tente novamente." };
    // Retorna este resultado ao chamador e encerra o caminho atual da função.
    return { sucesso: true, mensagem: "Usuário criado com sucesso." };
  // Captura falhas desta operação para apresentar uma resposta controlada.
  } catch (erro) {
    // Os índices únicos protegem também contra cadastros simultâneos duplicados.
    if (erro && typeof erro === "object" && "code" in erro && erro.code === "ER_DUP_ENTRY") {
      // Retorna este resultado ao chamador e encerra o caminho atual da função.
      return { sucesso: false, mensagem: "Usuário ou e-mail já cadastrado." };
    // Conclui a condição de validação e seu bloco de tratamento, preservando a estrutura e o escopo definidos.
    }
    // Não inclui mensagens do MySQL, hashes nem segredos na resposta pública.
    return { sucesso: false, mensagem: "Não foi possível criar o usuário. Tente novamente." };
  // Conclui o bloco de tratamento de falhas da operação, preservando a estrutura e o escopo definidos.
  }
// Conclui a função executarCadastro, preservando a estrutura e o escopo definidos.
}


