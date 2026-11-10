// Rascunhos desta fase existem apenas em memória e não constituem um cadastro definitivo.
export type EnrollmentDraft = Record<string, string>;
// Confere datas civis antes de compará-las, sem permitir conversão silenciosa de 31/02.
function validDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value + "T00:00:00Z")) && new Date(value + "T00:00:00Z").toISOString().slice(0, 10) === value; // UTC evita frações por fuso.
}
// A idade relevante é a da matrícula, inclusive quando ela ocorreu antes da maioridade atual.
export function needsGuardian(birth: string, enrolled: string): boolean {
  if (!validDate(birth) || !validDate(enrolled)) return false; // Datas incompletas serão apontadas na validação, sem inventar idade.
  const age = Number(enrolled.slice(0, 4)) - Number(birth.slice(0, 4)) - Number(enrolled.slice(5) < birth.slice(5)); // Desconta o aniversário ainda não ocorrido naquele ano.
  return age < 18; // Responsável adicional pode ser necessário mesmo depois da maioridade.
}
// Aplica regras da prévia; o futuro serviço deverá repetir e ampliar validações no servidor.
export function enrollmentErrors(draft: EnrollmentDraft, today: string): string[] {
  const errors: string[] = []; // Coleção local nunca é enviada a logs ou ao banco.
  const required = ["name", "cpf", "birth", "phone", "address", "registration", "enrolled", "teacher", "emergency", "emergencyPhone", "plan", "status", "grade"]; // E-mail é opcional e responsável é condicional.
  if (required.some((key) => !draft[key]?.trim())) errors.push("Preencha os campos obrigatórios da matrícula."); // Não transforma ausência em informação inventada.
  if (draft.cpf && !/^\d{11}$/.test(draft.cpf.replace(/\D/g, ""))) errors.push("Preencha o CPF completo, com 11 dígitos."); // Esta prévia confere preenchimento; os verificadores também serão exigidos no serviço definitivo.
  for (const key of ["phone", "emergencyPhone"]) {
    if (draft[key] && !/^\d{10,11}$/.test(draft[key].replace(/\D/g, ""))) errors.push("Preencha os telefones completos, com DDD."); // Fixo e celular têm máscara e tamanho próprios.
  }
  for (const key of ["birth", "registration", "enrolled"]) {
    if (!validDate(draft[key] ?? "") || draft[key] > today) errors.push("Informe datas válidas até hoje."); // A prévia não recebe nascimento ou matrícula futura.
  }
  if (draft.birth > draft.enrolled || draft.registration > draft.enrolled) errors.push("Nascimento e inscrição não podem ser posteriores à matrícula."); // Mantém coerência do calendário informado.
  if (needsGuardian(draft.birth ?? "", draft.enrolled ?? "") || draft.guardianNeeded === "sim") {
    if (["guardian", "guardianRelation", "guardianDocument", "guardianPhone", "guardianDocumentType"].some((key) => !draft[key]?.trim())) errors.push("Preencha os dados do responsável legal."); // Emergência não substitui o vínculo legal.
  }
  if (needsGuardian(draft.birth ?? "", draft.enrolled ?? "") || draft.guardianNeeded === "sim") {
    if (draft.guardianPhone && !/^\d{10,11}$/.test(draft.guardianPhone.replace(/\D/g, ""))) errors.push("Preencha o telefone do responsável com DDD."); // Responsável segue o mesmo padrão de contato nacional.
    if (draft.guardianDocumentType === "cpf" && !/^\d{11}$/.test((draft.guardianDocument ?? "").replace(/\D/g, ""))) errors.push("Preencha o CPF completo do responsável."); // RG não recebe exigência de onze dígitos.
  }
  for (const key of ["trained", "condition", "medication", "injury"]) {
    if (!["sim", "nao"].includes(draft[key])) errors.push("Responda explicitamente às perguntas de experiência e segurança."); // Vazio não equivale a Não.
    if (draft[key] === "sim" && !draft[key + "Details"]?.trim()) errors.push("Detalhe as respostas marcadas como Sim."); // Detalhes só são obrigatórios quando aplicáveis.
  }
  return [...new Set(errors)]; // Evita repetir a mesma orientação na lista visual.
}
