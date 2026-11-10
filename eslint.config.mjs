// Importa os recursos de eslint/config usados pelas operações deste arquivo.
import { defineConfig, globalIgnores } from "eslint/config";
// Importa os recursos de eslint-config-next/core-web-vitals usados pelas operações deste arquivo.
import nextVitals from "eslint-config-next/core-web-vitals";
// Importa os recursos de eslint-config-next/typescript usados pelas operações deste arquivo.
import nextTs from "eslint-config-next/typescript";

// Prepara eslintConfig com o valor indicado para uso nas próximas etapas deste fluxo.
const eslintConfig = defineConfig([
  // Inclui os valores já definidos nesta configuração, mantendo a ordem de composição.
  ...nextVitals,
  // Inclui os valores já definidos nesta configuração, mantendo a ordem de composição.
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    // Fornece este texto ou valor literal ao parâmetro ou à lista em construção.
    "out/**",
    // Fornece este texto ou valor literal ao parâmetro ou à lista em construção.
    "build/**",
    // Fornece este texto ou valor literal ao parâmetro ou à lista em construção.
    "next-env.d.ts",
  // Conclui a construção sintática iniciada nas linhas anteriores, preservando a estrutura e o escopo definidos.
  ]),
// Conclui a construção sintática iniciada nas linhas anteriores, preservando a estrutura e o escopo definidos.
]);

// Disponibiliza a configuração ou instância para os demais módulos do projeto.
export default eslintConfig;
