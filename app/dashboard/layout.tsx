// O layout comum aguarda a autenticação sem incluir dados protegidos no conteúdo estático inicial.
import { Suspense, type ReactNode } from "react";
// A marca permite voltar à entrada do painel mantendo o fluxo de navegação existente.
import Link from "next/link";
// Uma sessão inválida deve retornar à tela de login antes de mostrar o menu.
import { redirect } from "next/navigation";
// Usa a consulta de autorização atual, que confirma a situação da conta no MySQL.
import { obterUsuarioAutenticado } from "@/lib/autorizacao";
// O menu é derivado do perfil atual do banco, nunca de uma escolha no navegador.
import { itensGestao } from "@/lib/navegacao-gestao";
// Apenas o destaque da rota precisa executar no navegador.
import MenuGestao from "./_components/menu-gestao";
// O menu compacto mantém os mesmos destinos e perfil no telefone.
import MenuCelular from "./_components/menu-celular";
// Mantém o encerramento da sessão já utilizado pelo projeto principal.
import SairButton from "./sair-button";
// Recebe as páginas sem consultar alunos ou iniciar simulações no layout compartilhado.
async function EstruturaAutenticada({ children }: { children: ReactNode }) {
  // Revalida a sessão e os dados mínimos de identificação da conta conectada.
  const usuario = await obterUsuarioAutenticado();
  // Impede apresentar menu e nome de usuário quando a conta não está mais autorizada.
  if (!usuario) redirect("/");
  // O visual mantém preto, branco e grafite e deixa o menu acessível no celular.
  return (
    <div className="min-h-screen bg-zinc-950 text-white lg:grid lg:grid-cols-[224px_minmax(0,1fr)] print:block print:bg-white print:text-black">
      {/* No telefone, a barra recolhível deixa o conteúdo visível desde o início. */}
      <MenuCelular>
        <MenuGestao itens={itensGestao(usuario.perfil)} />
        {/* A sessão e a saída também são acessíveis pelo menu compacto. */}
        <p className="mt-4 text-xs text-zinc-400">Conectado como {usuario.nome}</p>
        <SairButton />
      </MenuCelular>
      {/* A lateral completa continua disponível em larguras de computador. */}
      <aside className="sticky top-0 z-20 hidden flex-col self-start overflow-y-auto lg:flex lg:h-dvh lg:max-h-dvh border-b border-white/15 bg-zinc-950 p-5 lg:border-r lg:border-b-0 lg:p-6 print:hidden">
        {/* A identificação usa texto enquanto não houver arquivo de logo oficial. */}
        <Link href="/dashboard" prefetch={false} className="text-xs font-semibold tracking-[0.22em]">TEAM BLACK<br /><span className="text-xl tracking-[0.14em]">FIGHTER</span></Link>
        {/* Explica a finalidade do menu sem misturar dados de alunos com administração de contas. */}
        <p className="mt-7 mb-4 text-[10px] tracking-[0.18em] text-zinc-500 lg:mt-12">GESTÃO DA ACADEMIA</p>
        {/* Professores recebem cinco itens de demonstração; administradores mantêm também as contas reais. */}
        <MenuGestao itens={itensGestao(usuario.perfil)} />
        {/* A sessão individual permanece identificada, sem mostrar login, e-mail ou credenciais. */}
        <div className="mt-auto pt-8 text-xs text-zinc-400">
          {/* O nome é obtido do banco apenas após verificar a conta conectada. */}
          <p>Conectado como <span className="font-semibold text-white">{usuario.nome}</span></p>
          {/* O botão reutiliza a API de logout existente, que remove o cookie da sessão. */}
          <SairButton />
          {/* Crédito solicitado, abaixo da saída e fora dos dados da sessão. */}
          <p className="mt-4 text-[11px] text-zinc-500">Desenvolvido por João Gabriel</p>
        </div>
      </aside>
      {/* A página continua responsável por autorizar sua leitura; o layout só fornece a estrutura visual. */}
      <div className="dashboard-content min-w-0 px-4 py-6 sm:px-7 lg:px-8 lg:py-8 print:p-0">{children}</div>
    </div>
  );
}
// Mantém o limite de Suspense fora da leitura dinâmica de cookies, conforme a versão instalada.
export default function LayoutDashboard({ children }: { children: ReactNode }) {
  // A resposta inicial mostra somente uma mensagem de espera, sem dados das páginas internas.
  return (
    <Suspense fallback={<p role="status" className="min-h-screen bg-zinc-950 p-8 text-zinc-400">Verificando acesso...</p>}>
      {/* Só fornece a estrutura autenticada após a verificação no servidor. */}
      <EstruturaAutenticada>{children}</EstruturaAutenticada>
    </Suspense>
  );
}
