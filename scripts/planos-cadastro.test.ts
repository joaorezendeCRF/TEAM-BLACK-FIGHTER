// Exercita a gravação dos seis planos com driver falso, sem cadastrar alunos no MySQL atual.
import test from "node:test";
// Asserções conferem o vínculo entre modalidade, frequência e valor realmente enviados à persistência.
import assert from "node:assert/strict";
// Somente a superfície de conexão usada no cadastro precisa ser simulada.
import type { Pool, PoolConnection } from "mysql2/promise";
// Dados já normalizados não contêm um campo livre de preço.
import type { CadastroNormalizado } from "../lib/alunos/cadastro";
// Define endereço impossível antes de importar o adaptador que monta o pool.
process.env.DATABASE_URL = "mysql://ficticio:ficticio@127.0.0.1:1/banco_ficticio";
// Cria estado mínimo para verificar parâmetros de matrícula e limites de falha.
function executorFicticio(pronta: boolean, falhaMetadados = false) {
  // Nenhum payload de pessoa real é usado ou impresso.
  const estado = { comandos: [] as { sql: string; valores: unknown[] }[], commit: 0, rollback: 0, liberada: 0 };
  // O dublê representa exclusivamente uma conexão de teste.
  const conexao = {
    // Configuração UTC não precisa executar serviço externo.
    query: async () => [[], []],
    // Início não altera dados no banco configurado.
    beginTransaction: async () => {},
    // Confirmação é apenas contada para as asserções.
    commit: async () => { estado.commit += 1; },
    // Reversão remove as escritas sintéticas desta tentativa.
    rollback: async () => { estado.rollback += 1; estado.comandos = []; },
    // Falha de metadados também deve devolver a conexão ao pool.
    release: () => { estado.liberada += 1; },
    // Interpretação fechada não possui fallback para conexão real.
    execute: async (sql: string, valores: unknown[] = []) => {
      // Disponibilidade simula a execução ou a pendência do novo SQL manual.
      if (sql.startsWith("SELECT (")) {
        // Falha explícita exercita liberação de conexão antes de começar a transação.
        if (falhaMetadados) throw new Error("METADADOS_FICTICIOS_INDISPONIVEIS");
        // Retorna somente o indicador de estrutura.
        return [[{ pronta: Number(pronta) }], []];
      }
      // Conta autora e professor são sintéticos e ativos.
      if (sql.startsWith("SELECT id, perfil")) return [[{ id: 1, ativo: 1, perfil: "professor" }, { id: 2, ativo: 1, perfil: "professor" }], []];
      // Guarda parâmetros apenas em memória desta suíte.
      estado.comandos.push({ sql, valores });
      // Todas as escritas fictícias afetam uma linha.
      return [{ affectedRows: 1 }, []];
    },
  } as unknown as PoolConnection;
  // Interface impede chamar métodos de um banco operacional por acidente.
  return { estado, executor: { getConnection: async () => conexao } as Pick<Pool, "getConnection"> };
}
// Contrato usa somente marcadores; a validação de CPF já foi exercitada no serviço de cadastro.
function dados(plan: string): CadastroNormalizado {
  // O adaptador recebe valores previamente validados no servidor.
  return { basic: { name: "Aluno fictício", cpf: "0".repeat(11), birth: "2000-01-01", phone: "0".repeat(10), email: "", address: "Endereço fictício", registration: "2026-10-01", enrolled: "2026-10-01", teacherId: "2", emergency: "Contato fictício", emergencyPhone: "0".repeat(10), plan, status: "ativo", grade: "branca", trained: "nao" }, safety: { condition: "nao", medication: "nao", injury: "nao" }, guardian: null };
}
// Valores esperados são os seis contratos aprovados pelo dono, independentemente da interface.
for (const [id, aulas, centavos, modalidade] of [["2", 2, 7000, "normal"], ["3", 3, 8000, "normal"], ["5", 5, 12000, "normal"], ["personal-2", 2, 24000, "personal"], ["personal-3", 3, 36000, "personal"], ["personal-5", 5, 60000, "personal"]] as const) {
  // Testa a escrita real de cada contrato, em vez de apenas repetir a leitura do catálogo.
  test("cadastro persiste contrato " + id + " com valor controlado no servidor", async () => {
    // URL já foi configurada como fictícia antes desta importação.
    const { registrarAluno } = await import("../lib/alunos/persistencia");
    // A migração aparece disponível somente dentro do dublê.
    const { estado, executor } = executorFicticio(true);
    // Nenhum registro sai da memória do teste.
    await registrarAluno(dados(id), { id: 1, perfil: "professor" }, executor);
    // Seleciona a escrita que efetivamente vincula o plano à matrícula.
    const comando = estado.comandos.find((item) => item.sql.startsWith("INSERT INTO tbf_matriculas"))!;
    // Modalidade fica em coluna própria; não depende apenas do preço para ser identificada depois.
    assert.deepEqual([comando.valores[4], comando.valores[5], comando.valores[10]], [aulas, centavos, modalidade]);
    // Todos os grupos são confirmados e a conexão é devolvida.
    assert.deepEqual([estado.commit, estado.rollback, estado.liberada], [1, 0, 1]);
  });
}
// Compatibilidade mantém o cadastro normal sem permitir personal com esquema incompleto.
test("estrutura pendente conserva planos normais e bloqueia personal sem inserções", async () => {
  // Adaptador é o mesmo usado no site.
  const { registrarAluno } = await import("../lib/alunos/persistencia");
  // Primeiro simula uma instalação ainda sem a nova coluna.
  const normal = executorFicticio(false);
  // Plano normal continua funcionando como antes da alteração.
  await registrarAluno(dados("2"), { id: 1, perfil: "professor" }, normal.executor);
  // A consulta compatível não menciona uma coluna ainda inexistente.
  assert.ok(!normal.estado.comandos.find((item) => item.sql.startsWith("INSERT INTO tbf_matriculas"))!.sql.includes("modalidade"));
  // Uma tentativa de personal deve falhar inteira.
  const personal = executorFicticio(false);
  // O servidor não converte a solicitação em normal silenciosamente.
  await assert.rejects(registrarAluno(dados("personal-2"), { id: 1, perfil: "professor" }, personal.executor));
  // Nem mesmo o registro básico fica parcialmente salvo.
  assert.deepEqual([personal.estado.comandos.length, personal.estado.commit, personal.estado.rollback], [0, 0, 1]);
});
// Falha antes da primeira escrita não pode esgotar o pool por conexão retida.
test("falha ao conferir estrutura também libera a conexão", async () => {
  // Importação usa apenas o pool fictício já configurado.
  const { registrarAluno } = await import("../lib/alunos/persistencia");
  // O dublê falha exclusivamente na consulta de metadados.
  const { estado, executor } = executorFicticio(false, true);
  // A falha é propagada sem confirmação de cadastro.
  await assert.rejects(registrarAluno(dados("2"), { id: 1, perfil: "professor" }, executor));
  // Conexão é devolvida independentemente de a transação ter começado.
  assert.deepEqual([estado.commit, estado.liberada], [0, 1]);
});
