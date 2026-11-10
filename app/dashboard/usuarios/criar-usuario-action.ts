// Marca as funções exportadas como ações executadas exclusivamente no servidor.
"use server";

// A ação conecta as regras testáveis à sessão, ao Argon2id e ao MySQL2 reais.
import { obterAdministrador } from "@/lib/autorizacao";
// Importa os recursos de @/lib/mysql usados pelas operações deste arquivo.
import pool from "@/lib/mysql";
// Importa os recursos de @/lib/senha usados pelas operações deste arquivo.
import { gerarHashSenha, verificarSenha } from "@/lib/senha";
// Importa os recursos de @/lib/cadastro-usuario usados pelas operações deste arquivo.
import { executarCadastro, type ResultadoCadastro } from "@/lib/cadastro-usuario";
// Importa os recursos de next/cache usados pelas operações deste arquivo.
import { revalidatePath } from "next/cache";
// Importa os recursos de mysql2 usados pelas operações deste arquivo.
import type { ResultSetHeader, RowDataPacket } from "mysql2";

// Apenas o hash administrativo é lido para confirmar a senha de quem está conectado.
interface CredencialBanco extends RowDataPacket { senha_hash: string }

/** Cria uma única conta e atualiza a listagem sem substituir cadastros existentes. */
// Define criarUsuario e seus parâmetros; as próximas linhas implementam essa responsabilidade.
export async function criarUsuario(
  // Define _anterior com o tipo ou valor exigido por este objeto de dados.
  _anterior: ResultadoCadastro, formulario: FormData,
// Declara o tipo do resultado assíncrono: ): Promise<ResultadoCadastro>.
): Promise<ResultadoCadastro> {
  // Aguarda o resultado de executarCadastro(formulario,  e o guarda em resultado.
  const resultado = await executarCadastro(formulario, {
    // Dependência que consulta a sessão e retorna apenas uma conta com permissão administrativa.
    obterAdministrador,
    // Dependência que compara a senha digitada ao hash existente.
    verificarSenha,
    // A exceção de senha livre é exclusiva de contas de professor.
    gerarHash: (senha, perfil) => gerarHashSenha(senha, perfil === "professor" ? "cadastro-professor" : "padrao"),
    // Implementa a leitura assíncrona da credencial de um administrador que continua ativo.
    async obterCredencial(id) {
      // A consulta parametrizada confirma que a conta continua ativa e administrativa.
      const [linhas] = await pool.execute<CredencialBanco[]>(
        // Inicia a consulta parametrizada que lê os campos necessários da tabela existente.
        `SELECT senha_hash FROM professores
         -- Restringe a operação ao identificador ou à condição informada por parâmetro.
         WHERE id = ? AND ativo = 1
           -- Exige também esta condição de autorização ou seleção.
           AND perfil IN ('admin_principal', 'administrador') LIMIT 1`, [id],
      // Conclui a função obterCredencial, preservando a estrutura e o escopo definidos.
      );
      // Retorna este resultado ao chamador e encerra o caminho atual da função.
      return linhas[0]?.senha_hash ?? null;
    // Conclui a função obterCredencial, preservando a estrutura e o escopo definidos.
    },
    // Implementa a inserção de conta nova após reconfirmar a autorização do autor.
    async inserir(novo, administradorId, credencial) {
      // INSERT ... SELECT só insere se o autor continuar autorizado no instante da gravação.
      // O hash administrativo é comparado como binário, respeitando letras maiúsculas.
      // Os placeholders separam os valores da instrução e evitam injeção SQL.
      // ativo e criado_em usam os padrões já existentes; nenhuma conta é atualizada.
      const [gravacao] = await pool.execute<ResultSetHeader>(
        // Inicia a inserção parametrizada de uma conta nova, sem substituir contas existentes.
        `INSERT INTO professores (nome, usuario, email, senha_hash, perfil)
         -- Seleciona exclusivamente as colunas necessárias à operação.
         SELECT ?, ?, ?, ?, ? FROM professores AS autor
         -- Restringe a operação ao identificador ou à condição informada por parâmetro.
         WHERE autor.id = ? AND autor.ativo = 1
           -- Exige também esta condição de autorização ou seleção.
           AND autor.perfil IN ('admin_principal', 'administrador')
           -- Exige também esta condição de autorização ou seleção.
           AND BINARY autor.senha_hash = BINARY ?`,
        // Associa novo.nome, novo.usuario, novo.email, novo.senhaHash, novo.perfil, administradorId, credencial aos placeholders SQL, separando valores da instrução.
        [novo.nome, novo.usuario, novo.email, novo.senhaHash, novo.perfil, administradorId, credencial],
      // Conclui a função inserir, preservando a estrutura e o escopo definidos.
      );
      // Retorna este resultado ao chamador e encerra o caminho atual da função.
      return gravacao.affectedRows === 1;
    // Conclui a função inserir, preservando a estrutura e o escopo definidos.
    },
  // Conclui o objeto de dados ou opções passado à operação, preservando a estrutura e o escopo definidos.
  });
  // A atualização acontece após a gravação, trazendo a nova conta e o total atualizados.
  if (resultado.sucesso) revalidatePath("/dashboard/usuarios");
  // Retorna este resultado ao chamador e encerra o caminho atual da função.
  return resultado;
// Conclui a função criarUsuario, preservando a estrutura e o escopo definidos.
}

