// Reutiliza a mesma verificação de sessão e conta ativa dos módulos da academia.
import PaginaGestao from "../_components/pagina-gestao";

// A rota própria permite acesso direto sem abrir mão da autorização no servidor.
export default function PaginaRegistroLutas() {
  return <PaginaGestao secao="lutas" />; // O formulário usa dados fictícios e não cria tabelas ou registros reais.
}
