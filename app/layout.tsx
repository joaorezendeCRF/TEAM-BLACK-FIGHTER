// Instala o reinício da interface em todas as páginas sem alterar a sessão.
import ReiniciarNavegacao from "./reiniciar-navegacao";
// Mantém confrontos confirmados entre rotas da mesma visita, descartando-os ao sair do painel.
import RegistroLutasContexto from "./registro-lutas-contexto";
// Importa os recursos de next usados pelas operações deste arquivo.
import type { Metadata } from "next";
// Importa os recursos de next/font/google usados pelas operações deste arquivo.
import { Geist, Geist_Mono } from "next/font/google";
// Importa os recursos de ./globals.css usados pelas operações deste arquivo.
import "./globals.css";
// Os estilos móveis são aplicados a login, gestão e telas administrativas, sem alterar impressão.
import "./mobile.css";

// Prepara geistSans com o valor indicado para uso nas próximas etapas deste fluxo.
const geistSans = Geist({
  // Nome da variável CSS que disponibiliza a família tipográfica carregada.
  variable: "--font-geist-sans",
  // Subconjuntos de caracteres necessários para carregar a fonte.
  subsets: ["latin"],
// Conclui o objeto de dados ou opções passado à operação, preservando a estrutura e o escopo definidos.
});

// Prepara geistMono com o valor indicado para uso nas próximas etapas deste fluxo.
const geistMono = Geist_Mono({
  // Nome da variável CSS que disponibiliza a família tipográfica carregada.
  variable: "--font-geist-mono",
  // Subconjuntos de caracteres necessários para carregar a fonte.
  subsets: ["latin"],
// Conclui o objeto de dados ou opções passado à operação, preservando a estrutura e o escopo definidos.
});

// Exporta título e descrição estáticos utilizados pelo navegador para identificar a página.
export const metadata: Metadata = {
  // Título da página apresentado pelo navegador.
  title: "Team Black Fighter | Gestão",
  // Descrição pública incluída nos metadados da página.
  description: "Sistema de gestão da Team Black Fighter.",
// Conclui o objeto de dados ou opções passado à operação, preservando a estrutura e o escopo definidos.
};

// Define RootLayout e seus parâmetros; as próximas linhas implementam essa responsabilidade.
export default function RootLayout({ children }: LayoutProps<"/">) {
  // Inicia a estrutura visual retornada por este componente.
  return (
    // Apresenta raiz do documento HTML com as propriedades e os estilos definidos nesta linha.
    <html
      // Informa o idioma do documento para recursos de acessibilidade.
      lang="pt-BR"
      // Aplica as classes Tailwind indicadas: disposição, espaçamento e cores do elemento.
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    // Conclui as propriedades deste elemento para iniciar seu conteúdo ou encerrar o campo.
    >
      {/* O aplicativo possui temas próprios; impede recoloração automática das faixas por extensões que respeitam essa marcação. */}
      <head><meta name="darkreader-lock" /></head>
      {/* Apresenta área que recebe as telas da aplicação com as propriedades e os estilos definidos nesta linha. */}
      <body className="min-h-full flex flex-col"><RegistroLutasContexto><ReiniciarNavegacao>{children}</ReiniciarNavegacao></RegistroLutasContexto></body>
    {/* Finaliza raiz do documento HTML e mantém os próximos elementos fora desse agrupamento. */}
    </html>
  // Conclui a função RootLayout, preservando a estrutura e o escopo definidos.
  );
// Conclui a função RootLayout, preservando a estrutura e o escopo definidos.
}

