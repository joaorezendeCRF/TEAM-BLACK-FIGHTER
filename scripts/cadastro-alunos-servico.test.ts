// Exercita a preparação do serviço com dependências falsas, sem banco ou arquivos pessoais.
import test from "node:test";
// Asserções verificam bloqueios antes de qualquer tentativa de persistência.
import assert from "node:assert/strict";
// Apenas a camada de servidor é importada; nenhum adaptador SQL foi implementado ou habilitado.
import { canRegisterStudent, normalizeEnrollment, prepareStudentRegistration, validCpf, type CadastroDependencies } from "../lib/alunos/cadastro";
// Gera uma sequência matemática apenas para testes, sem copiar CPF de usuário ou arquivo.
function syntheticCpf(): string {
  let value = Array.from({ length: 9 }, (_, index) => String(index)).join(""); // Base sintética reproduzível, sem origem pessoal.
  for (const length of [9, 10]) {
    const sum = [...value].reduce((total, digit, index) => total + Number(digit) * (length + 1 - index), 0); // Calcula os verificadores da sequência sintética.
    const remainder = (sum * 10) % 11; // Mesmo padrão matemático usado para produzir o dado de teste.
    value += String(remainder === 10 ? 0 : remainder); // Completa apenas o exemplo sintético em memória.
  }
  return value; // Não imprime o identificador ou o grava em arquivos.
}
// Os números de contato são dados sintéticos sem relação com o anexo do usuário.
const input = { name:"Aluno Fictício", cpf:syntheticCpf(), birth:"2000-01-01", phone:Array.from({length:10}, (_, index) => String(index)).join(""), address:"Endereço fictício", registration:"2026-10-23", enrolled:"2026-10-23", teacher:"Professor Fictício", teacherId:"12", emergency:"Contato Fictício", emergencyPhone:Array.from({length:11}, (_, index) => String(index % 10)).join(""), plan:"2", status:"ativo", grade:"branca", trained:"nao", condition:"nao", medication:"nao", injury:"nao" }; // Nenhum CPF ou contato real é usado nos testes.
test("CPF verifica matemática e recusa entradas repetidas, inválidas e longas", () => {
  assert.equal(validCpf(input.cpf), true); // Confere apenas o exemplo calculado em memória.
  assert.equal(validCpf("0".repeat(11)), false); // Máscara completa não significa CPF válido.
  assert.equal(validCpf(input.cpf + "0"), false); // O servidor recusa excesso em vez de truncar.
  assert.equal(validCpf("abc" + input.cpf), false); // Não converte uma entrada adulterada em identificação válida.
});
test("professores podem cadastrar todos os alunos; anônimos e perfis desconhecidos são recusados", () => {
  for (const perfil of ["admin_principal", "administrador", "professor"]) assert.equal(canRegisterStudent({ id:1, perfil }), true); // Decisão de acesso aprovada pelo usuário.
  assert.equal(canRegisterStudent(null), false); // Sessão ausente nunca recebe autorização.
  assert.equal(canRegisterStudent({ id:1, perfil:"visitante" }), false); // Perfil não previsto não herda permissão.
});
test("normalização separa saúde, omite detalhes sem Sim e rejeita dados extras", () => {
  const result = normalizeEnrollment({ ...input, conditionDetails:"Detalhe fictício não aplicável" }, "2026-10-23"); // Dados escondidos de uma pergunta desmarcada não devem persistir.
  assert.equal(result.basic.condition, undefined); // Lista administrativa não recebe saúde.
  assert.equal(result.safety.conditionDetails, undefined); // Não conserva detalhes desnecessários.
  assert.equal(result.guardian, null); // Não inventa responsável para adulto.
  assert.equal(result.basic.email, ""); // Ausência é explícita e será convertida em NULL pelo futuro adaptador.
  assert.throws(() => normalizeEnrollment({ ...input, perfil:"admin_principal" }, "2026-10-23")); // Pedido não define suas permissões.
  assert.throws(() => normalizeEnrollment({ ...input, phone:input.phone + "00" }, "2026-10-23")); // Servidor não aceita contato excessivo.
});
test("gravação desligada e sessão ausente não chegam à persistência", async () => {
  let calls = 0; // Conta operações falsas sem abrir conexão.
  const dependencies: CadastroDependencies = { enabled:false, authenticatedActor:async () => { calls += 1; return null; }, activeTeacher:async () => true, registerAtomically:async () => { calls += 1; return {id:"ficticio"}; } }; // Dublês substituem todos os serviços externos.
  assert.equal((await prepareStudentRegistration(input, "2026-10-23", dependencies)).ok, false); // Etapa permanece desligada por padrão.
  assert.equal(calls, 0); // Não consulta nem grava enquanto desligada.
  assert.equal((await prepareStudentRegistration(input, "2026-10-23", { ...dependencies, enabled:true })).ok, false); // Mesmo ligada, não permite anônimos.
  assert.equal(calls, 1); // Somente a consulta falsa de sessão foi executada.
});
test("conta autorizada e professor ativo são exigidos antes da transação falsa", async () => {
  let writes = 0; // Audita somente quantidade de chamadas no teste, sem copiar o payload.
  const dependencies: CadastroDependencies = { enabled:true, authenticatedActor:async () => ({id:1, perfil:"professor"}), activeTeacher:async () => false, registerAtomically:async () => { writes += 1; return {id:"matricula-ficticia"}; } }; // Não há MySQL ou armazenamento neste cenário.
  assert.equal((await prepareStudentRegistration(input, "2026-10-23", dependencies)).ok, false); // Professor alvo inativo é recusado.
  assert.equal(writes, 0); // Nenhuma tentativa de gravação ocorreu.
  assert.equal((await prepareStudentRegistration(input, "2026-10-23", { ...dependencies, activeTeacher:async () => true })).ok, true); // Exercita o contrato futuro com transação inteiramente falsa.
  assert.equal(writes, 1); // Um cadastro autorizado resulta em uma chamada atômica no dublê.
});
