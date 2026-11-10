"use client"; // O menu precisa fechar assim que o usuário escolhe um destino no celular.
// Usa a mesma marca e entrada do painel que a versão para computador.
import Link from "next/link";
// O conteúdo autorizado do menu é recebido do layout autenticado.
import type { ReactNode } from "react";

// A barra compacta é usada abaixo do tamanho em que a lateral cabe na tela.
export default function MenuCelular({ children }: { children: ReactNode }) {
  // O navegador mantém abertura e foco com o controle nativo de detalhes.
  return (
    <header className="mobile-dashboard-bar print:hidden lg:hidden">
      {/* Marca abre o painel e deixa a área principal disponível para o conteúdo. */}
      <Link href="/dashboard" prefetch={false} className="mobile-dashboard-brand">TEAM BLACK FIGHTER</Link>
      <details className="mobile-dashboard-menu"
        // Ao navegar, a próxima página fica livre do painel de navegação.
        onClick={(evento) => {
          // Só links do menu acionam fechamento. Botões de sessão seguem seu próprio fluxo.
          if (evento.target instanceof Element && evento.target.closest("a")) evento.currentTarget.open = false;
        }}
        // Escape fecha o menu e retorna o foco ao controle de abertura.
        onKeyDown={(evento) => {
          // Outras teclas mantêm a navegação nativa de detalhes.
          if (evento.key !== "Escape" || !evento.currentTarget.open) return;
          // Fecha a lista sem navegar ou perder a página atual.
          evento.currentTarget.open = false;
          // O usuário pode reabrir o menu com teclado ou toque.
          evento.currentTarget.querySelector("summary")?.focus();
        }}>
        {/* Texto do controle continua visível sem depender de um ícone. */}
        <summary>Menu</summary>
        {/* Itens e botão de saída respeitam o perfil recebido do servidor. */}
        <div className="mobile-dashboard-links">{children}</div>
      </details>
    </header>
  );
}
