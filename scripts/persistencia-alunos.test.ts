// Os adaptadores usam uma conexão inteiramente fictícia, sem tocar no MySQL configurado.
import test from "node:test";
// Asserções conferem limites transacionais e proteção dos campos enviados.
import assert from "node:assert/strict";
// O tipo descreve o contrato do driver; não abre uma conexão.
import type { Pool, PoolConnection } from "mysql2/promise";
// O contrato não inclui senhas ou uma escolha livre de preço.
import type { CadastroNormalizado } from "../lib/alunos/cadastro";
// Inicialização do módulo pode montar o pool, porém este endereço impossível nunca é utilizado.
process.env.DATABASE_URL ??= "mysql://ficticio:ficticio@127.0.0.1:1/banco_ficticio";
// Somente marcadores sintéticos representam campos nos testes do adaptador.
const dados: CadastroNormalizado = { basic: { name: "Aluno Fictício", cpf: "0".repeat(11), birth: "2000-01-01", phone: "0".repeat(10), email: "", address: "Endereço fictício", registration: "2026-10-24", enrolled: "2026-10-24", trained: "nao", plan: "2", grade: "branca", status: "ativo", teacherId: "2", emergency: "Contato fictício", emergencyPhone: "0".repeat(11) }, guardian: null, safety: { condition: "nao", medication: "nao", injury: "nao" } };
// O adaptador recebe dados já validados; validação matemática de CPF pertence ao teste de serviço.
function conexaoFicticia(opcoes: { professorAtivo?: boolean; falharSeguranca?: boolean; autorAtivo?: boolean } = {}) {
  // Somente contadores e comandos sintéticos são mantidos pelo teste.
  const estado = { inicio: 0, commit: 0, rollback: 0, liberada: 0, sql: [] as string[], parametros: [] as unknown[][] };
  // Implementa a superfície mínima do driver consumida pelo adaptador real.
  const conexao = {
    // Consulta de configuração não retorna dados nem abre serviço externo.
    query: async () => [[], []],
    // Registra o início da transação fictícia.
    beginTransaction: async () => { estado.inicio += 1; },
    // Conta confirmação somente quando todos os grupos foram inseridos.
    commit: async () => { estado.commit += 1; },
    // Uma recusa precisa reverter a operação inteira.
    rollback: async () => { estado.rollback += 1; },
    // A conexão deve ser liberada em sucesso e em falha.
    release: () => { estado.liberada += 1; },
    // Interpreta apenas as consultas previstas neste teste sintético.
    execute: async (sql: string, parametros: unknown[] = []) => {
      // Guarda a forma dos comandos sem ler registros ou credenciais reais.
      estado.sql.push(sql); estado.parametros.push(parametros);
      // A seleção bloqueada simula a conta autora e o professor da matrícula.
      if (sql.startsWith("SELECT id, perfil")) return [[{ id: 1, perfil: "professor", ativo: opcoes.autorAtivo === false ? 0 : 1 }, { id: 2, perfil: "professor", ativo: opcoes.professorAtivo === false ? 0 : 1 }], []];
      // Uma falha tardia precisa reverter também aluno, matrícula e emergência.
      if (opcoes.falharSeguranca && sql.includes("INSERT INTO tbf_seguranca")) throw new Error("FALHA_FICTICIA");
      // A resposta de escrita possui apenas o número sintético de linhas afetadas.
      return [{ affectedRows: 1 }, []];
    },
  };
  // A conversão fica restrita ao dublê; produção sempre recebe o pool verdadeiro.
  const executor = { getConnection: async () => conexao as unknown as PoolConnection } as Pick<Pool, "getConnection">;
  // Cada teste obtém contadores e conexão próprios.
  return { estado, executor };
}
// Cadastro autorizado usa preço do servidor e converte ausência de e-mail para NULL.
test("persistência cadastra todos os grupos numa transação sem incluir saúde no aluno", async () => {
  // Importação ocorre depois de configurar o endereço fictício que nunca é acessado.
  const { registrarAluno } = await import("../lib/alunos/persistencia");
  // As consultas do adaptador serão recebidas somente pelo dublê explícito.
  const { estado, executor } = conexaoFicticia();
  // O autor fictício é conferido dentro da transação.
  const resultado = await registrarAluno(dados, { id: 1, perfil: "professor" }, executor);
  // O identificador é aleatório e não deriva de CPF ou nome.
  assert.match(resultado.id, /^[a-f0-9-]{36}$/);
  // Todos os grupos foram confirmados juntos e a conexão foi devolvida.
  assert.deepEqual([estado.inicio, estado.commit, estado.rollback, estado.liberada], [1, 1, 0, 1]);
  // Localiza a inserção básica para conferir a separação dos dados.
  const indiceAluno = estado.sql.findIndex((sql) => sql.startsWith("INSERT INTO tbf_alunos"));
  // E-mail opcional não vira um endereço inventado.
  assert.equal(estado.parametros[indiceAluno][5], null);
  // A lista de colunas do cadastro básico não contém respostas de saúde.
  assert.ok(!estado.sql[indiceAluno].includes("condicao"));
  // O preço histórico vem do catálogo fixo de centavos.
  const indiceMatricula = estado.sql.findIndex((sql) => sql.startsWith("INSERT INTO tbf_matriculas"));
  // O plano de duas aulas usa o preço aprovado.
  assert.equal(estado.parametros[indiceMatricula][5], 7000);
  // Adulto sem representação necessária não recebe responsável inventado.
  assert.ok(!estado.sql.some((sql) => sql.startsWith("INSERT INTO tbf_responsaveis")));
});
// Autor ou professor revogado não pode produzir inserções parciais.
test("persistência revalida autor e professor antes da primeira inserção", async () => {
  // Módulo é reutilizado, porém a conexão recebida em cada caso é isolada.
  const { registrarAluno } = await import("../lib/alunos/persistencia");
  // Exercita separadamente as duas revogações.
  for (const opcoes of [{ professorAtivo: false }, { autorAtivo: false }]) {
    // O dublê devolve a conta revogada no instante da transação.
    const { estado, executor } = conexaoFicticia(opcoes);
    // A operação deve terminar em falha antes de alterar qualquer tabela.
    await assert.rejects(registrarAluno(dados, { id: 1, perfil: "professor" }, executor));
    // Recusa não chega à primeira instrução de cadastro.
    assert.ok(!estado.sql.some((sql) => sql.startsWith("INSERT")));
    // Rollback e liberação acontecem mesmo sem uma inserção inicial.
    assert.deepEqual([estado.commit, estado.rollback, estado.liberada], [0, 1, 1]);
  }
});
// Uma falha no último grupo não confirma os grupos anteriores.
test("persistência reverte matrícula inteira em falha tardia e preserva responsável condicional", async () => {
  // O adaptador real é chamado com uma conexão simulada que falhará no grupo de saúde.
  const { registrarAluno } = await import("../lib/alunos/persistencia");
  // Um responsável fictício é incluído explicitamente neste cenário.
  const comResponsavel = { ...dados, guardian: { name: "Responsável Fictício", relation: "Vínculo fictício", documentType: "outro", document: "IDENTIFICADOR-DE-TESTE", phone: "0".repeat(10) } };
  // O banco fictício permite as primeiras inserções e falha na última.
  const { estado, executor } = conexaoFicticia({ falharSeguranca: true });
  // O adaptador não deve absorver a falha como sucesso.
  await assert.rejects(registrarAluno(comResponsavel, { id: 1, perfil: "professor" }, executor));
  // O vínculo foi encaminhado somente porque existia no contrato validado.
  assert.ok(estado.sql.some((sql) => sql.startsWith("INSERT INTO tbf_responsaveis")));
  // Nenhuma confirmação foi realizada, e todos os grupos foram revertidos juntos.
  assert.deepEqual([estado.commit, estado.rollback, estado.liberada], [0, 1, 1]);
});
