"use client"; // A escolha de aparência usa armazenamento de preferência e eventos do navegador.
// O conteúdo protegido continua sendo produzido no servidor e chega somente como children.
import { useEffect, useState, type ReactNode } from "react";
// Os estilos se limitam à página administrativa, preservando login e menu compartilhado.
import "./tema-usuarios.css";
// Restringe a aparência às duas opções aprovadas para o sistema.
type Theme = "light" | "dark";
// Sol e lua seguem os mesmos desenhos utilizados nas outras telas de gestão.
function ThemeIcon({ theme }: { theme: Theme }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {/* O texto do botão fornece o nome acessível; o ícone é apenas um reforço visual. */}
      {theme === "light" ? <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></> : <path d="M20.8 13.2A8.8 8.8 0 0 1 10.8 3.2a8.8 8.8 0 1 0 10 10Z" />}
    </svg>
  ); // Nenhuma imagem externa ou dependência é necessária para os ícones.
}
// Aplica a mesma preferência visual das demais telas sem receber permissões ou credenciais.
export default function TemaUsuarios({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark"); // Primeiro HTML permanece igual no servidor e no navegador.
  // Restaura somente aparência depois da montagem, sem persistir dados de contas.
  useEffect(() => {
    try {
      const saved: Theme = window.localStorage.getItem("tbf-gestao-theme") === "light" ? "light" : "dark"; // Chave compartilhada com pagamentos, lutas e relatórios.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Restaura preferência visual após hidratação.
      setTheme(saved); // A seleção acessível acompanha a preferência recuperada.
    } catch { /* Armazenamento bloqueado mantém a página utilizável no tema preto. */ }
  }, []);
  // Alterar tema só muda a apresentação; as ações de contas mantêm autorização no servidor.
  function changeTheme(nextTheme: Theme) {
    setTheme(nextTheme); // O resultado aparece imediatamente mesmo se a preferência não puder ser salva.
    try { window.localStorage.setItem("tbf-gestao-theme", nextTheme); } catch { /* A falha de preferência não bloqueia o cadastro. */ }
  }
  return (
    <div className="usuarios-tema" data-theme={theme}>
      {/* A opção ativa é anunciada e distinguida visualmente, com sol no branco e lua no preto. */}
      <div className="users-theme-bar"><div className="users-theme-switch" role="group" aria-label="Cor de fundo">
        {/* Apenas o valor explícito light é enviado ao controle de aparência. */}
        <button type="button" aria-label="Tema branco" aria-pressed={theme === "light"} onClick={() => changeTheme("light")}><ThemeIcon theme="light" />Branco</button>
        {/* O tema escuro mantém o mesmo contraste das outras páginas da academia. */}
        <button type="button" aria-label="Tema preto" aria-pressed={theme === "dark"} onClick={() => changeTheme("dark")}><ThemeIcon theme="dark" />Preto</button>
      </div></div>
      {/* Somente o servidor decide quais contas, campos e ações chegam a este conteúdo. */}
      {children}
    </div>
  ); // Não cria consulta ou ação administrativa adicional no navegador.
}
