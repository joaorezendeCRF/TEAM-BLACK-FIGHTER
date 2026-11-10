// A edição é executada exclusivamente no servidor pela ação do Next.js.
"use server";
// Revalida a sessão e os perfis diretamente nas contas existentes.
import { obterAdministrador } from "@/lib/autorizacao";
// Mantém a mesma conexão MySQL2 já utilizada pela autenticação.
import pool from "@/lib/mysql";
// O registrador nunca grava senhas, SQL ou conteúdo do formulário.
import { registrarFalha } from "@/lib/logs";
// Reutiliza a política administrativa e a comparação Argon2id.
import { gerarHashSenha, verificarSenha } from "@/lib/senha";
// O serviço testa validação, matriz de acesso e proteção contra formulários antigos.
import { executarEdicao, type ResultadoEdicao, type ContaEditavel } from "@/lib/edicao-usuario";
// O adaptador realiza a gravação protegida em transação.
import { editarContaMysql } from "@/lib/edicao-usuario-mysql";
// Atualiza a tabela somente depois de confirmar a gravação.
import { revalidatePath } from "next/cache";
// Tipos do driver não expõem conexão nem credenciais ao cliente.
import type { RowDataPacket } from "mysql2";
// Liga o formulário às regras; campos adicionais não se tornam colunas SQL.
export async function editarUsuario(_anterior: ResultadoEdicao, dados: FormData): Promise<ResultadoEdicao> {
  // A sessão, a senha e as consultas continuam restritas ao servidor.
  const resultado = await executarEdicao(dados, {
    // A sessão é novamente conferida no envio.
    autor: obterAdministrador,
    // O código de referência permite localizar uma falha sem expor detalhes internos na tela.
    registrarFalha: (erro) => registrarFalha("editar_usuario", erro),
    // Compara a senha digitada ao hash administrativo.
    verificar: verificarSenha,
    // Promoção usa a política administrativa, nunca a exceção de professores.
    hash: (senha) => gerarHashSenha(senha),
    // Carrega somente os campos que podem participar da edição.
    async alvo(id) {
      // O placeholder separa o identificador da instrução SQL.
      const [linhas] = await pool.execute<(ContaEditavel & RowDataPacket)[]>("SELECT id, nome, usuario, email, perfil, ativo FROM professores WHERE id = ? LIMIT 1", [id]);
      // Não encaminha hashes ou informações de outra conta ao formulário.
      return linhas[0] ?? null;
    },
    // Obtém a credencial somente se o autor continuar ativo e administrativo.
    async credencial(id) {
      // A condição é repetida sob bloqueio antes da atualização definitiva.
      const [linhas] = await pool.execute<RowDataPacket[]>("SELECT senha_hash FROM professores WHERE id = ? AND ativo = 1 AND perfil IN ('admin_principal','administrador') LIMIT 1", [id]);
      // Ausência de credencial impede o prosseguimento.
      return linhas[0]?.senha_hash ?? null;
    },
    // Não modifica a situação, nem exclui contas ou vínculos.
    gravar: (comando) => editarContaMysql(pool, comando),
  });
  // A listagem mostra nome, login e perfil atuais após o sucesso.
  if (resultado.sucesso) revalidatePath("/dashboard/usuarios");
  // O retorno contém apenas sucesso e uma mensagem pública.
  return resultado;
}
