// Somente fixtures deste módulo são utilizadas; não existe conexão com um servidor MySQL.
const hash = process.env.TBF_HASH_FICTICIO;
// Estado descartável de contas e cadastros; nunca usa dados do ambiente normal.
// Identificação sintética gerada matematicamente em memória, sem copiar dados pessoais.
let cpfFicticio = Array.from({ length: 9 }, (_, indice) => String(indice)).join("");
// Verificadores possibilitam testar a validação real da edição com uma fixture válida.
for (const tamanho of [9, 10]) {
  // Cálculo não consulta serviços ou pessoas.
  const resto = ([...cpfFicticio].reduce((soma, digito, indice) => soma + Number(digito) * (tamanho + 1 - indice), 0) * 10) % 11;
  // Valor fica somente no processo isolado de integração.
  cpfFicticio += String(resto === 10 ? 0 : resto);
}
let estado = {
  // A senha de todas estas contas é gerada pelo executor exclusivamente para testes.
  contas: [
    // Principal fictício testa controles administrativos completos.
    { id: 901, nome: "Principal Demonstração", usuario: "principal-demo", email: null, perfil: "admin_principal", ativo: 1, senha_hash: hash },
    // Administrador comum exercita a matriz limitada de edição.
    { id: 902, nome: "Administrador Demonstração", usuario: "admin-demo", email: null, perfil: "administrador", ativo: 1, senha_hash: hash },
    // Professor ativo pode cadastrar e consultar alunos e anexos de teste.
    { id: 903, nome: "Professor Demonstração", usuario: "professor-demo", email: null, perfil: "professor", ativo: 1, senha_hash: hash },
    // Professor inativo nunca pode autenticar, mesmo com senha correta.
    { id: 904, nome: "Inativo Demonstração", usuario: "inativo-demo", email: null, perfil: "professor", ativo: 0, senha_hash: hash },
  ],
  // Um aluno fictício inicial permite testar o painel de anexos sem uma pessoa real.
  alunos: [{ id: "10000000-0000-4000-8000-000000000001", nome: "Aluno Fictício Inicial", ambiente_teste: 1, cpf: cpfFicticio, nascimento: "2000-01-01", telefone: "00" + "123456789", email: null, endereco: "Endereço fictício", inscricao: "2026-10-01", treinou_antes: 0, experiencia: null, versao_ficha: 1 }],
  // Plano e graduação são apenas marcadores reproduzíveis do teste.
  matriculas: [{ id: "20000000-0000-4000-8000-000000000001", aluno_id: "10000000-0000-4000-8000-000000000001", professor_id: 903, faixa: "branca", situacao: "ativo", aulas: 2, centavos: 7000, modalidade: "normal", matricula: "2026-10-01", necessita_responsavel: 0 }],
  // As versões começam vazias e são preenchidas por requisições multipart reais ao servidor isolado.
  documentos: [],
  // Grupos restritos são exclusivamente marcadores artificiais do teste.
  emergencias: [{ aluno_id: "10000000-0000-4000-8000-000000000001", nome_vinculo: "Contato fictício", telefone: "00" + "987654321" }],
  // Respostas explícitas reproduzem uma ficha completa, sem saúde de pessoas reais.
  segurancas: [{ matricula_id: "20000000-0000-4000-8000-000000000001", tem_condicao: 0, condicao_detalhes: null, usa_medicamento: 0, medicamento_detalhes: null, tem_lesao: 0, lesao_detalhes: null }],
  // Responsáveis e revisões começam vazios e são incluídos apenas pelos testes.
  responsaveis: [], revisoes: [],
};
// Consultas são interpretadas em memória e desconhecidos falham explicitamente.
async function executar(sql, parametros = []) {
  // Comentários e espaços não alteram a identificação das consultas permitidas.
  const consulta = sql.replace(/--[^\r\n]*/g, " ").replace(/\s+/g, " ").trim();
  // Configuração UTC é um no-op no dublê, pois datas de fixture são geradas em UTC.
  if (consulta.startsWith("SET time_zone")) return [[], []];
  // O modo pendente exercita compatibilidade sem criar estruturas em banco real.
  if (consulta.startsWith("SELECT (")) return [[{ pronta: process.env.TBF_ESTRUTURA_FICTICIA === "pendente" ? 0 : 1 }], []];
  // A ficha selecionada usa as mesmas consultas e bloqueios do serviço real.
  if (consulta.startsWith("SELECT aluno_id FROM tbf_matriculas")) return [estado.matriculas.filter((m) => m.id === parametros[0]).map((m) => ({ aluno_id: m.aluno_id })), []];
  // Somente campos artificiais são retornados pela leitura restrita.
  if (consulta.startsWith("SELECT id, nome, cpf")) return [estado.alunos.filter((a) => a.id === parametros[0]).map((a) => ({ ...a })), []];
  // As colunas de frequência e valor usam aliases internos do simulador.
  if (consulta.startsWith("SELECT id, aluno_id, professor_id")) return [estado.matriculas.filter((m) => m.id === parametros[0]).map((m) => ({ ...m, aulas_semana: m.aulas, mensalidade_centavos: m.centavos })), []];
  // Cada grupo pertence a uma única ficha de fixture.
  if (consulta.startsWith("SELECT nome_vinculo, telefone")) return [estado.emergencias.filter((e) => e.aluno_id === parametros[0]).map((e) => ({ ...e })), []];
  // Representação é separada de emergência inclusive no banco fictício.
  if (consulta.startsWith("SELECT nome, vinculo, documento_tipo")) return [estado.responsaveis.filter((g) => g.matricula_id === parametros[0]).map((g) => ({ ...g })), []];
  // Segurança nunca aparece no SELECT da lista de alunos.
  if (consulta.startsWith("SELECT tem_condicao")) return [estado.segurancas.filter((s) => s.matricula_id === parametros[0]).map((s) => ({ ...s })), []];
  // Diagnóstico pode ser aberto no teste sem escrever eventos reais.
  if (consulta.startsWith("SELECT referencia, nivel")) return [[], []];
  // A montagem de lista reproduz apenas os campos públicos autorizados pela consulta real.
  if (consulta.startsWith("SELECT a.id, a.nome")) return [estado.matriculas.map((m) => {
    // Encontra exclusivamente o aluno e o professor sintéticos correspondentes.
    const aluno = estado.alunos.find((a) => a.id === m.aluno_id), professor = estado.contas.find((p) => p.id === m.professor_id);
    // Não há CPF, telefone ou saúde nesta resposta fictícia de listagem.
    return { ...aluno, matriculaId: m.id, faixa: m.faixa, situacao: m.situacao, aulas: m.aulas, centavos: m.centavos, professor: professor.nome, modalidade: m.modalidade ?? "normal", documentos: estado.documentos.filter((d) => d.matricula_id === m.id && d.estado === "disponivel").length };
  }), []];
  // A consulta de vínculo deve localizar uma matrícula fictícia existente.
  if (consulta.startsWith("SELECT m.id FROM tbf_matriculas")) return [estado.matriculas.filter((m) => m.id === parametros[0]).map((m) => ({ id: m.id })), []];
  // Mantém limite de versões e contador compatíveis com o serviço de anexos.
  if (consulta.startsWith("SELECT COUNT(*) AS total FROM tbf_documentos_versoes")) return [[{ total: estado.documentos.filter((d) => d.matricula_id === parametros[0]).length }], []];
  // A reserva escolhe a versão anterior do mesmo tipo de documento.
  if (consulta.startsWith("SELECT documento_id, versao FROM tbf_documentos_versoes")) return [estado.documentos.filter((d) => d.matricula_id === parametros[0] && d.tipo === parametros[1]).sort((a, b) => b.versao - a.versao).slice(0, 1), []];
  // Lista metadados públicos sem expor caminho ou conteúdo.
  if (consulta.startsWith("SELECT id, versao, tipo, mime")) return [estado.documentos.filter((d) => d.matricula_id === parametros[0]).sort((a, b) => b.versao - a.versao).map((d) => ({ id: d.id, versao: d.versao, tipo: d.tipo, mime: d.mime, tamanho_bytes: d.tamanho_bytes, criado: d.criado, estado: d.estado })), []];
  // Download consulta apenas documentos que a etapa anterior publicou.
  if (consulta.startsWith("SELECT d.objeto_privado")) return [estado.documentos.filter((d) => d.id === parametros[0] && d.estado === "disponivel"), []];
  // Consultas de autenticação e reconfirmação só podem ler contas das fixtures.
  if (consulta.startsWith("SELECT ") && /FROM professores/.test(consulta)) {
    // Começa com cópia da lista para não reordenar a origem.
    let contas = [...estado.contas];
    // Filtros individuais reproduzem login e identificação por sessão.
    if (/WHERE usuario\s*=\s*\?/.test(consulta)) contas = contas.filter((c) => c.usuario === parametros[0]);
    // O bloqueio de edição seleciona autor e alvo, sem permitir acessar contas externas.
    else if (/WHERE id IN/.test(consulta)) contas = contas.filter((c) => parametros.includes(c.id));
    // Seleção simples atende a revalidação da sessão e da credencial.
    else if (/WHERE id\s*=\s*\?/.test(consulta)) contas = contas.filter((c) => c.id === parametros[0]);
    // O seletor de professor e a credencial exigem situação ativa.
    if (/ativo = 1/.test(consulta)) contas = contas.filter((c) => c.ativo === 1);
    // Reproduz o filtro de professores ativos do cadastro.
    if (/perfil = 'professor'/.test(consulta)) contas = contas.filter((c) => c.perfil === "professor");
    // Sempre devolve cópias, sem oferecer referência mutável direta ao catálogo.
    return [contas.map((c) => ({ ...c })), []];
  }
  // Criação de aluno utiliza somente o pedido fictício validado pelo servidor real.
  if (consulta.startsWith("INSERT INTO tbf_alunos ")) { estado.alunos.push({ id: parametros[0], nome: parametros[1], ambiente_teste: 1, cpf: parametros[2], nascimento: parametros[3], telefone: parametros[4], email: parametros[5], endereco: parametros[6], inscricao: parametros[7], treinou_antes: Number(parametros[8]), experiencia: parametros[9], versao_ficha: 1 }); return [{ affectedRows: 1 }, []]; }
  // Matrícula preserva o mapeamento de professor, faixa, plano e situação do pedido de teste.
  if (consulta.startsWith("INSERT INTO tbf_matriculas ")) { estado.matriculas.push({ id: parametros[0], aluno_id: parametros[1], professor_id: parametros[2], aulas: parametros[4], centavos: parametros[5], faixa: parametros[6], situacao: parametros[7], matricula: parametros[3], necessita_responsavel: Number(parametros[8]), modalidade: parametros[10] ?? "normal" }); return [{ affectedRows: 1 }, []]; }
  // Registra a reserva com chave privada e hash apenas em memória do processo isolado.
  if (consulta.startsWith("INSERT INTO tbf_documentos_versoes ")) { estado.documentos.push({ id: parametros[0], documento_id: parametros[1], matricula_id: parametros[2], versao: parametros[3], tipo: parametros[4], objeto_privado: parametros[5], mime: parametros[6], tamanho_bytes: parametros[7], sha256: parametros[8], estado: "pendente", enviado_por: parametros[9], criado: new Date().toISOString() }); return [{ affectedRows: 1 }, []]; }
  // Histórico da edição é privado e existe somente na memória deste processo.
  if (consulta.startsWith("INSERT INTO tbf_fichas_revisoes")) { estado.revisoes.push({ id: parametros[0], aluno_id: parametros[1], matricula_id: parametros[2], versao_anterior: parametros[3], dados_anteriores: parametros[4], ator_id: parametros[5] }); return [{ affectedRows: 1 }, []]; }
  // Atualização condicionada simula o controle de versão por aluno.
  if (consulta.startsWith("UPDATE tbf_alunos SET")) {
    // Formulário antigo não encontra a versão atual, como no MySQL.
    const aluno = estado.alunos.find((a) => a.id === parametros[9] && a.versao_ficha === parametros[10]);
    // Apenas a fixture alvo é alterada.
    if (aluno) Object.assign(aluno, { nome: parametros[0], cpf: parametros[1], nascimento: parametros[2], telefone: parametros[3], email: parametros[4], endereco: parametros[5], inscricao: parametros[6], treinou_antes: Number(parametros[7]), experiencia: parametros[8], versao_ficha: aluno.versao_ficha + 1 });
    // Número de linhas alimenta a proteção real do adaptador.
    return [{ affectedRows: aluno ? 1 : 0 }, []];
  }
  // Plano, faixa e situação são atualizados sem tocar em cobranças ou arquivos.
  if (consulta.startsWith("UPDATE tbf_matriculas SET professor_id")) { const m = estado.matriculas.find((item) => item.id === parametros[8]); if (m) Object.assign(m, { professor_id: parametros[0], matricula: parametros[1], aulas: parametros[2], modalidade: parametros[3], centavos: parametros[4], faixa: parametros[5], situacao: parametros[6], necessita_responsavel: Number(parametros[7]) }); return [{ affectedRows: m ? 1 : 0 }, []]; }
  // Emergência é persistida apenas para este processo descartável.
  if (consulta.startsWith("INSERT INTO tbf_emergencias")) { estado.emergencias.push({ aluno_id: parametros[0], nome_vinculo: parametros[1], telefone: parametros[2] }); return [{ affectedRows: 1 }, []]; }
  // Correção de contato usa a chave interna da fixture.
  if (consulta.startsWith("UPDATE tbf_emergencias")) { const e = estado.emergencias.find((item) => item.aluno_id === parametros[3]); if (e) Object.assign(e, { nome_vinculo: parametros[0], telefone: parametros[1] }); return [{ affectedRows: e ? 1 : 0 }, []]; }
  // Reproduz inclusão ou revisão de representante sem exclusão de histórico.
  if (consulta.startsWith("INSERT INTO tbf_responsaveis")) { const dados = { matricula_id: parametros[0], nome: parametros[1], vinculo: parametros[2], documento_tipo: parametros[3], documento: parametros[4], telefone: parametros[5] }; const g = estado.responsaveis.find((item) => item.matricula_id === dados.matricula_id); if (g) Object.assign(g, dados); else estado.responsaveis.push(dados); return [{ affectedRows: 1 }, []]; }
  // Segurança continua fora das respostas da lista e dos logs.
  if (consulta.startsWith("INSERT INTO tbf_seguranca")) { estado.segurancas.push({ matricula_id: parametros[0], tem_condicao: Number(parametros[1]), condicao_detalhes: parametros[2], usa_medicamento: Number(parametros[3]), medicamento_detalhes: parametros[4], tem_lesao: Number(parametros[5]), lesao_detalhes: parametros[6] }); return [{ affectedRows: 1 }, []]; }
  // Revisão substitui apenas os campos vigentes da declaração fictícia.
  if (consulta.startsWith("UPDATE tbf_seguranca")) { const s = estado.segurancas.find((item) => item.matricula_id === parametros[8]); if (s) Object.assign(s, { tem_condicao: Number(parametros[0]), condicao_detalhes: parametros[1], usa_medicamento: Number(parametros[2]), medicamento_detalhes: parametros[3], tem_lesao: Number(parametros[4]), lesao_detalhes: parametros[5] }); return [{ affectedRows: s ? 1 : 0 }, []]; }
  // Grupos restritos não precisam ser armazenados para os testes de interface; são verificados em testes transacionais separados.
  if (/^INSERT INTO tbf_(emergencias|responsaveis_matricula|seguranca_matricula|auditoria_alunos) /.test(consulta)) return [{ affectedRows: 1 }, []];
  // Publicação e falha modificam apenas o documento sintético reservado.
  if (consulta.startsWith("UPDATE tbf_documentos_versoes SET estado")) {
    // O identificador é o único parâmetro da transição.
    const documento = estado.documentos.find((d) => d.id === parametros[0] && d.estado === "pendente");
    // Só uma versão pendente pode mudar de estado.
    if (documento) documento.estado = consulta.includes("'disponivel'") ? "disponivel" : "falha";
    // Número de linhas é devolvido no formato esperado pelo driver.
    return [{ affectedRows: documento ? 1 : 0 }, []];
  }
  // A edição de conta é aceita apenas nesta forma fixa e apenas para fixtures.
  if (consulta.startsWith("UPDATE professores SET nome = ?")) {
    // Localiza a conta fictícia sem acessar qualquer serviço real.
    const conta = estado.contas.find((c) => c.id === parametros[5]);
    // O código de produção já repetiu sessão, senha, versão e matriz de acesso.
    if (conta) Object.assign(conta, { nome: parametros[0], usuario: parametros[1], email: parametros[2], perfil: parametros[3], senha_hash: parametros[4] ?? conta.senha_hash });
    // Nenhuma conta real participa do resultado.
    return [{ affectedRows: conta ? 1 : 0 }, []];
  }
  // Escritas, leituras e exclusões fora desta lista falham em vez de chegar ao banco normal.
  throw new Error("Consulta não prevista pelo simulador fictício.");
}
// O pool em memória oferece somente a superfície usada pela aplicação testada.
export function createPool() {
  // Não há socket, URL de banco operacional ou chamada para driver real.
  return { execute: executar, query: executar, async getConnection() {
    // Cada transação conserva um snapshot somente para testar commit e rollback do fluxo.
    let anterior;
    // Métodos simulam a conexão exclusiva sem manter recursos do sistema.
    return { execute: executar, query: executar, beginTransaction: async () => { anterior = structuredClone(estado); }, commit: async () => { anterior = undefined; }, rollback: async () => { if (anterior) estado = anterior; anterior = undefined; }, release() {} };
  } };
}
// Compatibilidade com a importação default do MySQL2 no projeto.
export default { createPool };
