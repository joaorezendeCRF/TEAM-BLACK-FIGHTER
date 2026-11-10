"use client"; // A ficha só é carregada depois de uma seleção explícita na lista.
// Efeito controla a leitura e descarta respostas de seleções anteriores.
import { useEffect, useRef, useState } from "react";
// Reaproveita todas as seções, máscaras e regras condicionais do cadastro.
import CadastroAluno from "./cadastro-aluno";
// A ação repete autorização no servidor antes de devolver campos privados.
import { carregarFichaAluno } from "./editar-aluno-action";
// Contrato não inclui documentos, caminhos privados nem dados de outros alunos.
import type { FichaEdicao, ProfessorOpcao } from "@/lib/alunos/tipos";
// A seleção vem da matrícula; dados completos permanecem apenas enquanto o painel está aberto.
export default function EditarAluno({ matricula, today, professores, fechar, salvo }: {
  // UUID estável da matrícula que o usuário pediu para editar.
  matricula: string;
  // Referência civil brasileira para validar datas do formulário.
  today: string;
  // Catálogo mínimo de professores ativos, sem credenciais.
  professores: ProfessorOpcao[];
  // Fechar desmonta o painel e descarta o preenchimento local.
  fechar: () => void;
  // Confirmação fica na lista após o painel ser desmontado.
  salvo: (mensagem: string) => void;
}) {
  // Nenhuma ficha restrita é presumida antes da resposta autenticada.
  const [ficha, definirFicha] = useState<FichaEdicao | null>(null);
  // Falha permanece visível até o usuário fechar e abrir novamente.
  const [erro, definirErro] = useState("");
  // Referência permite localizar o painel sem alterar o endereço ou recarregar a página.
  const painel = useRef<HTMLDivElement>(null);
  // Cada montagem pertence a uma única matrícula e é descartada ao trocar a seleção.
  useEffect(() => {
    // A limpeza invalida a resposta de uma requisição ainda em andamento.
    let ativo = true;
    // Rolagem respeita a preferência de redução de movimento do dispositivo.
    painel.current?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
    // Foco no título informa a abertura para teclado e leitores de tela.
    painel.current?.focus({ preventScroll: true });
    // A ação não envia a lista inteira de cadastros para o navegador.
    carregarFichaAluno(matricula).then((resposta) => {
      // Resposta atrasada nunca pode substituir a ficha de outra seleção.
      if (!ativo) return;
      // Só uma resposta autorizada fornece os campos completos.
      if (resposta.ok) definirFicha(resposta.ficha);
      // Orientações de estrutura ou sessão aparecem sem esconder a lista anterior.
      else definirErro(resposta.message);
    }).catch(() => {
      // Erro de conexão não é tratado como ficha vazia ou excluída.
      if (ativo) definirErro("Não foi possível abrir a ficha. Feche e tente novamente.");
    });
    // Não mantém o conteúdo de uma leitura que perdeu sua seleção.
    return () => { ativo = false; };
  }, [matricula]);
  // Mantém o vínculo atual visível quando seu professor foi inativado depois da matrícula.
  const opcoes = ficha && !professores.some((item) => String(item.id) === ficha.dados.teacherId) ? [...professores, { id: Number(ficha.dados.teacherId), nome: ficha.dados.teacher + " (vínculo atual)" }] : professores;
  // O conteúdo usa os mesmos temas branco e preto já presentes no cadastro.
  return <div ref={painel} tabIndex={-1} className="student-edit" aria-label="Edição da ficha do aluno">
    {/* Enquanto carrega ou falha, fechar continua disponível. */}
    {!ficha && <div className="content-panel enrollment-panel"><button className="button button-secondary" type="button" onClick={fechar}>Fechar edição</button>{erro ? <p className="form-error" role="alert">{erro}</p> : <p role="status">Carregando ficha...</p>}</div>}
    {/* A instância começa com os campos salvos e exige nova revisão antes da alteração. */}
    {ficha && <CadastroAluno today={today} professores={opcoes} persistente edicao={ficha} aoFechar={fechar} aoSalvar={salvo} />}
  </div>;
}
