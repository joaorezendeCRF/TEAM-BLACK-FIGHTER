// Executa regras e transações reais com um driver inteiramente fictício, sem conexão de rede.
import test from "node:test";
// Asserções verificam preservação de histórico, autorização e preços em cenários de falha.
import assert from "node:assert/strict";
// Tipagem permite substituir somente a superfície de conexão exigida pelo adaptador.
import type { Pool, PoolConnection } from "mysql2/promise";
// Catálogo não contém dados pessoais nem preços informados pelo navegador.
import { obterPlano } from "../lib/planos";
// A configuração fictícia é definida antes de importar módulos que inicializam o pool.
process.env.DATABASE_URL = "mysql://ficticio:ficticio@127.0.0.1:1/banco_ficticio";
// Esta suíte trabalha exclusivamente com registros sintéticos de homologação.
process.env.TBF_CADASTROS_TESTE = "1";
// Identificadores de fixture não correspondem a alunos do banco configurado.
const matricula = "20000000-0000-4000-8000-000000000001";
// Calcula um identificador matemático sintético; ele nunca é copiado de arquivo ou pessoa real.
function cpfSintetico() {
  // Base artificial é gerada em memória apenas para validar o serviço.
  let texto = Array.from({ length: 9 }, (_, indice) => String(indice)).join("");
  // Cada verificador depende do tamanho atual e dos pesos decrescentes.
  for (const tamanho of [9, 10]) {
    // O cálculo evita usar um CPF real ou um exemplo fixo publicado.
    const resto = ([...texto].reduce((soma, digito, indice) => soma + Number(digito) * (tamanho + 1 - indice), 0) * 10) % 11;
    // Conclui o dígito apenas desta fixture.
    texto += String(resto === 10 ? 0 : resto);
  }
  // Identificador sintético não é impresso ou persistido.
  return texto;
}
// Dublê mantém só dados artificiais e permite provocar falhas depois de algumas escritas.
function banco(opcoes: { pronta?: boolean; ativo?: boolean; falha?: string; valor?: number; versao?: number; responsavel?: boolean } = {}) {
  // Versão inicial possibilita testar formulários obsoletos sem modificar registros reais.
  const estado = {
    // Aluno adulto dispensa representante nos testes que não o pedem explicitamente.
    aluno: { id: "10000000-0000-4000-8000-000000000001", nome: "Aluno Fictício", cpf: cpfSintetico(), nascimento: "2000-01-01", telefone: "00" + "123456789", email: null, endereco: "Endereço fictício", inscricao: "2026-10-01", treinou_antes: 0, experiencia: null, ambiente_teste: 1, versao_ficha: opcoes.versao ?? 1 },
    // Preço diferente do catálogo exercita a conservação de contratos sem troca de plano.
    mat: { id: matricula, aluno_id: "10000000-0000-4000-8000-000000000001", professor_id: 2, matricula: "2026-10-01", aulas_semana: 2, modalidade: "normal", mensalidade_centavos: opcoes.valor ?? 7000, faixa: "branca", situacao: "ativo", necessita_responsavel: opcoes.responsavel ? 1 : 0 },
    // Emergência e saúde ficam em grupos separados, como no adaptador de produção.
    emergencia: { nome_vinculo: "Contato fictício", telefone: "00" + "987654321" },
    // Ausência inicial de condição não é inferida de um texto vazio.
    seguranca: { tem_condicao: 0, condicao_detalhes: null, usa_medicamento: 0, medicamento_detalhes: null, tem_lesao: 0, lesao_detalhes: null },
    // Representante sintético permite verificar a preservação ao dispensar o vínculo vigente.
    responsavel: { nome: "Responsável fictício", vinculo: "Vínculo fictício", documento_tipo: "outro", documento: "DOCUMENTO-FICTICIO", telefone: "00" + "123456789" },
    // Somente parâmetros sintéticos são mantidos em memória para as asserções.
    escritas: [] as { sql: string; valores: unknown[] }[],
    // Contadores permitem comprovar rollback e liberação em cada caminho.
    commits: 0, rollbacks: 0, liberacoes: 0,
  };
  // Interpretação é fechada: consulta desconhecida falha sem acessar MySQL.
  const execute = async (sql: string, valores: unknown[] = []) => {
    // Conferência de estrutura retorna somente a disponibilidade simulada.
    if (sql.startsWith("SELECT (")) return [[{ pronta: opcoes.pronta === false ? 0 : 1 }], []];
    // Sessão e troca de professor são revalidadas em contas fictícias.
    if (sql.startsWith("SELECT id, perfil")) return [[{ id: 1, perfil: "professor", ativo: opcoes.ativo === false ? 0 : 1 }, { id: 2, perfil: "professor", ativo: 1 }], []];
    // Vínculo retorna apenas a matrícula artificial selecionada.
    if (sql.startsWith("SELECT aluno_id")) return [valores[0] === matricula ? [{ aluno_id: estado.aluno.id }] : [], []];
    // Retorna cópia para simular o isolamento dos dados recebidos pelo driver.
    if (sql.includes("FROM tbf_alunos WHERE")) return [[{ ...estado.aluno }], []];
    // Matrícula fictícia contém frequência, modalidade e preço independentes.
    if (sql.includes("FROM tbf_matriculas WHERE")) return [[{ ...estado.mat }], []];
    // Emergência é consultada somente dentro da leitura selecionada.
    if (sql.includes("FROM tbf_emergencias")) return [[{ ...estado.emergencia }], []];
    // Responsável existe na origem mesmo quando deixa de ser necessário na revisão.
    if (sql.includes("FROM tbf_responsaveis")) return [[{ ...estado.responsavel }], []];
    // Dados de segurança são somente os marcadores desta suíte.
    if (sql.includes("FROM tbf_seguranca")) return [[{ ...estado.seguranca }], []];
    // O nome de apresentação vem do banco fictício e não do pedido adulterado.
    if (sql.startsWith("SELECT nome FROM professores")) return [[{ nome: "Professor fictício" }], []];
    // Uma falha tardia permite testar a reversão de todos os grupos e da revisão anterior.
    if (opcoes.falha && sql.startsWith(opcoes.falha)) throw new Error("FALHA_FICTICIA");
    // Só instruções de escrita previstas são aceitas, sem fallback para serviços externos.
    if (/^(INSERT|UPDATE)/.test(sql)) { estado.escritas.push({ sql, valores }); return [{ affectedRows: 1 }, []]; }
    // Protege a própria suíte contra novas consultas não simuladas.
    throw new Error("Consulta não simulada.");
  };
  // Snapshot de contador permite descartar as escritas de uma transação revertida.
  let anteriores = 0;
  // Apenas esta interface falsa é recebida pelo adaptador real.
  const conexao = { execute, query: async () => [[], []], beginTransaction: async () => { anteriores = estado.escritas.length; }, commit: async () => { estado.commits += 1; }, rollback: async () => { estado.rollbacks += 1; estado.escritas.length = anteriores; }, release: () => { estado.liberacoes += 1; } } as unknown as PoolConnection;
  // O cast fica restrito ao dublê; a aplicação continua tipada pelo driver oficial.
  const executor = { execute, getConnection: async () => conexao } as unknown as Pick<Pool, "execute" | "getConnection">;
  // Permite conferir o comportamento sem imprimir parâmetros sensíveis.
  return { estado, executor };
}
// O mesmo professor pode consultar e editar qualquer aluno, conforme decisão do usuário.
const autor = { id: 1, perfil: "professor" };
// Leitura usa dados da matrícula, registra acesso e não confunde anexos com ficha cadastral.
test("leitura restrita retorna ficha completa somente após autorização e auditoria", async () => {
  // Importação acontece após definir a URL fictícia impossível.
  const { carregarFicha } = await import("../lib/alunos/edicao");
  // Cada teste possui conexão e estado próprios.
  const { estado, executor } = banco();
  // Obtém apenas a matrícula artificial escolhida.
  const ficha = await carregarFicha(matricula, autor, executor);
  // Plano e versão provêm da origem, sem atribuir personal pelo preço.
  assert.deepEqual([ficha.dados.plan, ficha.versao, ficha.dados.medication], ["2", 1, "nao"]);
  // O ato é auditado sem copiar o conteúdo restrito na linha de auditoria.
  assert.ok(estado.escritas.some((item) => item.sql.includes("auditoria") && item.valores.includes("consultar_edicao")));
  // Conclui leitura e libera os recursos.
  assert.deepEqual([estado.commits, estado.liberacoes], [1, 1]);
});
// Uma troca entre normal e personal de mesma frequência precisa alterar o preço corretamente.
for (const [id, preco, aulas] of [["personal-2", 24000, 2], ["personal-3", 36000, 3], ["personal-5", 60000, 5]] as const) {
  // Cada opção é exercitada em uma edição completa, incluindo transação e histórico.
  test("troca para " + id + " calcula valor no servidor e preserva o anterior", async () => {
    // Adaptador e leitor reais operam somente sobre fixtures.
    const { carregarFicha, atualizarFicha } = await import("../lib/alunos/edicao");
    // Banco começa com a matrícula normal de duas aulas.
    const { estado, executor } = banco();
    // A versão deve ser a mesma recuperada na leitura.
    const ficha = await carregarFicha(matricula, autor, executor);
    // Novo plano muda também faixa e situação, verificando que os campos continuam independentes.
    await atualizarFicha(matricula, ficha.versao, { ...ficha.dados, plan: id, grade: "roxa", status: "inativo", injury: "sim", injuryDetails: "Restrição fictícia" }, autor, executor);
    // A atualização da matrícula não contém nenhum valor monetário vindo do cliente.
    const alteracao = estado.escritas.find((item) => item.sql.startsWith("UPDATE tbf_matriculas"))!;
    // Frequência, modalidade e valor precisam concordar com o catálogo aprovado.
    assert.deepEqual(alteracao.valores.slice(2, 7), [aulas, "personal", preco, "roxa", "inativo"]);
    // Ficha anterior fica preservada antes da atualização, inclusive seu valor normal.
    const historico = estado.escritas.find((item) => item.sql.includes("INSERT INTO tbf_fichas_revisoes"))!;
    // Confere só campos sintéticos necessários à preservação, sem imprimir o JSON.
    assert.deepEqual([JSON.parse(String(historico.valores[4])).dados.plan, JSON.parse(String(historico.valores[4])).centavos], ["2", 7000]);
    // Nenhuma instrução toca em documentos, cobranças ou recebimentos.
    assert.ok(!estado.escritas.some((item) => /documentos|recebimentos|cobrancas|DELETE/i.test(item.sql)));
  });
}
// Alterar apenas contato não deve reajustar um preço contratado diferente do catálogo atual.
test("edição de contato conserva preço contratado quando não troca o plano", async () => {
  // Usa o mesmo adaptador da aplicação com uma condição contratual artificial.
  const { carregarFicha, atualizarFicha } = await import("../lib/alunos/edicao");
  // A fixture simula um valor histórico; não cria esse preço no banco real.
  const { estado, executor } = banco({ valor: 6500 });
  // O preço apresentado na edição vem da matrícula.
  const ficha = await carregarFicha(matricula, autor, executor);
  // Troca apenas um contato sintético e preserva o plano original.
  await atualizarFicha(matricula, ficha.versao, { ...ficha.dados, phone: "00" + "987654321" }, autor, executor);
  // A gravação da matrícula mantém o preço existente.
  assert.equal(estado.escritas.find((item) => item.sql.startsWith("UPDATE tbf_matriculas"))!.valores[4], 6500);
});
// Concorrência precisa impedir uma confirmação com dados que já ficaram obsoletos.
test("versão antiga não escreve histórico nem sobrescreve cadastro", async () => {
  // Banco informa que outro professor já salvou a versão dois.
  const { atualizarFicha } = await import("../lib/alunos/edicao");
  // Conexão exclusiva é simulada, sem rede ou credenciais reais.
  const { estado, executor } = banco({ versao: 2 });
  // Um formulário antigo deve ser recusado antes da validação de conteúdo ou primeira escrita.
  await assert.rejects(atualizarFicha(matricula, 1, { teacherId: "2" }, autor, executor), /alterada por outro/);
  // Não fica uma revisão órfã nem atualização parcial.
  assert.deepEqual([estado.escritas.length, estado.rollbacks, estado.liberacoes], [0, 1, 1]);
});
// Revogação e estrutura pendente são bloqueios distintos e ambos precedem a divulgação da ficha.
test("conta revogada e migração pendente não divulgam ficha nem permitem edição", async () => {
  // Leitor real precisa cumprir as mesmas proteções da escrita.
  const { carregarFicha } = await import("../lib/alunos/edicao");
  // Cada cenário recebe um banco fictício independente.
  for (const opcoes of [{ ativo: false }, { pronta: false }]) {
    // Nunca usa a configuração do site normal.
    const { estado, executor } = banco(opcoes);
    // A falha ocorre antes de retornar campos ou escrever auditoria de sucesso.
    await assert.rejects(carregarFicha(matricula, autor, executor));
    // Nenhuma escrita parcial deve permanecer.
    assert.equal(estado.escritas.length, 0);
  }
});
// Uma falha na última tabela deve reverter também a revisão e todos os contatos.
test("falha tardia reverte histórico e todos os grupos da edição", async () => {
  // O teste provoca falha exclusivamente na memória do dublê.
  const { carregarFicha, atualizarFicha } = await import("../lib/alunos/edicao");
  // Leitura funciona, mas a atualização de segurança falhará depois dos demais grupos.
  const { estado, executor } = banco({ falha: "UPDATE tbf_seguranca" });
  // Captura a versão atual e os campos válidos.
  const ficha = await carregarFicha(matricula, autor, executor);
  // Preserva o contador de acesso anterior para comparar a reversão.
  const antes = estado.escritas.length;
  // Uma falha de escrita não pode ser anunciada como sucesso.
  await assert.rejects(atualizarFicha(matricula, 1, { ...ficha.dados, plan: "personal-3" }, autor, executor));
  // Somente a auditoria da leitura permanece; a edição inteira foi desfeita.
  assert.deepEqual([estado.escritas.length, estado.rollbacks, estado.commits], [antes, 1, 1]);
});
// Dispensa de responsável não pode remover silenciosamente informações já registradas.
test("dispensar representante preserva ficha anterior sem DELETE", async () => {
  // A ficha sintética de adulto começa com representação explicitamente marcada.
  const { carregarFicha, atualizarFicha } = await import("../lib/alunos/edicao");
  // Os dados usados são apenas marcadores fictícios.
  const { estado, executor } = banco({ responsavel: true });
  // Leitura auditada recupera o responsável atual.
  const ficha = await carregarFicha(matricula, autor, executor);
  // O adulto dispensa a necessidade, sem apagar a versão anterior.
  await atualizarFicha(matricula, 1, { ...ficha.dados, guardianNeeded: "nao" }, autor, executor);
  // Revisão conserva os dados que estavam vigentes antes da dispensa.
  const historico = estado.escritas.find((item) => item.sql.includes("INSERT INTO tbf_fichas_revisoes"))!;
  // Só a necessidade vigente é desmarcada na matrícula.
  assert.equal(JSON.parse(String(historico.valores[4])).dados.guardianNeeded, "sim");
  // Não executa exclusão nem sobrescrita por campos vazios do representante.
  assert.ok(!estado.escritas.some((item) => /DELETE|UPDATE tbf_responsaveis|INSERT INTO tbf_responsaveis/.test(item.sql)));
});
// Servidor não aceita adicionar um preço livre ao contrato de edição.
test("preço adulterado e medicamento sem detalhes são recusados antes das escritas", async () => {
  // Regras são as mesmas chamadas pela interface.
  const { carregarFicha, atualizarFicha } = await import("../lib/alunos/edicao");
  // Cada falha trabalha sobre uma cópia independente da fixture.
  for (const campos of [{ preco: "1" }, { medication: "sim", medicationDetails: "" }]) {
    // Banco inexistente de rede nunca participa do teste.
    const { estado, executor } = banco();
    // Recupera um formulário válido para isolar apenas a adulteração testada.
    const ficha = await carregarFicha(matricula, autor, executor);
    // Guarda somente a contagem de escritas sintéticas anteriores.
    const antes = estado.escritas.length;
    // Entrada inválida não pode virar uma ficha parcialmente atualizada.
    await assert.rejects(atualizarFicha(matricula, 1, { ...ficha.dados, ...campos }, autor, executor));
    // Histórico e grupos atuais continuam intactos.
    assert.equal(estado.escritas.length, antes);
  }
  // Catálogo fechado recusa identificadores arbitrários.
  assert.throws(() => obterPlano("personal-4"));
});
