"use client"; // Agendamentos e resultados desta etapa são mantidos na memória do navegador.

// Contexto compartilha as lutas entre Registro de lutas e Graduações, sem guardar campos de formulários.
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
// As regras de calendário, duplicidade e conclusão ficam fora da apresentação para serem testadas.
import { cancelFight, createDemoFightRecords, finishFight, scheduleFight, type FightInput, type FightRecord, type RecordedResult } from "@/lib/demonstracao/fights";
// Método e referência seguem para a validação da conclusão compartilhada.
import type { DecisaoLuta } from "@/lib/demonstracao/decisoes-luta";
// O cadastro recebido pelos módulos contém somente os oito alunos fictícios.
import { todayInBrazil, type Student } from "@/lib/demonstracao/billing";

// Define exatamente os dados e ações esportivos compartilhados nesta visita.
type FightContextValue = {
  cancel: (id: string, reason: string, today: string) => void; // Registra uma justificativa sem excluir a luta.
  records: FightRecord[]; // Eventos desta visita, ainda sem persistência definitiva.
  schedule: (input: FightInput, students: Student[], today: string) => void; // Confirma um agendamento validado.
  finish: (id: string, result: RecordedResult, today: string, decisao: DecisaoLuta) => void; // Confirma o resultado declarado e seu método.
};
// Ausência do provedor é um erro de montagem, não uma lista vazia de resultados.
const FightContext = createContext<FightContextValue | null>(null);

// O provedor fica acima da navegação para resultados confirmados sobreviverem à troca de telas.
export function FightsProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<FightRecord[]>([]); // Inicialização igual no servidor e no navegador antes de carregar os exemplos solicitados.
  const latest = useRef(records); // Mantém a versão mais recente durante cliques consecutivos na mesma visita.
  // Carrega exemplos relativos à data brasileira somente após a hidratação, sem consultar banco.
  useEffect(() => {
    const examples = createDemoFightRecords(todayInBrazil()); // Todos os nomes e confrontos são fictícios.
    latest.current = examples; // As próximas ações já enxergam os exemplos iniciais.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Calendário dos exemplos é obtido no navegador após a montagem.
    setRecords(examples); // A visita começa com agenda, resultados e cancelamento ilustrativos.
  }, []);
  // O formulário só chama esta ação depois de preencher os dados e confirmar o envio.
  function schedule(input: FightInput, students: Student[], today: string) {
    const updated = scheduleFight(latest.current, input, students, today, `registro-${crypto.randomUUID()}`); // Chave nova e validação antes de qualquer alteração.
    latest.current = updated; // Uma segunda ação já verá o registro recém-confirmado.
    setRecords(updated); // Propaga a mudança para lista e ranking.
  }
  // O resultado altera o mesmo registro, sem criar uma participação duplicada no ranking.
  function finish(id: string, result: RecordedResult, today: string, decisao: DecisaoLuta) {
    const updated = finishFight(latest.current, id, result, today, decisao); // Valida método, referência, data e duplicidade.
    latest.current = updated; // Mantém a próxima confirmação consistente com esta operação.
    setRecords(updated); // Recalcula todos os componentes que consomem o contexto.
  }
  // A justificativa transforma uma pendência em cancelada e mantém os dados para consulta.
  function cancel(id: string, reason: string, today: string) {
    const updated = cancelFight(latest.current, id, reason, today); // Valida o motivo e a situação antes de atualizar.
    latest.current = updated; // Cliques consecutivos não usam uma lista antiga.
    setRecords(updated); // Atualiza lista e ranking sem excluir registros.
  }
  return <FightContext.Provider value={{ records, schedule, finish, cancel }}>{children}</FightContext.Provider>; // Apenas dados fictícios atravessam esta fronteira.
}

// Expõe um único acesso tipado para o registro e o ranking esportivo.
export function useFights() {
  const context = useContext(FightContext); // Recupera o estado compartilhado da visita atual.
  if (!context) throw new Error("O módulo de lutas precisa do provedor compartilhado."); // Erro claro evita esconder uma integração incompleta.
  return context; // Não consulta banco, cookies ou documentos de alunos.
}
