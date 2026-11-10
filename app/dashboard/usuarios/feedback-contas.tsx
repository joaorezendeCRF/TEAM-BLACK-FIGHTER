// O aviso global precisa sobreviver à remoção de uma linha da tabela no navegador.
"use client";
// Contexto compartilha o aviso sem transformar a consulta de usuários em código cliente.
import { createContext, useContext, useState, type ReactNode } from "react";
// Reutiliza a confirmação verde que desaparece depois de três segundos.
import MensagemSucesso from "./mensagem-sucesso";

// O contexto não contém credenciais e começa sem emissor fora de seu provedor.
const ContextoFeedback = createContext<((mensagem: string) => void) | null>(null);
// Compartilha o emissor somente com os botões da tabela protegida.
export function useFeedbackContas() {
  // Recupera o emissor da seção que continuará montada após excluir uma conta.
  const informar = useContext(ContextoFeedback);
  // Um botão fora da tabela protegida representa erro de montagem, não autorização alternativa.
  if (!informar) throw new Error("Feedback de contas não configurado.");
  // Entrega somente a função de publicar a confirmação pública.
  return informar;
// Finaliza o acesso ao emissor de mensagens da tabela.
}

// Mantém o aviso fora das linhas para que ele não desapareça junto com o usuário excluído.
export default function FeedbackContas({ children }: { children: ReactNode }) {
  // Cada resposta bem-sucedida recebe uma sequência própria para reiniciar os três segundos.
  const [aviso, definirAviso] = useState({ mensagem: "", sequencia: 0 });
  // Publica a nova mensagem preservando a independência entre operações consecutivas.
  const informar = (mensagem: string) => definirAviso((anterior) => ({ mensagem, sequencia: anterior.sequencia + 1 }));
  // O provedor preserva a tabela renderizada pelo servidor e acrescenta somente o retorno visual.
  return (
    // Compartilha o emissor com os controles dentro da seção de usuários.
    <ContextoFeedback.Provider value={informar}>
      {/* Exibe cada confirmação por três segundos, mesmo quando sua linha já foi removida. */}
      {aviso.mensagem && <MensagemSucesso key={aviso.sequencia} mensagem={aviso.mensagem} />}
      {/* Mantém a tabela original e seus dados sob controle do servidor. */}
      {children}
    {/* Finaliza a área que compartilha o retorno das operações de conta. */}
    </ContextoFeedback.Provider>
  // Finaliza o retorno do provedor visual.
  );
// Finaliza o provedor de confirmações administrativas.
}

