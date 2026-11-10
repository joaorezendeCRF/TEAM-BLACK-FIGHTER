// Testa calendário e condicionais sem dados reais, consultas ou persistência.
import test from "node:test";
// Asserções estritas evitam presumir responsáveis ou respostas de saúde.
import assert from "node:assert/strict";
// Regras são exatamente as consumidas pela prévia do formulário.
import { needsGuardian, enrollmentErrors, type EnrollmentDraft } from "../lib/demonstracao/enrollment";
const today = "2026-10-23"; // Data fixa e independente do relógio do computador.
// Tokens fictícios exercitam obrigatoriedade; não representam identificação ou contato válido.
const draft: EnrollmentDraft = Object.fromEntries(["name", "cpf", "phone", "address", "teacher", "emergency", "emergencyPhone", "plan", "status", "grade"].map((key) => [key, "FICTÍCIO"]));
Object.assign(draft, { cpf:"0".repeat(11), phone:"0".repeat(10), emergencyPhone:"0".repeat(11), birth:"2000-01-01", registration:today, enrolled:today, trained:"nao", condition:"nao", medication:"nao", injury:"nao" }); // Não usa CPF ou contatos de pessoas.
test("maioridade é calculada na matrícula e não na data atual", () => {
  assert.equal(needsGuardian("2008-10-24", today), true); // Aniversário de dezoito anos ainda não ocorreu.
  assert.equal(needsGuardian("2008-10-23", today), false); // Dezoito anos completos naquela data.
  assert.equal(needsGuardian("2000-01-01", "2017-01-01"), true); // Matrícula antiga exige responsável mesmo se hoje é adulto.
});
test("email opcional não impede prévia e respostas não são inventadas", () => {
  assert.deepEqual(enrollmentErrors(draft, today), []); // Zeros testam máscara completa, mas não são declarados CPF válido; o serviço definitivo os rejeita.
  assert.ok(enrollmentErrors({ ...draft, injury:"" }, today).some((error) => error.includes("explicitamente"))); // Ausência não vira Não.
  assert.ok(enrollmentErrors({ ...draft, injury:"sim" }, today).some((error) => error.includes("Detalhe"))); // Sim exige detalhe correspondente.
});
test("responsável condicional e calendário são conferidos antes da revisão", () => {
  assert.ok(enrollmentErrors({ ...draft, birth:"2012-01-01" }, today).some((error) => error.includes("responsável"))); // Menor não pode ser revisado sem vínculo legal.
  assert.ok(enrollmentErrors({ ...draft, guardianNeeded:"sim" }, today).some((error) => error.includes("responsável"))); // A representação também pode ser necessária para adulto.
  assert.ok(enrollmentErrors({ ...draft, registration:"2026-02-30" }, today).some((error) => error.includes("datas"))); // Data impossível não é normalizada silenciosamente.
  assert.ok(enrollmentErrors({ ...draft, registration:"2026-10-24" }, today).length > 0); // Não aceita inscrição posterior à matrícula.
});
