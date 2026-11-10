// Ficha completa, saúde e histórico permanecem exclusivamente no servidor.
import "server-only";
// UUIDs aleatórios não revelam a identidade do aluno nem o conteúdo da edição.
import { randomUUID } from "node:crypto";
// A edição usa o mesmo banco já configurado no sistema.
import pool from "@/lib/mysql";
// Tipos do driver descrevem consultas parametrizadas e conexões transacionais.
import type { ResultSetHeader, RowDataPacket } from "mysql2";
// Uma conexão exclusiva preserva a atomicidade entre os grupos e o histórico.
import type { Pool, PoolConnection } from "mysql2/promise";
// Regras cadastrais são repetidas no servidor, inclusive CPF, telefone e responsável condicional.
import { normalizeEnrollment, type CadastroActor } from "./cadastro";
// Identidade ativa e auditoria são revalidadas dentro da mesma transação.
import { auditar, cadastrosHabilitados, conferirAutor } from "./persistencia";
// Identificador e valor do plano nunca dependem de um preço recebido do cliente.
import { idPlano, obterPlano } from "../planos";
// Conferência é somente leitura; não executa DDL ou importação.
import { estruturaFichaDisponivel } from "./estrutura";
// Datas civis seguem o fuso usado nas demais regras do cadastro.
import { todayInBrazil } from "../demonstracao/billing";
// O contrato serializável só é devolvido para a matrícula selecionada e autorizada.
import type { FichaEdicao } from "./tipos";
// Rascunho permite reutilizar exatamente o formulário e as máscaras existentes.
import type { EnrollmentDraft } from "../demonstracao/enrollment";
// Falhas esperadas possuem textos fixos, sem incluir dados pessoais ou erros SQL.
export class ErroFicha extends Error {}
// Recusa identificadores inválidos antes de consultar registros restritos.
function conferirId(matricula: string) {
  // UUID de versão quatro é o padrão usado no cadastro atual.
  if (typeof matricula !== "string" || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(matricula)) throw new ErroFicha("Matrícula inválida.");
}
// Lê os grupos sob bloqueio; todas as edições bloqueiam primeiro o aluno e depois sua matrícula.
async function lerFicha(conexao: PoolConnection, matricula: string, escrita: boolean) {
  // Apenas constantes internas controlam o sufixo SQL, nunca texto do usuário.
  const bloqueio = escrita ? " FOR UPDATE" : " FOR SHARE";
  // Descobre a chave do aluno sem modificar dados nem bloquear em ordem inversa.
  const [vinculos] = await conexao.execute<RowDataPacket[]>("SELECT aluno_id FROM tbf_matriculas WHERE id = ?", [matricula]);
  // Ausência não fornece informações sobre outras pessoas.
  if (!vinculos[0]) throw new ErroFicha("Ficha indisponível.");
  // Datas são formatadas no SQL para manter valores civis, sem conversões de fuso do driver.
  const [alunos] = await conexao.execute<RowDataPacket[]>("SELECT id, nome, cpf, DATE_FORMAT(nascimento, '%Y-%m-%d') AS nascimento, telefone, email, endereco, DATE_FORMAT(inscricao_em, '%Y-%m-%d') AS inscricao, treinou_antes, experiencia, ambiente_teste, versao_ficha FROM tbf_alunos WHERE id = ?" + bloqueio, [vinculos[0].aluno_id]);
  // Esta etapa permanece limitada aos registros fictícios explicitamente identificados no banco.
  if (!alunos[0] || Number(alunos[0].ambiente_teste) !== 1) throw new ErroFicha("Ficha indisponível neste ambiente de testes.");
  // Bloqueia a matrícula depois do aluno; uploads já utilizam este mesmo identificador estável.
  const [matriculas] = await conexao.execute<RowDataPacket[]>("SELECT id, aluno_id, professor_id, DATE_FORMAT(matricula_em, '%Y-%m-%d') AS matricula, aulas_semana, modalidade, mensalidade_centavos, faixa, situacao, necessita_responsavel FROM tbf_matriculas WHERE id = ?" + bloqueio, [matricula]);
  // Confere novamente o vínculo para não apresentar um conjunto inconsistente.
  if (!matriculas[0] || matriculas[0].aluno_id !== alunos[0].id) throw new ErroFicha("Ficha indisponível.");
  // Os grupos privados são consultados somente para o aluno selecionado.
  const [emergencias] = await conexao.execute<RowDataPacket[]>("SELECT nome_vinculo, telefone FROM tbf_emergencias WHERE aluno_id = ?" + bloqueio, [alunos[0].id]);
  // Responsável não é confundido com emergência e nunca é carregado na lista geral.
  const [responsaveis] = await conexao.execute<RowDataPacket[]>("SELECT nome, vinculo, documento_tipo, documento, telefone FROM tbf_responsaveis_matricula WHERE matricula_id = ?" + bloqueio, [matricula]);
  // Saúde permanece separada do cadastro comum e não vai para logs ou cobranças.
  const [segurancas] = await conexao.execute<RowDataPacket[]>("SELECT tem_condicao, condicao_detalhes, usa_medicamento, medicamento_detalhes, tem_lesao, lesao_detalhes FROM tbf_seguranca_matricula WHERE matricula_id = ?" + bloqueio, [matricula]);
  // Uma ficha incompleta exige correção administrativa, sem inventar respostas ausentes.
  if (!emergencias[0] || !segurancas[0]) throw new ErroFicha("Ficha incompleta. Solicite a conferência do cadastro.");
  // O nome do professor é apenas apresentação; a autorização continua baseada no identificador.
  const [professores] = await conexao.execute<RowDataPacket[]>("SELECT nome FROM professores WHERE id = ?", [matriculas[0].professor_id]);
  // Referências curtas não modificam os dados originais retornados pelo driver.
  const a = alunos[0], m = matriculas[0], e = emergencias[0], s = segurancas[0];
  // Um responsável dispensado fica preservado no histórico, sem voltar a aparecer como vigente.
  const g = m.necessita_responsavel ? responsaveis[0] : undefined;
  // Ausência de representante obrigatório não deve ser mascarada por campos vazios.
  if (m.necessita_responsavel && !g) throw new ErroFicha("Responsável pendente. Solicite a conferência do cadastro.");
  // Todos os valores possuem o formato do formulário; nenhum arquivo ou chave privada participa da ficha.
  const dados: EnrollmentDraft = {
    // Identificação administrativa inclui CPF apenas nesta leitura autenticada e auditada.
    name: a.nome, cpf: a.cpf, birth: a.nascimento, phone: a.telefone, email: a.email ?? "", address: a.endereco,
    // Datas e professor são recuperados exatamente do vínculo escolhido.
    registration: a.inscricao, enrolled: m.matricula, teacherId: String(m.professor_id), teacher: professores[0]?.nome ?? "Professor cadastrado",
    // Plano usa modalidade explícita; o preço contratado é retornado separadamente para comparação.
    plan: idPlano(Number(m.aulas_semana), m.modalidade), status: m.situacao, grade: m.faixa,
    // Emergência é independente do responsável legal e pode ser alterada na própria seção.
    emergency: e.nome_vinculo, emergencyPhone: e.telefone,
    // Perguntas explícitas preservam as respostas já fornecidas, sem inferir valores de texto vazio.
    trained: a.treinou_antes ? "sim" : "nao", trainedDetails: a.experiencia ?? "",
    // A necessidade na matrícula é preservada mesmo que o aluno já tenha completado dezoito anos hoje.
    guardianNeeded: m.necessita_responsavel ? "sim" : "nao", guardian: g?.nome ?? "", guardianRelation: g?.vinculo ?? "",
    // Identificação e contato do representante só vão para a ficha selecionada.
    guardianDocumentType: g?.documento_tipo ?? "", guardianDocument: g?.documento ?? "", guardianPhone: g?.telefone ?? "",
    // Condição relevante fica fora da listagem pública da área interna.
    condition: s.tem_condicao ? "sim" : "nao", conditionDetails: s.condicao_detalhes ?? "",
    // Detalhes de medicamento só são reexibidos ao usuário autorizado que abriu a ficha.
    medication: s.usa_medicamento ? "sim" : "nao", medicationDetails: s.medicamento_detalhes ?? "",
    // Lesões e restrições são campos editáveis com a mesma validação de respostas condicionais.
    injury: s.tem_lesao ? "sim" : "nao", injuryDetails: s.lesao_detalhes ?? "",
  };
  // Dados completos nunca devem ser incluídos em uma mensagem de diagnóstico.
  return { alunoId: a.id as string, versao: Number(a.versao_ficha), centavos: Number(m.mensalidade_centavos), dados };
}
// A leitura restrita exige sessão revalidada e gera somente um evento de acesso na auditoria.
export async function carregarFicha(matricula: string, autor: CadastroActor, executor: Pick<Pool, "getConnection" | "execute"> = pool): Promise<FichaEdicao> {
  // Identificador e ambiente são validados antes de obter uma conexão transacional.
  conferirId(matricula);
  // Sem o SQL manual, os fluxos anteriores continuam disponíveis, mas a edição permanece bloqueada.
  if (!cadastrosHabilitados() || !await estruturaFichaDisponivel(executor)) throw new ErroFicha("Execute o SQL de planos e edição para liberar esta função.");
  // Conexão exclusiva mantém autorização, leitura consistente e auditoria juntas.
  const conexao = await executor.getConnection();
  // Qualquer falha interrompe a resposta antes de divulgar a ficha.
  try {
    // A transação de leitura também contém o evento de auditoria.
    await conexao.beginTransaction();
    // Autor revogado não recebe campos privados, mesmo com uma página antiga aberta.
    await conferirAutor(conexao, autor);
    // Bloqueios compartilhados garantem que todos os grupos pertençam à mesma versão.
    const ficha = await lerFicha(conexao, matricula, false);
    // Auditoria guarda somente ato e identificador; não recebe CPF, telefone ou saúde.
    await auditar(conexao, autor.id, matricula, "ficha", "consultar_edicao");
    // A ficha só sai depois de registrar o acesso autorizado.
    await conexao.commit();
    // O navegador não recebe uma cópia dos demais alunos ou do histórico privado.
    return { matriculaId: matricula, versao: ficha.versao, dados: ficha.dados, centavos: ficha.centavos };
  } catch (erro) {
    // Uma leitura sem auditoria concluída não é tratada como sucesso.
    await conexao.rollback();
    // A ação pública substitui erros inesperados por uma referência técnica segura.
    throw erro;
  } finally {
    // Libera a conexão tanto em sucesso quanto em bloqueio de acesso.
    conexao.release();
  }
}
// Atualiza a ficha escolhida, preservando documentos, criação original e cobranças anteriores.
export async function atualizarFicha(matricula: string, versao: number, input: Record<string, unknown>, autor: CadastroActor, executor: Pick<Pool, "getConnection" | "execute"> = pool) {
  // UUID inválido nunca chega às consultas de edição.
  conferirId(matricula);
  // A versão deve ter vindo da ficha carregada e nunca pode ser zero, fracionária ou infinita.
  if (!Number.isSafeInteger(versao) || versao < 1) throw new ErroFicha("Reabra a ficha antes de salvar.");
  // Esta função não cria tabelas e não permite alterar registros reais nesta etapa.
  if (!cadastrosHabilitados() || !await estruturaFichaDisponivel(executor)) throw new ErroFicha("Execute o SQL de planos e edição para liberar esta função.");
  // Corpo deve ser um objeto simples, sem arrays ou estruturas inesperadas.
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new ErroFicha("Dados inválidos.");
  // Professor precisa ser um identificador decimal seguro antes de qualquer consulta de vínculo.
  if (typeof input.teacherId !== "string" || !/^[1-9]\d*$/.test(input.teacherId) || !Number.isSafeInteger(Number(input.teacherId))) throw new ErroFicha("Selecione um professor válido.");
  // Obtém uma conexão exclusiva para bloquear o cadastro durante toda a revisão.
  const conexao = await executor.getConnection();
  // Histórico e grupos atuais são confirmados ou revertidos em conjunto.
  try {
    // Nenhuma edição parcial pode ficar visível.
    await conexao.beginTransaction();
    // Identidade é conferida antes de carregar o conteúdo restrito.
    await conferirAutor(conexao, autor);
    // O bloqueio do aluno serializa alterações feitas em qualquer matrícula dele.
    const anterior = await lerFicha(conexao, matricula, true);
    // Formulário antigo não sobrescreve mudanças feitas por outro professor.
    if (anterior.versao !== versao) throw new ErroFicha("Esta ficha foi alterada por outro usuário. Feche e reabra para revisar a versão atual.");
    // Um professor removido do seletor pode permanecer no vínculo antigo, mas uma troca exige conta ativa.
    if (input.teacherId !== anterior.dados.teacherId) await conferirAutor(conexao, autor, Number(input.teacherId));
    // O nome do professor vem do banco, sem confiar em texto recebido pelo cliente.
    const [professores] = await conexao.execute<RowDataPacket[]>("SELECT nome FROM professores WHERE id = ?", [Number(input.teacherId)]);
    // Sem referência válida, toda a operação é cancelada antes de alterar o cadastro.
    if (!professores[0]) throw new ErroFicha("Selecione um professor válido.");
    // Campos, tipos, CPF, datas, saúde e responsável são validados outra vez no servidor.
    const atual = normalizeEnrollment({ ...input, teacher: professores[0].nome }, todayInBrazil());
    // Aliases mantêm os grupos separados sem misturar saúde com informações comuns.
    const { basic: b, safety: s, guardian: g } = atual;
    // Catálogo define modalidade, frequência e valor; não existe preço editável enviado pelo navegador.
    const plano = obterPlano(b.plan);
    // Sem trocar o plano, conserva qualquer preço contratado existente; a troca usa o catálogo atual.
    const centavos = b.plan === anterior.dados.plan ? anterior.centavos : plano.centavos;
    // Antes de alterar, preserva a ficha completa anterior em tabela privada própria, nunca em logs.
    await conexao.execute("INSERT INTO tbf_fichas_revisoes (id, aluno_id, matricula_id, versao_anterior, dados_anteriores, ator_id) VALUES (?, ?, ?, ?, ?, ?)", [randomUUID(), anterior.alunoId, matricula, anterior.versao, JSON.stringify({ dados: anterior.dados, centavos: anterior.centavos }), autor.id]);
    // Dados comuns e número de versão são atualizados juntos; criação original e identidade interna permanecem.
    const [alteracao] = await conexao.execute<ResultSetHeader>("UPDATE tbf_alunos SET nome = ?, cpf = ?, nascimento = ?, telefone = ?, email = ?, endereco = ?, inscricao_em = ?, treinou_antes = ?, experiencia = ?, versao_ficha = versao_ficha + 1 WHERE id = ? AND versao_ficha = ?", [b.name, b.cpf, b.birth, b.phone, b.email || null, b.address, b.registration, b.trained === "sim", b.trainedDetails || null, anterior.alunoId, versao]);
    // Além do bloqueio, a escrita condicionada precisa confirmar exatamente um cadastro atualizado.
    if (alteracao.affectedRows !== 1) throw new ErroFicha("A ficha mudou durante a edição. Feche e reabra antes de salvar.");
    // Modifica apenas a matrícula escolhida; nunca atualiza cobranças ou recebimentos anteriores.
    await conexao.execute("UPDATE tbf_matriculas SET professor_id = ?, matricula_em = ?, aulas_semana = ?, modalidade = ?, mensalidade_centavos = ?, faixa = ?, situacao = ?, necessita_responsavel = ? WHERE id = ?", [Number(b.teacherId), b.enrolled, plano.aulas, plano.modalidade, centavos, b.grade, b.status, Boolean(g), matricula]);
    // Contato de emergência preserva sua finalidade e registra o responsável pela última confirmação.
    await conexao.execute("UPDATE tbf_emergencias SET nome_vinculo = ?, telefone = ?, atualizado_por = ?, atualizado_em = CURRENT_TIMESTAMP(6) WHERE aluno_id = ?", [b.emergency, b.emergencyPhone, autor.id, anterior.alunoId]);
    // Quando dispensado, o representante antigo não é apagado; necessidade fica desmarcada na matrícula.
    if (g) await conexao.execute("INSERT INTO tbf_responsaveis_matricula (matricula_id, nome, vinculo, documento_tipo, documento, telefone) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE nome = ?, vinculo = ?, documento_tipo = ?, documento = ?, telefone = ?", [matricula, g.name, g.relation, g.documentType, g.document, g.phone, g.name, g.relation, g.documentType, g.document, g.phone]);
    // A declaração anterior já foi versionada; detalhes deixam de ser vigentes quando a resposta muda para Não.
    await conexao.execute("UPDATE tbf_seguranca_matricula SET tem_condicao = ?, condicao_detalhes = ?, usa_medicamento = ?, medicamento_detalhes = ?, tem_lesao = ?, lesao_detalhes = ?, declarado_em = ?, registrado_por = ? WHERE matricula_id = ?", [s.condition === "sim", s.conditionDetails || null, s.medication === "sim", s.medicationDetails || null, s.injury === "sim", s.injuryDetails || null, todayInBrazil(), autor.id, matricula]);
    // Registra somente o ato, sem duplicar conteúdo da ficha na auditoria técnica.
    await auditar(conexao, autor.id, matricula, "ficha", "editar");
    // Todas as alterações ficam disponíveis no mesmo commit.
    await conexao.commit();
    // O resultado confirma somente o término da operação, sem repetir informações pessoais.
    return { ok: true as const, message: "Ficha do aluno atualizada com sucesso." };
  } catch (erro) {
    // Duplicidade de CPF, conflito de ativo ou falha em qualquer grupo desfaz também o histórico incompleto.
    await conexao.rollback();
    // Tratamento público não expõe SQL, campos sensíveis ou o objeto de erro.
    throw erro;
  } finally {
    // Não mantém bloqueios ou conexões abertas depois de concluir a tentativa.
    conexao.release();
  }
}
