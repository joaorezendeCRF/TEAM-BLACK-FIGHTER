// O resumo detecta alterações concorrentes sem enviar hashes de senha ao navegador.
import { createHash } from "node:crypto";
// Somente os campos públicos editáveis participam da conferência de versão.
export type ContaEditavel = {
  // Chave numérica da única conta alvo da edição.
  id: number;
  // Nome de apresentação, sem participar da autenticação.
  nome: string;
  // Login único; mudar seu valor exige nova entrada da pessoa no sistema.
  usuario: string;
  // Contato opcional; ausência é NULL, sem endereço inventado.
  email: string | null;
  // Permissão atual usada para proteger principais e limitar administradores comuns.
  perfil: string;
  // Situação participa da versão para impedir restaurar estado antigo por outra edição.
  ativo: number;
};
// A versão inclui situação e perfil para impedir que um formulário antigo restaure permissões.
export const versaoConta = (conta: ContaEditavel) => createHash("sha256").update(JSON.stringify([conta.id, conta.nome, conta.usuario, conta.email, conta.perfil, Number(conta.ativo)])).digest("hex");
// A sessão fornece o autor; o formulário nunca escolhe quem está autorizando o ato.
export type AutorEdicao = {
  // Identidade da sessão revalidada, nunca escolhida no formulário.
  id: number;
  // Papel atual que determina quais contas o autor pode editar.
  perfil: string;
};
// O retorno não inclui dados da conta nem credenciais.
export type ResultadoEdicao = {
  // Só verdadeiro quando a persistência confirmou a edição autorizada.
  sucesso: boolean;
  // Orientação pública não inclui erro SQL, conta de terceiros ou segredo.
  mensagem: string;
};
// O adaptador recebe apenas dados permitidos, versão esperada e hashes mantidos no servidor.
export type ComandoEdicao = {
  // Conta escolhida e revalidada pelo serviço.
  alvoId: number;
  // Autor autenticado que precisa continuar autorizado na transação.
  autorId: number;
  // Hash administrativo já reconfirmado; mudança concorrente da senha recusa a edição.
  credencial: string;
  // Resumo esperado dos campos atuais impede sobrescrever outro formulário.
  versao: string;
  // Novo nome limitado ao tamanho da coluna existente.
  nome: string;
  // Novo login limitado ao alfabeto permitido e ao índice único.
  usuario: string;
  // E-mail vazio já foi convertido em NULL antes de persistir.
  email: string | null;
  // Somente professor ou administrador comum; principal não é oferecido.
  perfil: string;
  // Hash novo é obrigatório na promoção; NULL conserva a senha nas demais edições.
  senhaHash: string | null;
};
// Dependências explícitas permitem testar recusas e concorrência sem usar contas reais.
export interface DependenciasEdicao {
  // Registra somente códigos técnicos seguros, sem copiar formulário ou senha para os logs.
  registrarFalha?: (erro: unknown) => Promise<string>;
  // Revalida a conta ativa e seu perfil administrativo.
  autor: () => Promise<AutorEdicao | null>;
  // Busca apenas os dados públicos necessários da conta escolhida.
  alvo: (id: number) => Promise<ContaEditavel | null>;
  // Obtém exclusivamente a credencial da conta autora no servidor.
  credencial: (id: number) => Promise<string | null>;
  // Reconfirma a senha digitada por Argon2id.
  verificar: (hash: string, senha: string) => Promise<boolean>;
  // Promoção administrativa exige nova senha com a política administrativa.
  hash: (senha: string) => Promise<string>;
  // Grava somente depois de repetir proteções e versão na transação.
  gravar: (comando: ComandoEdicao) => Promise<boolean>;
}
// A própria conta e todos os principais são protegidos; administrador comum edita professores.
export function podeEditarConta(autor: AutorEdicao, alvo: ContaEditavel): boolean {
  // A matriz é repetida pelo adaptador sob bloqueio no banco.
  return autor.id !== alvo.id && ["professor", "administrador"].includes(alvo.perfil) && (autor.perfil === "admin_principal" || (autor.perfil === "administrador" && alvo.perfil === "professor"));
}
// Valida a solicitação inteira antes de realizar qualquer escrita.
export async function executarEdicao(dados: FormData, deps: DependenciasEdicao): Promise<ResultadoEdicao> {
  // Uma falha pública nunca revela SQL, hashes ou o conteúdo de contas diferentes.
  const falha = (mensagem: string): ResultadoEdicao => ({ sucesso: false, mensagem });
  // Exceções do driver ou da verificação recebem tratamento uniforme.
  try {
    // Revalida a sessão em cada envio, sem confiar na tela previamente aberta.
    const autor = await deps.autor();
    // Somente contas administrativas ativas são aceitas pela dependência de sessão.
    if (!autor || !["admin_principal", "administrador"].includes(autor.perfil)) return falha("Acesso administrativo necessário.");
    // Rejeita arquivos e parâmetros duplicados em todos os campos conhecidos.
    const campos = ["id", "versao", "nome", "usuario", "email", "perfil", "senhaAdministrador", "novaSenha", "confirmacao"];
    // Valores desconhecidos nunca são encaminhados ao SQL.
    if (campos.some((chave) => dados.getAll(chave).length > 1 || (dados.has(chave) && typeof dados.get(chave) !== "string"))) return falha("Dados de edição inválidos.");
    // Normaliza somente texto público; espaços de senha são preservados.
    const texto = (chave: string) => String(dados.get(chave) ?? "");
    // Um identificador decimal positivo impede conversões ambíguas ou valores truncados.
    if (!/^[1-9]\d*$/.test(texto("id")) || !Number.isSafeInteger(Number(texto("id")))) return falha("Conta inválida.");
    // Lê os valores editáveis com os limites da tabela existente.
    const nome = texto("nome").trim(), usuario = texto("usuario").trim(), email = texto("email").trim(), perfil = texto("perfil");
    // Login aceita somente os mesmos caracteres já utilizados no cadastro de contas.
    if (!nome || nome.length > 150 || !/^[a-zA-Z0-9._-]{1,50}$/.test(usuario)) return falha("Informe nome e usuário válidos.");
    // E-mail permanece opcional; vazio será gravado como NULL.
    if (email && (email.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) return falha("Informe um e-mail válido ou deixe em branco.");
    // Nenhum formulário pode promover uma conta a administrador principal.
    if (!["professor", "administrador"].includes(perfil) || !/^[a-f0-9]{64}$/.test(texto("versao"))) return falha("Perfil ou versão inválidos.");
    // A conta alvo é recarregada para verificar proteção e concorrência antes da senha.
    const alvo = await deps.alvo(Number(texto("id")));
    // Uma conta protegida ou alterada desde a abertura exige atualizar a tela.
    if (!alvo || !podeEditarConta(autor, alvo) || versaoConta(alvo) !== texto("versao")) return falha("Conta protegida ou alterada. Atualize a página.");
    // Alterar perfil exige o administrador principal, inclusive em requisição forjada.
    if (perfil !== alvo.perfil && autor.perfil !== "admin_principal") return falha("Somente o administrador principal altera perfis.");
    // Reconferir a senha impede usar somente uma sessão esquecida aberta.
    const senha = texto("senhaAdministrador");
    // Limita o custo de entradas exageradas antes do Argon2id.
    if (!senha || senha.length > 1024) return falha("Confirme sua senha de administrador.");
    // O hash atual não é enviado ao componente cliente.
    const credencial = await deps.credencial(autor.id);
    // Uma senha incorreta impede qualquer geração de hash ou escrita.
    if (!credencial || !(await deps.verificar(credencial, senha))) return falha("Senha do administrador incorreta.");
    // Um professor promovido precisa receber uma senha que satisfaça a política de administrador.
    const promocao = alvo.perfil === "professor" && perfil === "administrador";
    // Senha e confirmação são usadas apenas durante esta requisição.
    const nova = texto("novaSenha"), confirmacao = texto("confirmacao");
    // A troca de senha só é aceita no caso explícito de promoção.
    if (promocao ? nova.length < 6 || nova.length > 1024 || nova !== confirmacao : Boolean(nova || confirmacao)) return falha("Na promoção, informe e confirme uma nova senha de pelo menos 6 caracteres.");
    // Mantém a senha atual em qualquer edição que não seja promoção administrativa.
    const senhaHash = promocao ? await deps.hash(nova) : null;
    // Revalida autor, alvo e versão dentro da mesma transação que atualiza a conta.
    const salvo = await deps.gravar({ alvoId: alvo.id, autorId: autor.id, credencial, versao: texto("versao"), nome, usuario, email: email || null, perfil, senhaHash });
    // Um conflito não anuncia sucesso nem sobrescreve mudanças feitas em outra tela.
    return salvo ? { sucesso: true, mensagem: "Usuário atualizado com sucesso." } : falha("A conta ou sua autorização mudou. Atualize a página.");
  } catch (erro) {
    // Diagnóstico recebe a exceção apenas para extrair um código de lista fechada.
    const referencia = await deps.registrarFalha?.(erro);
    // Índices únicos também protegem edições simultâneas do mesmo login ou e-mail.
    if (erro && typeof erro === "object" && "code" in erro && erro.code === "ER_DUP_ENTRY") return falha("Usuário ou e-mail já cadastrado.");
    // Não registra o formulário, senhas ou detalhes do banco em logs.
    return falha("Não foi possível atualizar o usuário. Tente novamente." + (referencia ? " Referência: " + referencia : ""));
  }
}
