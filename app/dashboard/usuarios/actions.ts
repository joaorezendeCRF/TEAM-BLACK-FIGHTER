// Marca as funções exportadas como ações executadas exclusivamente no servidor.
"use server";

// A ação roda somente no servidor; nunca envia hashes ou credenciais ao cliente.
import { obterAdministrador } from "@/lib/autorizacao";
// Importa os recursos de @/lib/mysql usados pelas operações deste arquivo.
import pool from "@/lib/mysql";
// Importa os recursos de @/lib/senha usados pelas operações deste arquivo.
import { gerarHashSenha, verificarSenha } from "@/lib/senha";
// Importa os recursos de @/lib/redefinicao-senha usados pelas operações deste arquivo.
import { validarRedefinicao } from "@/lib/redefinicao-senha";
// Importa os recursos de mysql2 usados pelas operações deste arquivo.
import type { ResultSetHeader, RowDataPacket } from "mysql2";

// A resposta contém apenas uma mensagem pública e o resultado da operação.
type Resultado = { sucesso: boolean; mensagem: string };
// Declara o contrato de Credencial para validar os dados durante a compilação TypeScript.
interface Credencial extends RowDataPacket { senha_hash: string }

/** Revalida a sessão e a senha do administrador a cada solicitação. */
// Define redefinirSenhaProfessor e seus parâmetros; as próximas linhas implementam essa responsabilidade.
export async function redefinirSenhaProfessor(
  // Define _anterior com o tipo ou valor exigido por este objeto de dados.
  _anterior: Resultado,
  // Define formulario com o tipo ou valor exigido por este objeto de dados.
  formulario: FormData,
// Declara o tipo do resultado assíncrono: ): Promise<Resultado>.
): Promise<Resultado> {
  // Inicia o trecho que pode falhar e será protegido pelo tratamento de exceções.
  try {
    // Não confia na visibilidade do botão nem em identificadores enviados pelo cliente.
    const administrador = await obterAdministrador();
    // Verifica (!administrador) return { sucesso: false, mensagem: "Acesso administrativo necessário." }; antes de permitir a continuação desta operação.
    if (!administrador) return { sucesso: false, mensagem: "Acesso administrativo necessário." };
    // Prepara entrada com o valor indicado para uso nas próximas etapas deste fluxo.
    const entrada = validarRedefinicao(formulario);
    // Verifica ("erro" in entrada) return { sucesso: false, mensagem: entrada.erro! }; antes de permitir a continuação desta operação.
    if ("erro" in entrada) return { sucesso: false, mensagem: entrada.erro! };

    // Consulta somente a credencial do administrador autenticado, com parâmetro SQL.
    const [credenciais] = await pool.execute<Credencial[]>(
      // Fornece este texto ou valor literal ao parâmetro ou à lista em construção.
      "SELECT senha_hash FROM professores WHERE id = ? AND ativo = 1 AND perfil IN ('admin_principal', 'administrador') LIMIT 1",
      // Associa administrador.id aos placeholders SQL, separando valores da instrução.
      [administrador.id],
    // Conclui o bloco de tratamento de falhas da operação, preservando a estrutura e o escopo definidos.
    );
    // Prepara credencial com o valor indicado para uso nas próximas etapas deste fluxo.
    const credencial = credenciais[0];
    // Verifica (!credencial || !(await verificarSenha(credencial.senha_hash, entrada.senhaAdministrador))) antes de permitir a continuação desta operação.
    if (!credencial || !(await verificarSenha(credencial.senha_hash, entrada.senhaAdministrador))) {
      // Retorna este resultado ao chamador e encerra o caminho atual da função.
      return { sucesso: false, mensagem: "Senha do administrador incorreta." };
    // Conclui a condição de validação e seu bloco de tratamento, preservando a estrutura e o escopo definidos.
    }

    // Reutiliza Argon2id com salt aleatório e os custos definidos em lib/senha.ts.
    // Aplica a senha livre exclusivamente nesta ação, que só atualiza professores.
    const novoHash = await gerarHashSenha(entrada.novaSenha, "redefinicao-professor");
    // Atualiza exclusivamente o hash de um professor. O JOIN revalida atomicamente
    // a permissão, a situação e o hash administrativo usados na confirmação.
    // Isso evita gravar se a conta administrativa mudar durante a verificação.
    const [resultado] = await pool.execute<ResultSetHeader>(
      // Inicia a atualização exclusiva do hash do professor, condicionada à autorização administrativa.
      `UPDATE professores AS alvo
       -- Relaciona a conta alvo à conta administrativa que confirma a operação.
       JOIN professores AS administrador ON administrador.id = ?
       -- Atualiza apenas o campo explicitamente indicado.
       SET alvo.senha_hash = ?
       -- Restringe a operação ao identificador ou à condição informada por parâmetro.
       WHERE alvo.id = ? AND alvo.perfil = 'professor'
         -- Exige também esta condição de autorização ou seleção.
         AND administrador.ativo = 1
         -- Exige também esta condição de autorização ou seleção.
         AND administrador.perfil IN ('admin_principal', 'administrador')
         -- Exige também esta condição de autorização ou seleção.
         AND administrador.senha_hash = ?`,
      // Associa administrador.id, novoHash, entrada.professorId, credencial.senha_hash aos placeholders SQL, separando valores da instrução.
      [administrador.id, novoHash, entrada.professorId, credencial.senha_hash],
    // Conclui o bloco de tratamento de falhas da operação, preservando a estrutura e o escopo definidos.
    );
    // Verifica (resultado.affectedRows !== 1) antes de permitir a continuação desta operação.
    if (resultado.affectedRows !== 1) {
      // Retorna este resultado ao chamador e encerra o caminho atual da função.
      return { sucesso: false, mensagem: "Não foi possível redefinir. Atualize a página e confira a conta selecionada." };
    // Conclui a condição de validação e seu bloco de tratamento, preservando a estrutura e o escopo definidos.
    }
    // Retorna este resultado ao chamador e encerra o caminho atual da função.
    return { sucesso: true, mensagem: "Senha do professor redefinida com sucesso." };
  // Captura falhas desta operação para apresentar uma resposta controlada.
  } catch {
    // Falhas internas não expõem SQL, hashes, senhas ou detalhes da conexão.
    return { sucesso: false, mensagem: "Não foi possível redefinir a senha. Tente novamente." };
  // Conclui o bloco de tratamento de falhas da operação, preservando a estrutura e o escopo definidos.
  }
// Conclui a função redefinirSenhaProfessor, preservando a estrutura e o escopo definidos.
}


