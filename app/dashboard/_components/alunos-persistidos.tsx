// Busca e seleção são locais; dados cadastrais e documentos vêm do servidor autenticado.
"use client";
// Estado seleciona uma matrícula sem enviar os dados restritos dos demais alunos.
import { useState } from "react";
// O formulário mantém máscaras e validações da etapa já aprovada.
import CadastroAluno from "./cadastro-aluno";
// A edição só carrega os dados completos da matrícula selecionada.
import EditarAluno from "./editar-aluno";
// Confirmação permanece na lista por cinco segundos após fechar a ficha salva.
import { useTemporaryMessage } from "./use-temporary-message";
// A ficha de anexos é carregada apenas para o aluno selecionado.
import DocumentosAluno from "./documentos-aluno";
// Catálogo e formatação monetária mantêm as cores e valores existentes.
import { GRADES, money } from "@/lib/demonstracao/billing";
// Contratos de lista não incluem CPF, telefones ou saúde.
import type { PainelAlunos } from "@/lib/alunos/tipos";
// A listagem apresenta os testes persistidos, sem misturar os oito exemplos de outras telas.
export default function AlunosPersistidos({ painel, today }: { painel: PainelAlunos; today: string }) {
  // A busca permanece em memória e não inclui campos pessoais sensíveis.
  const [busca, definirBusca] = useState("");
  // Identificador da matrícula selecionada controla o painel de anexos.
  const [selecionado, selecionar] = useState<string | null>(null);
  // A ficha de edição é independente da seleção dos documentos.
  const [editando, definirEdicao] = useState<string | null>(null);
  // Mensagem não repete dados privados da ficha.
  const [mensagem, notificar] = useTemporaryMessage();
  // O filtro é aplicado apenas aos nomes já autorizados para a lista.
  const filtrados = painel.alunos.filter((aluno) => aluno.nome.toLocaleLowerCase("pt-BR").includes(busca.toLocaleLowerCase("pt-BR")));
  // A seleção é recuperada do conjunto atualizado depois de cada gravação.
  const aluno = painel.alunos.find((item) => item.matriculaId === selecionado);
  // Uma falha de banco não pode parecer ausência de alunos.
  if (painel.indisponivel) return <p role="alert" className="form-error">Não foi possível carregar os cadastros. Atualize a página antes de continuar.</p>;
  // Indicadores contam cadastros persistidos e mantêm situação independente de pagamento.
  return <section>
    {/* O escopo desta fase é apresentado antes do primeiro cadastro. */}
    <div className="section-intro"><div><h2>Alunos da academia</h2><p>Cadastros de teste salvos no banco. Professores ativos têm acesso a todos os alunos.</p></div></div>
    {/* O formulário usa professores reais por ID, mas recebe somente dados fictícios de alunos. */}
    <CadastroAluno today={today} professores={painel.professores} persistente personalDisponivel={painel.edicaoDisponivel} />
    {/* A aplicação aguarda o SQL manual sem esconder cadastros existentes. */}
    {!painel.edicaoDisponivel && <p className="enrollment-warning">Planos personal e edição da ficha aguardam a execução de ATUALIZAR_PLANOS_E_EDICAO.sql no Workbench. Os cadastros existentes permanecem disponíveis.</p>}
    {/* Confirmação expira sem remover o aluno ou alterar seus documentos. */}
    {mensagem && <p className="form-success" role="status">{mensagem}</p>}
    {/* Contagem não usa nomes da demonstração financeira. */}
    <div className="metrics-grid three">{[{ titulo: "Total de alunos", valor: painel.alunos.length }, { titulo: "Ativos", valor: painel.alunos.filter((item) => item.situacao === "ativo").length }, { titulo: "Inativos", valor: painel.alunos.filter((item) => item.situacao === "inativo").length }].map((item) => <div className="metric" key={item.titulo}><span>{item.titulo}</span><strong>{item.valor}</strong><small>Cadastros de teste persistidos</small></div>)}</div>
    {/* Selecionar o nome abre os documentos correspondentes àquela matrícula. */}
    <div className="content-panel"><div className="panel-heading"><div><h3>Alunos cadastrados</h3><p>Clique no aluno para consultar os documentos anexados.</p></div><label>Buscar aluno<input value={busca} onChange={(evento) => definirBusca(evento.target.value)} placeholder="Digite o nome" /></label></div><div className="table-wrap"><table role="table" data-mobile-cards><thead role="rowgroup"><tr role="row"><th role="columnheader">Aluno</th><th role="columnheader">Faixa</th><th role="columnheader">Plano mensal</th><th role="columnheader">Professor</th><th role="columnheader">Situação</th><th role="columnheader">Documentos</th><th role="columnheader">Ficha</th></tr></thead><tbody role="rowgroup">{filtrados.map((item) => {
      // A cor é obtida somente do catálogo controlado no código.
      const faixa = GRADES.find((grade) => grade.id === item.faixa);
      // Texto e botão identificam anexos sem depender de cor ou de ícone isolado.
      return <tr role="row" key={item.matriculaId}><td role="cell" data-label="Aluno"><button className="student-select" type="button" aria-pressed={selecionado === item.matriculaId} onClick={() => selecionar(item.matriculaId)}>{item.nome}</button><small className="section-footnote">Teste</small></td><td role="cell" data-label="Faixa"><span className="grade-badge" style={{ background: faixa?.color, color: faixa?.ink }}>{faixa?.name ?? item.faixa}</span></td><td role="cell" data-label="Plano mensal">{item.aulas}x por semana {item.modalidade} · {money(item.centavos)}</td><td role="cell" data-label="Professor">{item.professor}</td><td role="cell" data-label="Situação"><span className={`enrollment-status ${item.situacao === "ativo" ? "active" : "inactive"}`}>{item.situacao === "ativo" ? "Ativo" : "Inativo"}</span></td><td role="cell" data-label="Documentos"><button className="button button-secondary" type="button" onClick={() => selecionar(item.matriculaId)}>Ver anexos ({item.documentos})</button></td><td role="cell" data-label="Ficha"><button className="button button-secondary" type="button" disabled={!painel.edicaoDisponivel} onClick={() => { selecionar(null); definirEdicao(item.matriculaId); }}>Editar ficha</button></td></tr>;
    })}</tbody></table>{filtrados.length === 0 && <p className="empty">{painel.alunos.length ? "Nenhum aluno encontrado nesta busca." : "Nenhum aluno cadastrado. Use Novo aluno para começar os testes."}</p>}</div></div>
    {/* O editor é desmontado ao fechar ou trocar aluno; respostas antigas não substituem a seleção atual. */}
    {editando && <EditarAluno key={editando} matricula={editando} today={today} professores={painel.professores} fechar={() => definirEdicao(null)} salvo={notificar} />}
    {/* Trocar a matrícula desmonta o painel anterior e impede exibir anexos de outra seleção. */}
    {aluno && <DocumentosAluno key={aluno.matriculaId} aluno={aluno} fechar={() => selecionar(null)} />}
    {/* Persistência financeira e esportiva será integrada em etapa própria. */}
    <p className="section-footnote">Pagamentos, relatórios e ranking continuam demonstrativos e ainda não incluem estes cadastros. Nenhuma cobrança é gerada ao salvar a matrícula.</p>
  </section>;
}
