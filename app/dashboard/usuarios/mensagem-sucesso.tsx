// A mensagem precisa de estado e temporizador no navegador.
"use client";

// useEffect administra o temporizador; useState controla a presença da confirmação.
import { useEffect, useState } from "react";

// Cada montagem representa uma nova confirmação; o pai usa uma chave por operação.
export default function MensagemSucesso({ mensagem }: { mensagem: string }) {
  // A confirmação aparece imediatamente depois de uma operação bem-sucedida.
  const [visivel, definirVisivel] = useState(true);
  // Instala um prazo exclusivo desta mensagem.
  useEffect(() => {
    // Após 3000 milissegundos, remove somente a mensagem, sem modificar o formulário ou o banco.
    const temporizador = window.setTimeout(() => definirVisivel(false), 3000);
    // Cancela a tarefa ao navegar ou receber outra confirmação, evitando atualizações atrasadas.
    return () => window.clearTimeout(temporizador);
    // Uma nova chave no componente cria um novo prazo completo.
  }, []);
  // Quando o prazo acaba não deixa texto nem espaço vazio na interface.
  if (!visivel) return null;
  // Verde sinaliza sucesso; role=status permite anunciar a confirmação sem roubar o foco.
  return <p role="status" aria-live="polite" className="mt-3 text-sm font-medium text-emerald-400">{mensagem}</p>;
// Conclui a função MensagemSucesso, preservando a estrutura e o escopo definidos.
}

