// Este componente executa no navegador porque acompanha histórico e estado visual.
"use client";

// Fragment identifica uma subárvore sem acrescentar caixas ao layout existente.
import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
// O caminho atual muda também nas navegações internas realizadas pelo Next.js.
import { usePathname } from "next/navigation";

// Centraliza a limpeza dos elementos nativos para não depender da restauração do navegador.
function ConteudoInicial({ children }: { children: ReactNode }) {
  // A referência limita a limpeza à interface, sem tocar em cookies, sessão ou dados salvos.
  const area = useRef<HTMLDivElement>(null);
  // Na montagem, limpa campos restaurados pelo navegador e fecha painéis recolhíveis.
  useEffect(() => {
    // Reinicia os valores nativos dos formulários para seus valores iniciais.
    area.current?.querySelectorAll("form").forEach((formulario) => formulario.reset());
    // Remove a abertura restaurada de todos os painéis details dessa tela.
    area.current?.querySelectorAll("details").forEach((painel) => painel.removeAttribute("open"));
    // A limpeza só ocorre quando esta subárvore nasce, não em cada digitação.
  }, []);
  // display: contents preserva a disposição dos filhos definida pelo layout da aplicação.
  return <div ref={area} className="contents">{children}</div>;
// Conclui a função ConteudoInicial, preservando a estrutura e o escopo definidos.
}

// Instala uma fronteira global de reinício sem interromper a sessão autenticada.
export default function ReiniciarNavegacao({ children }: { children: ReactNode }) {
  // Identifica a tela atual sem guardar valores de formulários.
  const caminho = usePathname();
  // Esta versão diferencia visitas ao mesmo endereço pelo histórico do navegador.
  const [visita, definirVisita] = useState(0);
  // Eventos do navegador complementam as mudanças de caminho acompanhadas pelo Next.js.
  useEffect(() => {
    // Uma nova chave desmonta o estado antigo de formulários, mensagens e permissões.
    const reiniciar = () => definirVisita((anterior) => anterior + 1);
    // Cobre voltar e avançar, inclusive quando o endereço principal permanece igual.
    window.addEventListener("popstate", reiniciar);
    // Cobre páginas restauradas da memória do navegador, conhecida como bfcache.
    window.addEventListener("pageshow", reiniciar);
    // Retira as inscrições ao desmontar para evitar disparos e referências duplicadas.
    return () => {
      // Deixa de observar mudanças no histórico desta instância.
      window.removeEventListener("popstate", reiniciar);
      // Deixa de observar a restauração de páginas desta instância.
      window.removeEventListener("pageshow", reiniciar);
      // Finaliza a função de limpeza dos eventos.
    };
    // Os observadores não dependem dos valores digitados nem precisam ser reinstalados.
  }, []);
  // A chave muda por caminho e por visita, descartando inclusive estados preservados por Activity.
  return <Fragment key={caminho + ":" + visita}><ConteudoInicial>{children}</ConteudoInicial></Fragment>;
// Conclui a função ReiniciarNavegacao, preservando a estrutura e o escopo definidos.
}

