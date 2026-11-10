// O painel consulta anexos somente depois que o professor seleciona o aluno.
"use client";
// Efeito carrega metadados; referências limpam o arquivo após o envio.
import { useEffect, useRef, useState, type FormEvent } from "react";
// Atualiza a contagem na lista depois de anexar uma nova versão.
import { useRouter } from "next/navigation";
// A interface recebe apenas o resumo autorizado do aluno e dos documentos.
import type { AlunoResumo, DocumentoResumo } from "@/lib/alunos/tipos";
// Mantém a confirmação visível por cinco segundos, conforme a preferência já registrada.
import { useTemporaryMessage } from "./use-temporary-message";
// Os nomes amigáveis não dependem do nome original potencialmente pessoal do arquivo.
const nomes: Record<string, string> = { termo_assinado: "Termo assinado", ficha_assinada: "Ficha assinada", outro: "Outro documento" };
// A matrícula, e não um índice da tabela, identifica os anexos selecionados.
export default function DocumentosAluno({ aluno, fechar }: { aluno: AlunoResumo; fechar: () => void }) {
  // Documentos ficam na memória apenas enquanto esta ficha está aberta.
  const [documentos, definirDocumentos] = useState<DocumentoResumo[]>([]);
  // A primeira consulta tem estado explícito, sem anunciar uma lista vazia antes da resposta.
  const [carregando, definirCarregando] = useState(true);
  // O formulário é bloqueado enquanto o servidor confere original e cópia.
  const [enviando, definirEnviando] = useState(false);
  // Falhas são visíveis até a próxima tentativa.
  const [erro, definirErro] = useState("");
  // A mensagem temporária não altera a lista de versões.
  const [mensagem, informar] = useTemporaryMessage();
  // Um contador renova a consulta após um envio, sem recarregar a sessão.
  const [revisao, renovar] = useState(0);
  // Referência permite limpar o arquivo e a confirmação depois do sucesso.
  const formulario = useRef<HTMLFormElement>(null);
  // O roteador atualiza somente os dados renderizados pelo servidor.
  const roteador = useRouter();
  // A ficha recebe foco e fica visível assim que o aluno é selecionado.
  const painel = useRef<HTMLElement>(null);
  // O componente é remontado por matrícula; não leva o foco para outro aluno durante uma atualização.
  useEffect(() => {
    // Movimento reduzido é respeitado sem esconder a ficha selecionada.
    const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Mantém a navegação por teclado no contexto do aluno escolhido.
    painel.current?.focus({ preventScroll: true });
    // A rolagem revela os anexos, em vez de deixar a mudança abaixo da tela.
    painel.current?.scrollIntoView({ behavior: reduzido ? "instant" : "smooth", block: "start" });
  }, []);
  // O efeito é abortado ao selecionar outro aluno ou fechar a ficha.
  useEffect(() => {
    // O cancelamento impede uma resposta antiga de preencher outro painel.
    const controle = new AbortController();
    // A função assíncrona mantém os erros públicos sem expor caminhos privados.
    async function carregar() {
      // Consulta apenas a matrícula escolhida na lista autorizada.
      try {
        // A API revalida a sessão e registra a consulta na auditoria.
        const resposta = await fetch("/api/alunos/documentos?matricula=" + encodeURIComponent(aluno.matriculaId), { cache: "no-store", signal: controle.signal });
        // A forma do retorno é conferida antes de atualizar a interface.
        const dados = await resposta.json();
        // Uma falha não é convertida em uma lista vazia.
        if (!resposta.ok || !Array.isArray(dados.documentos)) throw new Error("consulta");
        // A lista inclui versões antigas e estados de envio incompleto.
        definirDocumentos(dados.documentos);
      } catch {
        // Um fechamento não precisa produzir uma mensagem de erro em outro componente.
        if (!controle.signal.aborted) definirErro("Não foi possível consultar os documentos. Feche e abra a ficha para tentar novamente.");
      } finally {
        // Evita atualizar um painel que já foi desmontado.
        if (!controle.signal.aborted) definirCarregando(false);
      }
    }
    // Dispara a consulta sem bloquear os controles de navegação do aluno.
    void carregar();
    // Trocar a seleção cancela a solicitação pendente.
    return () => controle.abort();
  }, [aluno.matriculaId, revisao]);
  // Um envio cria nova versão; nenhuma versão anterior é removida da lista.
  async function enviar(evento: FormEvent<HTMLFormElement>) {
    // O formulário não navega nem recarrega a página com dados do arquivo na URL.
    evento.preventDefault();
    // Captura os campos antes de qualquer espera assíncrona.
    const dados = new FormData(evento.currentTarget);
    // Inclui somente o identificador interno da matrícula selecionada.
    dados.set("matricula", aluno.matriculaId);
    // Remove o erro anterior ao iniciar uma tentativa explícita.
    definirErro("");
    // Bloqueia envio repetido enquanto original e cópia estão sendo conferidos.
    definirEnviando(true);
    // Falhas de rede e recusas deixam o arquivo selecionado para uma nova tentativa.
    try {
      // O navegador fornece o multipart e a origem; a API confere ambos.
      const resposta = await fetch("/api/alunos/documentos", { method: "POST", body: dados });
      // O retorno público não inclui conteúdo ou caminhos internos.
      const resultado = await resposta.json();
      // Uma falha mantém o formulário e não anuncia sucesso.
      if (!resposta.ok) { definirErro(resultado.mensagem ?? "Não foi possível anexar."); return; }
      // Limpa o arquivo após a confirmação das duas cópias.
      formulario.current?.reset();
      // Cada envio bem-sucedido ganha cinco segundos de confirmação.
      informar(resultado.mensagem);
      // Renova a lista de versões depois da gravação confirmada.
      renovar((valor) => valor + 1);
      // A contagem de anexos na tabela é recalculada pelo servidor.
      roteador.refresh();
    } catch {
      // Não imprime o arquivo nem dados pessoais no console.
      definirErro("Falha de conexão. Confira os documentos listados antes de tentar enviar novamente.");
    } finally {
      // Uma falha não deixa o botão bloqueado indefinidamente.
      definirEnviando(false);
    }
  }
  // O painel mantém a identidade do aluno visível durante a consulta e o envio.
  return <section ref={painel} tabIndex={-1} className="content-panel student-documents" aria-label={"Documentos de " + aluno.nome}>
    {/* Cabeçalho identifica a matrícula escolhida e permite fechar sem alterar dados. */}
    <div className="panel-heading"><div><h3>{aluno.nome}</h3><p>Documentos anexados · cadastro de teste</p></div><button className="button button-secondary" type="button" onClick={fechar}>Fechar ficha</button></div>
    {/* A lista exibe estados reais, inclusive tentativas que não concluíram. */}
    {carregando ? <p className="empty" role="status">Consultando documentos...</p> : documentos.length === 0 ? <p className="empty">Nenhum documento anexado.</p> : <div className="table-wrap"><table role="table" data-mobile-cards><thead role="rowgroup"><tr role="row"><th role="columnheader">Documento</th><th role="columnheader">Versão</th><th role="columnheader">Enviado em</th><th role="columnheader">Situação</th><th role="columnheader">Abrir</th></tr></thead><tbody role="rowgroup">{documentos.map((documento) => <tr role="row" key={documento.id}><td role="cell" data-label="Documento">{nomes[documento.tipo] ?? "Documento"}<small className="section-footnote">{Math.ceil(documento.tamanho / 1024)} KB</small></td><td role="cell" data-label="Versão">v{documento.versao}</td><td role="cell" data-label="Enviado em">{new Date(documento.criado).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</td><td role="cell" data-label="Situação">{documento.estado === "disponivel" ? "Disponível · assinatura não conferida" : documento.estado === "pendente" ? "Envio pendente de conferência" : "Envio não concluído"}</td><td role="cell" data-label="Abrir">{documento.estado === "disponivel" ? <a className="button button-secondary" href={"/api/alunos/documentos/" + documento.id} target="_blank" rel="noopener noreferrer">Abrir documento</a> : "Indisponível"}</td></tr>)}</tbody></table></div>}
    {/* Novo envio é sempre uma versão; a lista anterior permanece consultável. */}
    <form ref={formulario} onSubmit={enviar} className="document-upload"><h4>Anexar documento de teste</h4><p className="section-footnote">PDF, PNG ou JPEG · até 5 MB. Um novo envio preserva as versões anteriores. Use somente conteúdo fictício nesta etapa.</p><fieldset disabled={enviando}><label>Tipo de documento<select name="tipo" required><option value="termo_assinado">Termo assinado</option><option value="ficha_assinada">Ficha assinada</option><option value="outro">Outro documento</option></select></label><label>Arquivo<input name="arquivo" type="file" accept="application/pdf,image/png,image/jpeg" required /></label><label className="enrollment-check"><input name="confirmaTeste" type="checkbox" value="sim" required />Confirmo que este documento é fictício e será usado apenas em testes.</label><button className="button" type="submit">{enviando ? "Anexando e conferindo..." : "Anexar documento"}</button></fieldset></form>
    {/* Sucesso é temporário; erros continuam visíveis e não dependem somente de cor. */}
    {mensagem && <p className="form-success" role="status">{mensagem}</p>}{erro && <p className="form-error" role="alert">{erro}</p>}
  </section>;
}
