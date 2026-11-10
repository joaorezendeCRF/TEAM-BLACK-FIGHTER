// Importa os recursos de next usados pelas operações deste arquivo.
import type { NextConfig } from "next";

// Prepara nextConfig: NextConfig com o valor indicado para uso nas próximas etapas deste fluxo.
const nextConfig: NextConfig = {
  // Mantém o driver MySQL2 como dependência do servidor; o teste isolado pode substituí-lo sem acessar o banco real.
  serverExternalPackages: ["mysql2"],
  // O terminal de desenvolvimento não deve imprimir argumentos de ações que recebem fichas privadas.
  logging: { serverFunctions: false },
  // Agrupa as opções experimentais já habilitadas neste projeto.
  experimental: {
    // Preserva a opção de retorno de diagnóstico utilizada durante o desenvolvimento.
    agentFeedback: true,
  // Conclui o objeto de dados ou opções passado à operação, preservando a estrutura e o escopo definidos.
  },
  // Mantém o mecanismo de cache e Activity do Next.js; o reinício visual é tratado no layout.
  cacheComponents: true,
  // Preserva a configuração de pré-carregamento parcial já usada no projeto.
  partialPrefetching: true,
  // Configura o compilador que processa os recursos da aplicação.
  turbopack: {
    // Associa padrões de arquivos aos processadores de compilação.
    rules: {
      // Fornece este texto ou valor literal ao parâmetro ou à lista em construção.
      "*.css": {
        // Define os processadores responsáveis pela transformação do recurso.
        loaders: ["@tailwindcss/turbopack"],
        // Define a extensão interpretada pelo compilador depois de processar o recurso.
        as: "*.css",
      // Conclui o objeto de dados ou opções passado à operação, preservando a estrutura e o escopo definidos.
      },
    // Conclui o objeto de dados ou opções passado à operação, preservando a estrutura e o escopo definidos.
    },
  // Conclui o objeto de dados ou opções passado à operação, preservando a estrutura e o escopo definidos.
  },
// Conclui o objeto de dados ou opções passado à operação, preservando a estrutura e o escopo definidos.
};

// Disponibiliza a configuração ou instância para os demais módulos do projeto.
export default nextConfig;
