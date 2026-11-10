// Logs técnicos e acesso ao banco permanecem exclusivamente no servidor.
import "server-only";
// Referências aleatórias ligam a mensagem da tela ao evento, sem dados pessoais.
import { randomUUID } from "node:crypto";
// O fallback privado preserva diagnóstico quando o próprio MySQL estiver indisponível.
import { appendFile, mkdir } from "node:fs/promises";
// Caminhos de fallback são internos e não vêm da requisição.
import path from "node:path";
// O pool já configurado é reutilizado sem registrar sua URL ou credenciais.
import pool from "@/lib/mysql";
// Operações são constantes do código, nunca texto livre do formulário.
export type OperacaoLog = "cadastro_aluno" | "consultar_ficha" | "editar_aluno" | "editar_usuario" | "listar_documentos" | "anexar_documento" | "abrir_documento" | "teste_diagnostico";
// Somente códigos conhecidos podem sair de uma exceção e entrar nos logs.
const CODIGOS_SEGUROS = new Set(["TBF_INTEGRIDADE", "TBF_CONFIG_ARMAZENAMENTO", "TBF_ARQUIVO_INVALIDO", "TESTE_CONTROLADO", "ER_DUP_ENTRY", "ER_NO_REFERENCED_ROW_2", "ER_ROW_IS_REFERENCED_2", "ER_LOCK_DEADLOCK", "ER_LOCK_WAIT_TIMEOUT", "ER_TABLEACCESS_DENIED_ERROR", "ER_NO_SUCH_TABLE", "ER_ACCESS_DENIED_ERROR", "ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "ENOSPC", "EACCES", "ENOENT"]);
// Não usa message, stack, sql, cause, formulário ou corpo da requisição.
export function classificarFalha(erro: unknown): string {
  // Só uma propriedade textual conhecida pode identificar a categoria da falha.
  const codigo = erro && typeof erro === "object" && "code" in erro && typeof erro.code === "string" ? erro.code : "";
  // Conteúdo inesperado é substituído por marcador fixo, sem truncar e conservar segredo parcial.
  return CODIGOS_SEGUROS.has(codigo) ? codigo : "FALHA_NAO_CLASSIFICADA";
}
// O diagnóstico nunca deve transformar uma falha controlada em um segundo erro de aplicação.
export async function registrarFalha(origem: OperacaoLog, erro: unknown): Promise<string> {
  // O evento não contém nome de pessoa, ID de aluno, arquivo, senha ou mensagem crua.
  const evento = { id: randomUUID(), referencia: randomUUID(), nivel: "erro", origem, codigo: classificarFalha(erro), instante: new Date().toISOString() };
  // Duplicidade é orientação de cadastro; não representa necessariamente indisponibilidade do sistema.
  if (["ER_DUP_ENTRY", "TBF_ARQUIVO_INVALIDO", "TESTE_CONTROLADO"].includes(evento.codigo)) evento.nivel = "aviso";
  // O banco é a origem principal da tela de logs administrativa.
  try {
    // A instrução parametrizada grava apenas os metadados explicitamente selecionados acima.
    await pool.execute("INSERT INTO tbf_logs_tecnicos (id, referencia, nivel, origem, codigo) VALUES (?, ?, ?, ?, ?)", [evento.id, evento.referencia, evento.nivel, evento.origem, evento.codigo]);
  } catch {
    // Uma falha no próprio banco precisa continuar diagnosticável sem copiar a exceção original.
    try {
      // A pasta é configurada fora do projeto e protegida por permissões do sistema operacional.
      const raiz = process.env.TBF_LOGS_DIR;
      // Não grava em public, no diretório de código ou em uma raiz relativa de conveniência.
      if (!raiz || !path.isAbsolute(raiz)) throw new Error("Fallback não configurado.");
      // A configuração é criada pela preparação local; o modo privado também atende Unix futuro.
      await mkdir(raiz, { recursive: true, mode: 0o700 });
      // O nome é uma data gerada pelo servidor, sem nome de pessoa ou caminho vindo do cliente.
      const arquivo = path.join(raiz, evento.instante.slice(0, 10) + ".jsonl");
      // Cada linha conserva somente o mesmo evento sanitizado usado no banco.
      await appendFile(arquivo, JSON.stringify(evento) + "\n", { mode: 0o600 });
    } catch {
      // Última alternativa: imprime exclusivamente os campos seguros, nunca o objeto erro.
      console.error("TBF_LOG_TECNICO", JSON.stringify(evento));
    }
  }
  // A tela pode apresentar esta referência sem divulgar detalhes internos.
  return evento.referencia;
}
