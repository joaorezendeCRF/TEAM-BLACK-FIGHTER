// A lista persistida só é consultada depois da sessão revalidada nesta página.
import { carregarPainelAlunos } from "@/lib/alunos/persistencia";
// Impede importar a verificação de sessão e o acesso ao banco no navegador.
import "server-only";
// O limite assíncrono mantém leituras de cookies compatíveis com Cache Components do Next.js instalado.
import { Suspense } from "react";
// Redireciona antes de renderizar exemplos quando a sessão não for válida.
import { redirect } from "next/navigation";
// Revalida no servidor a existência, o login e a situação ativa da conta a cada página.
import { obterUsuarioAutenticado } from "@/lib/autorizacao";
// Calcula a data civil brasileira sem depender do fuso do servidor de hospedagem.
import { todayInBrazil } from "@/lib/demonstracao/billing";
// Restringe os valores de seção aos quatro módulos integrados.
import type { SecaoGestao } from "@/lib/navegacao-gestao";
// Os estados de busca e recebimento ficam no navegador e utilizam somente dados fictícios.
import GestaoDemonstracao from "./gestao-demonstracao";
// Esta proteção fica na própria página porque layouts podem ser reutilizados pelo roteador.
async function ConteudoProtegido({ secao }: { secao: SecaoGestao }) {
  // A consulta reaproveita o serviço de autorização existente, sem alterar contas ou criar tabelas.
  const usuario = await obterUsuarioAutenticado();
  // Contas ausentes, excluídas, inativas ou com sessão inválida voltam ao login.
  if (!usuario) redirect("/");
  // Não envia ao componente nenhum hash, identificador de sessão ou dado de aluno real.
  // Outras seções continuam demonstrativas nesta etapa; nenhuma lista sensível é compartilhada com elas.
  const painelAlunos = secao === "alunos" ? await carregarPainelAlunos() : undefined;
  // Apenas o resumo cadastral autorizado e opções de professor chegam ao navegador.
  return <GestaoDemonstracao initialToday={todayInBrazil()} view={secao} painelAlunos={painelAlunos} />;
}
// Compartilha a fronteira de autenticação entre os quatro endereços e a entrada original do painel.
export default function PaginaGestao({ secao }: { secao: SecaoGestao }) {
  // A espera não expõe nome, lista de alunos ou resumo financeiro antes da autorização.
  return (
    <Suspense fallback={<p role="status" className="py-12 text-sm text-zinc-400">Carregando módulo...</p>}>
      {/* A autenticação é refeita perto do conteúdo, inclusive no acesso direto por endereço. */}
      <ConteudoProtegido secao={secao} />
    </Suspense>
  );
}
