"use client"; // Temporizadores existem somente enquanto a interface está aberta no navegador.
// Estado identifica cada confirmação, mesmo quando duas operações produzem o mesmo texto.
import { useEffect, useState } from "react";
// Centraliza a duração solicitada sem esconder erros de validação dos formulários.
export function useTemporaryMessage() {
  const [notification, setNotification] = useState({ text: "", id: 0 }); // Nenhuma confirmação aparece antes de uma operação.
  // Renova os cinco segundos a cada sucesso, inclusive se o texto for idêntico ao anterior.
  function notify(text: string) {
    setNotification((previous) => ({ text, id: previous.id + 1 })); // Troca apenas a mensagem visual; não altera registros.
  }
  // Fecha a confirmação automaticamente e cancela o temporizador quando outra mensagem chega.
  useEffect(() => {
    if (!notification.text) return; // Não cria temporizador para uma região vazia.
    const timer = window.setTimeout(() => setNotification((current) => current.id === notification.id ? { ...current, text: "" } : current), 5_000); // Uma confirmação antiga não pode apagar uma nova.
    return () => window.clearTimeout(timer); // Evita atualização depois de sair da tela.
  }, [notification]);
  return [notification.text, notify] as const; // Mantém a assinatura de mensagem e função de atualização.
}
