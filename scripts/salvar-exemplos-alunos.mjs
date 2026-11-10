// Inclui somente os oito exemplos que o usuário pediu para manter na lista de testes.
import { createRequire } from "node:module";
// Dependências e ambiente pertencem ao projeto local existente.
const require = createRequire(new URL("../package.json", import.meta.url));
// Credenciais permanecem somente na memória e nunca entram no relatório do teste.
require("@next/env").loadEnvConfig(process.cwd());
// Não permite executar a inclusão fora do ambiente explicitamente marcado como teste.
if (process.env.TBF_CADASTROS_TESTE !== "1") throw new Error("Exemplos só podem ser salvos em modo de teste.");
// Reutiliza exatamente nomes, planos, faixas e situações já apresentados na demonstração.
const { createDemo } = await import("../lib/demonstracao/demo.ts");
// A data civil brasileira mantém a mesma referência da interface.
const { todayInBrazil } = await import("../lib/demonstracao/billing.ts");
// Validação de servidor não é contornada pelo script de exemplos.
const { normalizeEnrollment } = await import("../lib/alunos/cadastro.ts");
// Usa o mesmo adaptador transacional do formulário de cadastro.
const { registrarAluno } = await import("../lib/alunos/persistencia.ts");
// Pool só serve a consultas de prévia, conferência e aos exemplos solicitados.
const { default: pool } = await import("../lib/mysql.ts");
// Gera números matemáticos sintéticos sem copiar identificadores de uma pessoa ou do anexo.
function cpfSintetico(indice) {
  // Base fixa por exemplo torna a inclusão repetível, sem criar cópias em uma segunda execução.
  let cpf = String(indice + 1).padStart(9, "0");
  // Ambos os verificadores são gerados em memória, sem registrar o número em código ou logs.
  for (const tamanho of [9, 10]) {
    // Pesos matemáticos completam exclusivamente os exemplos fictícios.
    const resto = ([...cpf].reduce((total, digito, posicao) => total + Number(digito) * (tamanho + 1 - posicao), 0) * 10) % 11;
    // Preserva zeros iniciais sem converter o identificador inteiro em número.
    cpf += String(resto === 10 ? 0 : resto);
  }
  // O valor existe apenas no pedido fictício necessário ao cadastro e no banco privado de testes.
  return cpf;
}
// Somente contagens e marcadores técnicos são exibidos depois da operação.
let inseridos = 0, preservados = 0;
// Falhas recebem mensagem genérica, evitando imprimir SQL parametrizado ou identificadores.
try {
  // A inclusão foi solicitada ao administrador principal; exige uma única conta principal ativa.
  const [autores] = await pool.execute("SELECT id, perfil FROM professores WHERE perfil = 'admin_principal' AND ativo = 1 ORDER BY id LIMIT 2");
  // Não escolhe arbitrariamente entre várias contas principais.
  if (autores.length !== 1) throw new Error("Confira a autoria administrativa antes de salvar os exemplos.");
  // Um professor ativo real fornece o vínculo técnico apenas destes exemplos fictícios.
  const [professores] = await pool.execute("SELECT id FROM professores WHERE perfil = 'professor' AND ativo = 1 ORDER BY id LIMIT 1");
  // Nenhum professor inventado é inserido na tabela de contas.
  if (!professores[0]) throw new Error("Cadastre um professor ativo antes dos exemplos.");
  // A origem é exclusivamente o catálogo de exemplos, sem Excel ou dados de pessoas.
  const hoje = todayInBrazil(), alunos = createDemo(hoje).students;
  // A prévia confere todos os identificadores antes de iniciar a primeira inclusão.
  for (const [indice, aluno] of alunos.entries()) {
    // Compara somente o identificador sintético e o nome de exemplo previsto.
    const [existentes] = await pool.execute("SELECT nome FROM tbf_alunos WHERE cpf = ? LIMIT 1", [cpfSintetico(indice)]);
    // Um conflito não modifica, une ou apaga o registro encontrado.
    if (existentes[0] && existentes[0].nome !== aluno.name) throw new Error("Há conflito com um identificador de teste; nenhuma mesclagem foi executada.");
  }
  // Cada matrícula completa é confirmada indivisivelmente pelo mesmo serviço da interface.
  for (const [indice, aluno] of alunos.entries()) {
    // Consulta apenas existência para tornar a repetição idempotente sem atualizar cadastros.
    const [existentes] = await pool.execute("SELECT id FROM tbf_alunos WHERE cpf = ? LIMIT 1", [cpfSintetico(indice)]);
    // O exemplo já presente é preservado integralmente, inclusive eventuais anexos.
    if (existentes.length) { preservados += 1; continue; }
    // Campos adicionais são marcadores explicitamente fictícios, sem preencher uma pessoa real por suposição.
    const contato = "00" + String(indice + 1).padStart(9, "0");
    // A validação completa conserva os planos e faixas exibidos anteriormente.
    const dados = normalizeEnrollment({ name: aluno.name, cpf: cpfSintetico(indice), birth: "2000-01-01", phone: contato, email: "", address: "Endereço fictício do exemplo de demonstração", registration: hoje, enrolled: hoje, teacher: "Vínculo de professor para exemplo fictício", teacherId: String(professores[0].id), emergency: "Contato de emergência fictício", emergencyPhone: contato, plan: String(aluno.weeklyClasses), status: aluno.active ? "ativo" : "inativo", grade: aluno.grade, trained: "nao", condition: "nao", medication: "nao", injury: "nao" }, hoje);
    // O adaptador repete autorização e professor dentro da transação que cria todos os grupos.
    await registrarAluno(dados, autores[0]);
    // A contagem só avança depois do commit da matrícula inteira.
    inseridos += 1;
  }
  // Confere a lista persistida sem imprimir seus campos pessoais sintéticos.
  const [totais] = await pool.query("SELECT COUNT(*) AS total, SUM(situacao = 'ativo') AS ativos, SUM(situacao = 'inativo') AS inativos FROM tbf_matriculas");
  // O relatório público confirma apenas as quantidades, sem CPF, contato, saúde ou credenciais.
  console.log(JSON.stringify({ exemplosInseridos: inseridos, exemplosPreservados: preservados, matriculasNoBanco: Number(totais[0].total), ativos: Number(totais[0].ativos), inativos: Number(totais[0].inativos) }));
} catch {
  // Não revela valores de consultas ou detalhes privados do driver em uma falha.
  console.log("A inclusão dos exemplos não concluiu. Conferir registros antes de repetir; nenhum cadastro existente foi alterado.");
  // O estado parcial, se houver, é preservado e será reconhecido sem duplicação na conferência.
  process.exitCode = 1;
} finally {
  // Encerra somente as conexões deste script, sem tocar no servidor do site.
  await pool.end();
}
