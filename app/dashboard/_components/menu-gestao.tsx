// O destaque acompanha a rota atual nas navegações internas e no histórico do navegador.
"use client";
// Os links mantêm a navegação do Next.js, sem criar estado paralelo para a tela escolhida.
import Link from "next/link";
// Consulta somente o endereço local atual para identificar a seção aberta.
import { usePathname } from "next/navigation";
// Reutiliza o catálogo de destinos e a regra de seleção cobertos por testes.
import { itemSelecionado, type ItemGestao } from "@/lib/navegacao-gestao";
// Recebe somente os itens que o servidor autorizou a apresentar para o perfil atual.
export default function MenuGestao({ itens }: { itens: ItemGestao[] }) {
  // A mudança de caminho acompanha links, voltar e avançar sem manter formulários antigos.
  const caminho = usePathname();
  // O menu permite leitura por tecnologias assistivas e se reorganiza em telas pequenas.
  return (
    <nav aria-label="Menu principal" className="flex flex-wrap gap-2 lg:grid">
      {/* Cada destino possui endereço próprio, permitindo atualização e acesso direto protegidos. */}
      {itens.map((item, indice) => (
        // O destaque usa preto, branco e grafite; permissão não é decidida por esta classe visual.
        <Link key={item.id} href={item.href} prefetch={false} aria-current={itemSelecionado(caminho, item) ? "page" : undefined} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${itemSelecionado(caminho, item) ? "bg-white/10 text-white" : "text-zinc-400 hover:bg-white/5 hover:text-white"}`}>
          {/* O número indica somente a ordem do menu, sem representar prioridade de acesso. */}
          <span aria-hidden="true" className="text-xs text-zinc-500">{String(indice + 1).padStart(2, "0")}</span>
          {/* O nome identifica a funcionalidade mesmo sem depender do destaque de cor. */}
          {item.rotulo}
        </Link>
      ))}
    </nav>
  );
}
