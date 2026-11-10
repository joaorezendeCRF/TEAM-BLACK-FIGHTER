// Esta camada só pode ser importada pelo servidor; ainda não está conectada a uma rota de gravação.
import "server-only";
// Calendário e campos condicionais reutilizam as regras verificadas da prévia.
import { enrollmentErrors, needsGuardian, type EnrollmentDraft } from "../demonstracao/enrollment";
// Os seis planos aprovados mantêm preços e modalidades centralizados no servidor.
import { obterPlano } from "../planos";
// O catálogo de faixas permanece centralizado, sem aceitar graduação arbitrária no pedido.
import { GRADES } from "../demonstracao/billing";
// A remoção da pontuação ocorre depois de verificar o conteúdo integral, sem truncar dados enviados ao servidor.
const digitsOnly = (value: string) => value.replace(/\D/g, "");
// Validação de dígitos verificadores não comprova identidade, titularidade ou situação cadastral.
export function validCpf(value: string): boolean {
  if (!/^[\d.\-\s]+$/.test(value)) return false; // Recusa letras e outros símbolos em vez de convertê-los silenciosamente.
  const digits = digitsOnly(value); // Preserva zeros iniciais como texto.
  if (!/^\d{11}$/.test(digits) || /^(\d)\1{10}$/.test(digits)) return false; // Exige onze dígitos e rejeita sequências repetidas.
  for (const length of [9, 10]) {
    const sum = [...digits.slice(0, length)].reduce((total, digit, index) => total + Number(digit) * (length + 1 - index), 0); // Cada verificador usa os pesos decrescentes correspondentes.
    const remainder = (sum * 10) % 11; // Calcula o resto sem usar serviços externos.
    if (Number(digits[length]) !== (remainder === 10 ? 0 : remainder)) return false; // Ambos os verificadores precisam conferir.
  }
  return true; // Indica consistência matemática, não confirmação de identidade.
}
// Telefones brasileiros recebem DDD e oito ou nove dígitos locais; não presume titularidade.
export function validPhone(value: string): boolean {
  return /^[\d()\-\s]+$/.test(value) && /^\d{10,11}$/.test(digitsOnly(value)) && !/^(\d)\1+$/.test(digitsOnly(value)); // Não trunca entradas grandes no servidor.
}
// Esta conta deve vir da autenticação revalidada no servidor, nunca de campos do formulário.
export type CadastroActor = { id: number; perfil: string };
// A decisão do usuário permite que professores ativos trabalhem com todos os alunos.
export function canRegisterStudent(actor: CadastroActor | null): boolean {
  return !!actor && Number.isSafeInteger(actor.id) && actor.id > 0 && ["admin_principal", "administrador", "professor"].includes(actor.perfil); // Não inclui visitantes, sessões ausentes ou perfis desconhecidos.
}
// Dados separados evitam incluir saúde no mesmo objeto usado pelas listas de alunos.
export type CadastroNormalizado = {
  basic: EnrollmentDraft; // Dados cadastrais normalizados e escolha do plano; não incluem respostas de saúde.
  safety: EnrollmentDraft; // Respostas de segurança destinadas à persistência e leitura restritas.
  guardian: EnrollmentDraft | null; // Responsável só existe quando necessário naquela matrícula.
};
// Valida o contrato futuro sem confiar em controles HTML ou na máscara de apresentação.
export function normalizeEnrollment(input: Record<string, unknown>, today: string): CadastroNormalizado {
  const allowed = ["name", "cpf", "birth", "phone", "email", "address", "registration", "enrolled", "teacher", "teacherId", "emergency", "emergencyPhone", "plan", "status", "grade", "trained", "trainedDetails", "guardianNeeded", "guardian", "guardianRelation", "guardianDocument", "guardianDocumentType", "guardianPhone", "condition", "conditionDetails", "medication", "medicationDetails", "injury", "injuryDetails"]; // Lista fechada impede inserir colunas arbitrárias.
  const draft: EnrollmentDraft = {}; // Cria uma cópia sem modificar o pedido original.
  for (const [key, value] of Object.entries(input)) {
    if (!allowed.includes(key) || typeof value !== "string" || value.length > 500) throw new Error("Campos de cadastro inválidos."); // Recusa arquivos, arrays, campos extras e textos excessivos.
    draft[key] = value.trim(); // Remove somente espaços externos de dados textuais.
  }
  // Limites seguem as colunas aprovadas, evitando truncamento silencioso de dados.
  const limites: Record<string, number> = { name: 150, email: 150, address: 300, emergency: 150, guardian: 150, guardianRelation: 100, guardianDocument: 150 };
  // Campos opcionais continuam ausentes quando não preenchidos.
  if (Object.entries(limites).some(([key, limite]) => (draft[key]?.length ?? 0) > limite)) throw new Error("Confira o tamanho dos campos.");
  if (enrollmentErrors(draft, today).length) throw new Error("Confira os campos obrigatórios e as datas da matrícula."); // Erro público não copia informações sensíveis.
  if (!validCpf(draft.cpf)) throw new Error("CPF inválido."); // A máscara sozinha não valida os verificadores.
  if (![draft.phone, draft.emergencyPhone].every(validPhone)) throw new Error("Informe telefones completos com DDD."); // Normaliza somente depois de rejeitar entradas inválidas.
  obterPlano(draft.plan); // Recusa plano desconhecido e não aceita preço arbitrário do cliente.
  if (!["ativo", "inativo"].includes(draft.status) || !GRADES.some((grade) => grade.id === draft.grade)) throw new Error("Plano, faixa ou situação inválidos."); // Não aceita valores fora do catálogo aprovado.
  if (!/^\d+$/.test(draft.teacherId ?? "") || !Number.isSafeInteger(Number(draft.teacherId)) || Number(draft.teacherId) <= 0) throw new Error("Selecione um professor válido."); // A futura interface deverá enviar vínculo por ID, não somente texto.
  if (draft.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email)) throw new Error("E-mail inválido."); // Ausência continua permitida.
  const basic: EnrollmentDraft = {}; // Copia somente campos administrativos aprovados.
  for (const key of ["name", "cpf", "birth", "phone", "email", "address", "registration", "enrolled", "teacherId", "emergency", "emergencyPhone", "plan", "status", "grade", "trained"]) basic[key] = draft[key] ?? ""; // Professor será recuperado do vínculo na leitura.
  basic.cpf = digitsOnly(draft.cpf); basic.phone = digitsOnly(draft.phone); basic.emergencyPhone = digitsOnly(draft.emergencyPhone); // Persistência futura receberá apenas dígitos, sem perder zeros iniciais.
  if (draft.trained === "sim") basic.trainedDetails = draft.trainedDetails; // Uma mudança para Não não reaproveita detalhes antigos escondidos na tela.
  const safety: EnrollmentDraft = {}; // Saúde permanece fora dos campos da lista e das cobranças.
  for (const key of ["condition", "medication", "injury"]) {
    safety[key] = draft[key]; // Respostas explícitas são preservadas sem inventar ausência de condição.
    if (draft[key] === "sim") safety[key + "Details"] = draft[key + "Details"]; // Copia detalhes somente quando necessários.
  }
  let guardian: EnrollmentDraft | null = null; // Adulto sem representação necessária não cria responsável inventado.
  if (needsGuardian(draft.birth, draft.enrolled) || draft.guardianNeeded === "sim") {
    if (!validPhone(draft.guardianPhone)) throw new Error("Telefone do responsável inválido."); // O mesmo padrão com DDD vale para o vínculo legal.
    if (!["cpf", "rg", "outro"].includes(draft.guardianDocumentType)) throw new Error("Selecione o tipo de documento do responsável."); // CPF não é imposto a quem informou outro documento.
    if (draft.guardianDocumentType === "cpf" && !validCpf(draft.guardianDocument)) throw new Error("CPF do responsável inválido."); // RG e outros documentos conservam seu próprio conteúdo.
    guardian = { name: draft.guardian, relation: draft.guardianRelation, documentType: draft.guardianDocumentType, document: draft.guardianDocumentType === "cpf" ? digitsOnly(draft.guardianDocument) : draft.guardianDocument, phone: digitsOnly(draft.guardianPhone) }; // Responsável fica separado de emergência.
  }
  return { basic, safety, guardian }; // Este objeto não deve ser incluído em logs, auditoria ou respostas públicas.
}
// Contrato da próxima persistência: a implementação deverá revalidar sessão e professor na mesma transação que grava aluno, matrícula e auditoria.
export type CadastroDependencies = {
  reportError?: (erro: unknown) => Promise<string>; // Diagnóstico seguro é opcional nos testes e obrigatório no adaptador de produção.
  enabled: boolean; // Deve permanecer false enquanto esquema, permissões e ambiente não forem validados.
  authenticatedActor: () => Promise<CadastroActor | null>; // Fonte exclusiva de autorização, revalidada no servidor.
  activeTeacher: (id: number) => Promise<boolean>; // Confirma vínculo com conta ativa e perfil professor.
  registerAtomically: (data: CadastroNormalizado, actor: CadastroActor) => Promise<{ id: string }>; // Contrato ainda sem adaptador SQL ou rota pública.
};
// Prepara o serviço com dependências explícitas para exercitar bloqueios sem tocar em banco existente.
export async function prepareStudentRegistration(input: Record<string, unknown>, today: string, dependencies: CadastroDependencies) {
  if (!dependencies.enabled) return { ok: false, message: "Gravação de alunos ainda não habilitada." }; // Desligado por padrão antes de qualquer consulta ou escrita.
  const actor = await dependencies.authenticatedActor(); // Identidade nunca é aceita do formulário.
  if (!canRegisterStudent(actor)) return { ok: false, message: "Acesso não autorizado." }; // Bloqueia anônimos e perfis desconhecidos antes de validar dados sensíveis.
  try {
    const normalized = normalizeEnrollment(input, today); // Valida e separa informações antes de persistir.
    if (!await dependencies.activeTeacher(Number(normalized.basic.teacherId))) return { ok: false, message: "Professor indisponível para matrícula." }; // Não cria vínculo inexistente ou inativo.
    const result = await dependencies.registerAtomically(normalized, actor!); // Apenas o futuro adaptador transacional poderá gravar após revalidar a autorização.
    return { ok: true, message: "Matrícula registrada.", id: result.id }; // Resposta não inclui CPF, telefone, saúde ou documentos.
  } catch (erro) {
    const referencia = await dependencies.reportError?.(erro); // O registrador seleciona apenas um código conhecido, sem copiar campos pessoais.
    return { ok: false, message: "Não foi possível registrar. Confira os campos e tente novamente." + (referencia ? " Referência: " + referencia : "") }; // Erros SQL, payloads e dados pessoais não são expostos ou registrados em logs.
  }
}
