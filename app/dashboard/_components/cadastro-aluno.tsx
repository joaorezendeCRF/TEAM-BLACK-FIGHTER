"use client"; // Cadastro e edição usam estado local até a confirmação explícita da gravação autenticada.
// Estado controla preenchimento e revisão; somente a confirmação envia os campos ao servidor e não há armazenamento no navegador.
import { useState, type FormEvent } from "react";
// Atualiza a lista sem perder a sessão após a gravação confirmada.
import { useRouter } from "next/navigation";
// A ação revalida sessão, campos e professor antes da transação.
import { cadastrarAluno } from "./cadastrar-aluno-action";
// A edição mantém histórico e valida a versão da ficha no servidor.
import { editarAluno } from "./editar-aluno-action";
// Os mesmos seis planos alimentam a revisão e o cálculo do valor na interface.
import { PLANOS, obterPlano } from "@/lib/planos";
// Formatação monetária mantém o padrão brasileiro em todos os planos.
import { money } from "@/lib/demonstracao/billing";
// Confirmações de sucesso desaparecem após os cinco segundos já usados nas outras telas.
import { useTemporaryMessage } from "./use-temporary-message";
// Opções contêm somente ID e nome de professores ativos.
import type { FichaEdicao, ProfessorOpcao } from "@/lib/alunos/tipos";
// A graduação usa exatamente o catálogo atual da academia.
import { GRADES } from "@/lib/demonstracao/billing";
// Campos condicionais são verificados pela mesma regra nos testes e na interface.
import { enrollmentErrors, needsGuardian, type EnrollmentDraft } from "@/lib/demonstracao/enrollment";
// O formulário respeita as variáveis dos temas branco e preto existentes.
import "./cadastro-aluno.css";
// A mesma máscara atende CPF, telefones do aluno, emergência e responsável.
import MaskedInput from "./masked-input";
// A escolha do tipo de documento evita aplicar máscara de CPF em RG ou outro documento.
import type { MaskKind } from "@/lib/mascaras";
// Cada campo informa nome interno, texto visível e tipo nativo de entrada.
type Field = { key: string; label: string; type?: string; optional?: boolean };
// Separa inscrição de matrícula e evita misturar responsável com contato de emergência.
const identity: Field[] = [
  { key: "name", label: "Nome completo" }, // Nome de apresentação da matrícula.
  { key: "cpf", label: "CPF", type: "text" }, // Texto preserva zeros iniciais; não será gravado nesta etapa.
  { key: "birth", label: "Data de nascimento", type: "date" }, // Idade é avaliada na data da matrícula.
  { key: "phone", label: "Telefone", type: "tel" }, // Contato do próprio aluno quando disponível.
  { key: "email", label: "E-mail (opcional)", type: "email", optional: true }, // Ausência não recebe e-mail inventado.
  { key: "address", label: "Endereço completo, cidade/UF e CEP" }, // Uma entrada permite revisar a disposição antes do modelo definitivo.
];
// Dados da matrícula não definem automaticamente a quitação de mensalidade.
const enrollment: Field[] = [
  { key: "registration", label: "Data de inscrição", type: "date" }, // Primeiro registro na academia.
  { key: "enrolled", label: "Data de matrícula", type: "date" }, // Formalização pode ter data diferente da inscrição.
  { key: "teacher", label: "Professor responsável" }, // Texto fictício enquanto o vínculo definitivo com contas não foi aprovado.
  { key: "emergency", label: "Contato de emergência: nome e vínculo" }, // Emergência não substitui representação legal.
  { key: "emergencyPhone", label: "Telefone de emergência", type: "tel" }, // Contato independente do responsável legal.
];
// Formulário local permite revisar campos e uma ficha, sem alterar os oito alunos existentes.
export default function CadastroAluno({ today, professores = [], persistente = false, edicao, personalDisponivel = true, aoFechar, aoSalvar }: {
  // Data civil de referência; o servidor repete a validação com sua própria data.
  today: string;
  // Contas disponíveis no seletor; identidade é sempre conferida por ID no servidor.
  professores?: ProfessorOpcao[];
  // Modo persistido conserva o fluxo de testes já aprovado.
  persistente?: boolean;
  // Presente apenas depois da leitura autenticada da ficha selecionada.
  edicao?: FichaEdicao;
  // Planos pessoais aguardam a criação manual das colunas e do histórico.
  personalDisponivel?: boolean;
  // Fechar descarta o rascunho da edição, sem gravar ou apagar qualquer registro.
  aoFechar?: () => void;
  // A listagem mantém a confirmação depois que o editor é desmontado.
  aoSalvar?: (mensagem: string) => void;
}) {
  // Campos de revisão continuam locais até a confirmação explícita de salvamento.
  const roteador = useRouter();
  // Bloqueia envios concorrentes enquanto a transação está em execução.
  const [salvando, definirSalvando] = useState(false);
  // Resultado não repete CPF, contatos, respostas ou conteúdo de documentos.
  const [resultado, definirResultado] = useTemporaryMessage();
  // O servidor exige confirmação de dados fictícios nesta etapa.
  const [confirmaTeste, confirmarTeste] = useState(false);
  const [open, setOpen] = useState(Boolean(edicao)); // O botão abre a próxima etapa dentro de Alunos.
  const [draft, setDraft] = useState<EnrollmentDraft>(edicao?.dados ?? {}); // Nenhuma resposta é presumida, inclusive perguntas de saúde.
  const [review, setReview] = useState(false); // A ficha só aparece depois das validações.
  const [errors, setErrors] = useState<string[]>([]); // Erros permanecem disponíveis para correção.
  const [document, setDocument] = useState(false); // Apenas simula um anexo; nenhum arquivo é lido ou enviado.
  const guardian = needsGuardian(draft.birth ?? "", draft.enrolled ?? ""); // Usa a idade da matrícula, sem atribuir maioridade retroativa.
  // Uma edição invalida a revisão anterior para que ela nunca apresente dados desatualizados.
  function update(key: string, value: string) {
    setDraft((previous) => ({ ...previous, [key]: value })); // Não preenche nem remove respostas de outros campos automaticamente.
    setReview(false); // O usuário precisa revisar novamente após alterações.
    confirmarTeste(false); // A confirmação anterior não autoriza um preenchimento diferente.
  }
  // Mantém rótulos, obrigatoriedade e contraste iguais para os campos simples.
  function field(config: Field) {
    // O vínculo persistido usa ID de conta ativa, nunca texto livre como identidade do professor.
    if (persistente && config.key === "teacher") return <label key="teacher">Professor responsável<select required value={draft.teacherId ?? ""} onChange={(evento) => { update("teacherId", evento.target.value); update("teacher", professores.find((professor) => String(professor.id) === evento.target.value)?.nome ?? ""); }}><option value="">Selecione o professor</option>{professores.map((professor) => <option key={professor.id} value={professor.id}>{professor.nome}</option>)}</select></label>;
    const mask: MaskKind | null = config.key === "cpf" || (config.key === "guardianDocument" && draft.guardianDocumentType === "cpf") ? "cpf" : config.type === "tel" ? "phone" : null; // CPF só é aplicado a documentos do tipo correspondente.
    // Campo mascarado preserva o comportamento controlado e o rótulo acessível do formulário.
    return <label key={config.key}>{config.label}{mask ? <MaskedInput kind={mask} required={!config.optional} value={draft[config.key] ?? ""} onValueChange={(value) => update(config.key, value)} autoComplete="off" /> : <input type={config.type ?? "text"} required={!config.optional} value={draft[config.key] ?? ""} maxLength={config.key === "address" ? 300 : 150} max={config.type === "date" ? today : undefined} onChange={(event) => update(config.key, event.target.value)} autoComplete="off" />}</label>; // Máscara não representa identidade verificada ou cadastro salvo.
  }
  // Perguntas sim/não começam sem resposta; somente Sim exige informação complementar.
  function question(key: string, label: string) {
    return <div className="enrollment-question" key={key}><label>{label}<select required value={draft[key] ?? ""} onChange={(event) => update(key, event.target.value)}><option value="">Selecione</option><option value="nao">Não</option><option value="sim">Sim</option></select></label>{draft[key] === "sim" && <label>Detalhes: {label.toLocaleLowerCase("pt-BR")}<textarea required maxLength={500} value={draft[key + "Details"] ?? ""} onChange={(event) => update(key + "Details", event.target.value)} /></label>}</div>; // O texto complementar continua separado das observações administrativas.
  }
  // A confirmação gera somente uma ficha local, sem criar aluno ou cobrança real.
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); // Evita envio da ficha ou recarga da página.
    const issues = enrollmentErrors(draft, today); // Repete condições que a validação nativa não conhece.
    setErrors(issues); // Não esconde falhas enquanto houver campos inválidos.
    setReview(issues.length === 0); // Sucesso significa prévia revisável, nunca cadastro definitivo.
  }
  // Salva somente depois da revisão explícita; o rascunho não é armazenado no navegador.
  async function salvar() {
    if (salvando || !confirmaTeste) return; // Confirmação e bloqueio são repetidos no servidor.
    definirSalvando(true); // Evita criar duas matrículas por clique repetido.
    try {
      const resposta = edicao ? await editarAluno(edicao.matriculaId, edicao.versao, draft, confirmaTeste) : await cadastrarAluno(draft, confirmaTeste); // Apenas esta chamada envia os campos ao servidor autenticado.
      if (!resposta.ok) { setErrors([resposta.message]); return; } // Uma falha conserva o preenchimento para correção.
      if (edicao) { aoSalvar?.(resposta.message); aoFechar?.(); roteador.refresh(); return; } // Fecha apenas após confirmação transacional da edição.
      definirResultado("Aluno e matrícula salvos. Selecione o aluno na lista para anexar ou consultar documentos."); // Só anuncia sucesso após commit.
      setDraft({}); setReview(false); confirmarTeste(false); setOpen(false); // Limpa o rascunho sensível já confirmado.
      roteador.refresh(); // Atualiza contagens e listagem a partir do banco.
    } catch {
      setErrors(["Falha de conexão. Consulte a lista antes de tentar salvar novamente."]); // Não confirma uma gravação cujo retorno não chegou.
    } finally {
      definirSalvando(false); // Permite uma nova tentativa depois da resposta ou falha.
    }
  }
  // Um exemplo gerado explicitamente facilita testar sem copiar dados pessoais reais.
  function exemplo() {
    const base = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000_000).padStart(9, "0"); // Base sintética descartável, sem consultar pessoas.
    let cpf = base; // O número fica apenas no formulário de teste solicitado.
    for (const tamanho of [9, 10]) {
      const resto = ([...cpf].reduce((soma, digito, indice) => soma + Number(digito) * (tamanho + 1 - indice), 0) * 10) % 11; // Reproduz a regra matemática dos verificadores.
      cpf += String(resto === 10 ? 0 : resto); // Não comprova titularidade nem consulta cadastro oficial.
    }
    setDraft({ name: "Aluno Teste " + base.slice(-4), cpf, birth: "2000-01-01", phone: "00" + base, email: "", address: "Endereço fictício para teste", registration: today, enrolled: today, teacherId: String(professores[0]?.id ?? ""), teacher: professores[0]?.nome ?? "", emergency: "Contato fictício de emergência", emergencyPhone: "00" + base, plan: "2", status: "ativo", grade: "branca", trained: "nao", condition: "nao", medication: "nao", injury: "nao" }); // Perguntas pertencem exclusivamente ao exemplo fictício.
    setReview(false); setErrors([]); confirmarTeste(false); // Exige revisão e confirmação antes de salvar o exemplo.
  }
  return <section className="enrollment-module">
    {/* Esta fronteira explica o escopo antes de coletar qualquer preenchimento. */}
    <div className="section-intro"><div><h2>{edicao ? "Editar ficha do aluno" : "Cadastro de alunos"}</h2><p>{edicao ? "Revise as alterações. A versão anterior e os anexos serão preservados." : persistente ? "Revise o cadastro fictício e confirme para salvar no banco." : "Primeira etapa: formulário e prévia da matrícula."}</p></div><button className="button" type="button" onClick={() => edicao ? aoFechar?.() : setOpen(!open)} aria-expanded={open}>{edicao ? "Fechar edição" : open ? "Fechar formulário" : "Novo aluno"}</button></div>
    {/* A confirmação de salvamento fica fora do formulário que é fechado após sucesso. */}
    {resultado && <p className="form-success" role="status">{resultado}</p>}
    {open && <div className="content-panel enrollment-panel">
      {/* Nenhum upload, dado real ou persistência é autorizado pela demonstração. */}
      <p className="enrollment-warning"><strong>{persistente ? "CADASTRO DE TESTE — USE SOMENTE DADOS FICTÍCIOS." : "PRÉVIA — USE SOMENTE DADOS FICTÍCIOS."}</strong> {persistente ? "Ao confirmar, o cadastro será salvo no banco atual e permanecerá após fechar o navegador. Não informe dados pessoais ou documentos reais." : "Nada será gravado no banco. O preenchimento é descartado ao sair desta tela ou recarregar."}</p>
      {/* O botão cria apenas preenchimento local, sem gravar automaticamente. */}
      {persistente && !edicao && <button className="button button-secondary" type="button" onClick={exemplo}>Preencher exemplo fictício</button>}
      <form onSubmit={submit} autoComplete="off">
        {/* As seções tornam explícitos os grupos de informações já definidos no projeto. */}
        <fieldset><legend>1. Dados do aluno</legend><div className="enrollment-fields">{identity.map(field)}</div></fieldset>
        <fieldset><legend>2. Matrícula e plano</legend><div className="enrollment-fields">{enrollment.map(field)}
          {/* Catálogo aprovado pelo proprietário distingue normal e personal e calcula o valor da seleção. */}
          <label>Plano mensal<select required value={draft.plan ?? ""} onChange={(event) => update("plan", event.target.value)}><option value="">Selecione</option>{PLANOS.map((plano) => <option key={plano.id} value={plano.id} disabled={plano.modalidade === "personal" && !personalDisponivel}>{plano.nome} · {money(plano.centavos)}</option>)}</select></label>
          {/* Sem troca de plano, um preço já contratado é conservado; novas escolhas usam o catálogo. */}
          {draft.plan && <p className="selected-plan" role="status">Mensalidade: <strong>{money(edicao && draft.plan === edicao.dados.plan ? edicao.centavos : obterPlano(draft.plan).centavos)}</strong><small>Trocar o plano atualiza este valor. Cobranças e recebimentos anteriores são preservados.</small></p>}
          {/* O cadastro normal anterior continua utilizável enquanto o SQL manual está pendente. */}
          {!personalDisponivel && <p className="section-footnote">Personal será liberado após executar o SQL de planos e edição.</p>}
          {/* Situação cadastral não é inferida de dívida ou ausência de pagamento. */}
          <label>Situação da matrícula<select required value={draft.status ?? ""} onChange={(event) => update("status", event.target.value)}><option value="">Selecione</option><option value="ativo">Ativo</option><option value="inativo">Inativo</option></select></label>
          {/* Iniciante é uma informação de experiência; faixa não é atribuída automaticamente. */}
          <label>Graduação/faixa<select required value={draft.grade ?? ""} onChange={(event) => update("grade", event.target.value)}><option value="">Selecione</option>{GRADES.map((grade) => <option key={grade.id} value={grade.id}>{grade.name}</option>)}</select></label>
          {question("trained", "Já treinou antes? (informe local/modalidade se sim)")}
        </div></fieldset>
        <fieldset><legend>3. Responsável legal</legend><p className="section-footnote">Obrigatório para menor na data da matrícula ou quando a representação legal for necessária. Emergência e responsável são contatos distintos.</p>
          {/* A necessidade adicional pode ser informada sem alterar a data de nascimento. */}
          <label className="enrollment-check"><input type="checkbox" checked={draft.guardianNeeded === "sim"} onChange={(event) => update("guardianNeeded", event.target.checked ? "sim" : "nao")} />Necessita responsável legal</label>
          {(guardian || draft.guardianNeeded === "sim") && <div className="enrollment-fields">{/* O documento pode ser CPF, RG ou outro; mudar o tipo limpa somente o identificador ainda não confirmado. */}<label>Tipo de documento do responsável<select required value={draft.guardianDocumentType ?? ""} onChange={(event) => { update("guardianDocumentType", event.target.value); update("guardianDocument", ""); }}><option value="">Selecione</option><option value="cpf">CPF</option><option value="rg">RG</option><option value="outro">Outro</option></select></label>{[{ key: "guardian", label: "Nome completo do responsável" }, { key: "guardianRelation", label: "Vínculo do responsável" }, { key: "guardianDocument", label: "Identificação do responsável" }, { key: "guardianPhone", label: "Telefone do responsável", type: "tel" }].map(field)}</div>}
        </fieldset>
        <fieldset><legend>4. Segurança para a prática — demonstração</legend><p className="section-footnote">Informações de segurança ficam separadas da listagem comum. Use somente respostas fictícias nesta etapa de testes.</p><div className="enrollment-fields">{question("condition", "Tem condição de saúde relevante para a prática?")}{question("medication", "Usa algum medicamento relevante para a atividade?")}{question("injury", "Tem lesão ou restrição?")}</div></fieldset>
        {persistente ? <fieldset><legend>5. Documentos assinados</legend><p>Após salvar, selecione o aluno na lista para anexar e consultar PDFs ou imagens. Cada envio preserva as versões anteriores.</p></fieldset> : <fieldset><legend>5. Documentos assinados</legend><p className="section-footnote">O envio real será liberado após definir armazenamento privado, permissões, versões e recuperação. A simulação abaixo não recebe arquivos.</p>
          {/* Um marcador fictício permite visualizar o estado do documento sem aceitar anexos pessoais. */}
          <button className="button button-secondary" type="button" onClick={() => { setDocument(!document); setReview(false); }}>{document ? "Remover simulação de anexo" : "Simular documento assinado"}</button><p className="section-footnote">{document ? "Documento fictício vinculado à prévia. Assinatura não conferida." : "Sem documento simulado. Pendência documental será exibida na prévia."}</p>
        </fieldset>}
        {/* Validações próprias são anunciadas juntas, sem descartar o preenchimento. */}
        {errors.length > 0 && <div className="form-error" role="alert"><ul>{errors.map((error) => <li key={error}>{error}</li>)}</ul></div>}
        <button className="button" type="submit">{edicao ? "Revisar alterações" : persistente ? "Revisar matrícula" : "Revisar matrícula de demonstração"}</button>
      </form>
      {/* A ficha confirma o preenchimento e não anuncia um salvamento que ainda não existe. */}
      {review && <div className="enrollment-review" role="status"><h3>{persistente ? "Revise antes de salvar" : "Prévia da matrícula — não salva"}</h3><p><strong>{draft.name}</strong> · {GRADES.find((grade) => grade.id === draft.grade)?.name} · {PLANOS.find((plano) => plano.id === draft.plan)?.nome} · {money(edicao && draft.plan === edicao.dados.plan ? edicao.centavos : obterPlano(draft.plan).centavos)} · {draft.status}</p><p>Professor: {draft.teacher}. Inscrição: {draft.registration}. Matrícula: {draft.enrolled}.</p><p>{guardian || draft.guardianNeeded === "sim" ? "Responsável legal preenchido." : "Responsável legal não exigido nesta prévia."} {edicao ? "Anexos existentes preservados; consulte-os pela lista de alunos." : document ? "Anexo simulado; conferência pendente." : "Documento assinado pendente."}</p><p>CPF, contatos e saúde não são repetidos neste resumo. Nenhuma cobrança é gerada nesta etapa.</p>{/* A confirmação explícita limita o uso atual a cadastros fictícios. */}{persistente && <><label className="enrollment-check"><input type="checkbox" checked={confirmaTeste} onChange={(evento) => confirmarTeste(evento.target.checked)} />{edicao ? "Revisei as alterações da ficha fictícia e autorizo salvar." : "Confirmo que os dados são fictícios e autorizo salvar este cadastro de teste."}</label><button className="button" type="button" disabled={!confirmaTeste || salvando} onClick={salvar}>{salvando ? "Salvando..." : edicao ? "Salvar alterações" : "Salvar aluno e matrícula"}</button></>}<button className="button button-secondary" type="button" onClick={() => setReview(false)}>Voltar à edição</button></div>}
    </div>}
  </section>; // A lista atual de alunos fictícios continua independente desta prévia.
}
