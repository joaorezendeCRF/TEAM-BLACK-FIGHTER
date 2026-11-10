// A página reutiliza a proteção de sessão no servidor antes de renderizar dados fictícios.
import PaginaGestao from "../_components/pagina-gestao";
// O endereço seleciona exclusivamente o módulo aprovado, sem consultar ou gravar alunos reais.
export default function Pagina() {
  // A leitura dinâmica ocorre dentro de Suspense e verifica a situação atual da conta.
  return <PaginaGestao secao="alunos" />;
}
