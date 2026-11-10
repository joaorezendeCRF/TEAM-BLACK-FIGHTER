// As funções exportadas neste módulo executam somente no servidor.
"use server";
// Revalida a sessão e o perfil na tabela de usuários existente.
import { obterAdministrador } from "@/lib/autorizacao";
// Reutiliza o pool MySQL2 configurado para o banco team_black_fighter.
import pool from "@/lib/mysql";
// Reutiliza Argon2id para verificar a senha do administrador principal.
import { verificarSenha } from "@/lib/senha";
// Aplica as regras testáveis antes de chegar à persistência.
import { executarOperacaoConta, type ResultadoConta } from "@/lib/gerenciamento-conta";
// Executa somente as consultas fixas e protegidas da funcionalidade.
import { operarContaMysql } from "@/lib/operacao-conta-mysql";
// Atualiza a situação, a listagem e o total após a conclusão.
import { revalidatePath } from "next/cache";
// Declara o formato das consultas do driver, sem importar dados do banco.
import type { RowDataPacket } from "mysql2";

// Representa apenas os dados necessários para proteger a conta escolhida.
interface ContaBanco extends RowDataPacket {
  // Identificador primário usado nas consultas parametrizadas.
  id: number;
  // Login atual que deve corresponder à confirmação exibida ao usuário.
  usuario: string;
  // Perfil atual que impede gerenciar administradores principais.
  perfil: string;
  // Situação numérica retornada pelo MySQL para a coluna booleana.
  ativo: number;
// Finaliza a descrição dos dados públicos da conta.
}
// Representa o hash administrativo lido exclusivamente no servidor.
interface CredencialBanco extends RowDataPacket {
  // Hash atual utilizado para reconfirmar a senha por Argon2id.
  senha_hash: string;
// Finaliza a descrição da credencial protegida.
}

// Atende uma solicitação de inativação, reativação ou exclusão com validação completa.
export async function gerenciarConta(_anterior: ResultadoConta, formulario: FormData): Promise<ResultadoConta> {
  // Os adaptadores abaixo não expõem conexões nem hashes ao componente cliente.
  const resultado = await executarOperacaoConta(formulario, {
    // O serviço recusa explicitamente todos os perfis diferentes de admin_principal.
    obterAdministrador,
    // A comparação de senha permanece centralizada no módulo Argon2id existente.
    verificarSenha,
    // Consulta novamente a conta alvo depois de validar a solicitação.
    async obterAlvo(id) {
      // Carrega a identidade e as proteções atuais usando um parâmetro separado do SQL.
      const [contas] = await pool.execute<ContaBanco[]>(
        // A consulta não inclui senha ou outras informações privadas do alvo.
        `SELECT id, usuario, perfil, ativo FROM professores
         -- Restringe a consulta à conta escolhida, sem aceitar instruções do cliente.
         WHERE id = ? LIMIT 1`,
        // Vincula exclusivamente o identificador validado ao placeholder da consulta.
        [id],
      // Finaliza a consulta da conta alvo.
      );
      // Usa o primeiro registro quando a conta ainda existe.
      const conta = contas[0];
      // Normaliza a situação booleana sem alterar dados no MySQL.
      return conta ? { id: conta.id, usuario: conta.usuario, perfil: conta.perfil, ativo: Boolean(conta.ativo) } : null;
    // Finaliza o adaptador de consulta da conta escolhida.
    },
    // Reconfirma que o autor continua sendo um administrador principal ativo.
    async obterCredencial(id) {
      // A consulta exige o perfil atual no banco, sem confiar no papel informado pelo cliente.
      const [credenciais] = await pool.execute<CredencialBanco[]>(
        // Lê somente o hash da conta administrativa que autoriza a operação.
        `SELECT senha_hash FROM professores
         -- A conta identificada precisa continuar ativa.
         WHERE id = ? AND ativo = 1
         -- Apenas o administrador principal pode confirmar a operação.
         AND perfil = 'admin_principal' LIMIT 1`,
        // Consulta a identidade proveniente da sessão validada.
        [id],
      // Finaliza a leitura da credencial administrativa.
      );
      // Uma credencial ausente impede qualquer alteração.
      return credenciais[0]?.senha_hash ?? null;
    // Finaliza o adaptador de confirmação administrativa.
    },
    // O comando inclui só identificadores, estado esperado e hash previamente confirmado.
    operar: (comando) => operarContaMysql(pool, comando),
  // Finaliza as dependências reais utilizadas pelo serviço.
  });
  // Atualiza também a linha removida ou a situação alterada depois da gravação confirmada.
  if (resultado.sucesso) revalidatePath("/dashboard/usuarios");
  // Devolve somente o resultado público serializável.
  return resultado;
// Finaliza a ação administrativa protegida.
}

