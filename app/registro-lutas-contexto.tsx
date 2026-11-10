"use client"; // A fronteira acompanha navegação, sem consultar sessão ou dados pessoais no navegador.

// O caminho identifica somente a entrada e saída do painel autenticado.
import { usePathname } from "next/navigation";
// ReactNode permite envolver a estrutura existente sem alterar as páginas recebidas do servidor.
import type { ReactNode } from "react";
// O contexto contém somente confrontos fictícios confirmados nesta visita.
import { FightsProvider } from "./dashboard/_components/fights-provider";

// Fica acima do reinício de formulários para conservar registros entre as rotas do painel.
export default function RegistroLutasContexto({ children }: { children: ReactNode }) {
  const path = usePathname(); // Usa somente a rota pública, sem cookies ou identificadores de usuário.
  const scope = path.startsWith("/dashboard") ? "visita-painel" : path; // Sair para o login muda a chave e descarta o estado esportivo.
  return <FightsProvider key={scope}>{children}</FightsProvider>; // Trocar de módulo preserva lutas, mas não restaura campos ainda não confirmados.
}
