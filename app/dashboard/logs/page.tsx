// A consulta só ocorre no servidor, depois de revalidar o administrador principal.
import "server-only";
// O limite assíncrono é obrigatório para a leitura de sessão com Cache Components.
import { Suspense } from "react";
// Links internos preservam a navegação e o botão de voltar à administração.
import Link from "next/link";
// Uma tentativa por endereço direto também é bloqueada.
import { redirect } from "next/navigation";
// O serviço consulta a conta atual, não somente o papel salvo no navegador.
import { obterAdministrador } from "@/lib/autorizacao";
// Logs técnicos ficam no mesmo MySQL já utilizado pelo sistema.
import pool from "@/lib/mysql";
// A tela conserva os temas branco e preto da área administrativa.
import TemaUsuarios from "../usuarios/tema-usuarios";
// Tipos descrevem somente os campos técnicos sanitizados.
import type { RowDataPacket } from "mysql2";
// A estrutura não inclui mensagens cruas de exceção ou dados pessoais.
interface LinhaLog extends RowDataPacket {
  // Referência pública exibida para localizar o evento sem dados sensíveis.
  referencia: string;
  // Classificação técnica entre aviso e erro, sem depender apenas de cor.
  nivel: string;
  // Operação interna escolhida pelo servidor.
  origem: string;
  // Código de falha pertencente à lista controlada.
  codigo: string;
  // Instante UTC formatado pelo servidor para apresentação brasileira.
  criado: number | string;
}
// Explicações fixas ajudam o administrador sem revelar mensagem crua do banco ou do arquivo.
const descricoes: Record<string, string> = {
  // O evento de diagnóstico é apresentado como verificação, sem simular uma falha real.
  TESTE_CONTROLADO: "Verificação de funcionamento concluída.",
  // Duplicidade não identifica qual pessoa ou valor já estava cadastrado.
  ER_DUP_ENTRY: "Um identificador único já está cadastrado.",
  // Falhas de privilégio orientam conferir a configuração da conta do sistema.
  ER_TABLEACCESS_DENIED_ERROR: "A conta do site não tem a permissão necessária no banco.",
  // Estrutura ausente requer conferir os arquivos SQL de preparação.
  ER_NO_SUCH_TABLE: "Uma tabela necessária ainda não está disponível.",
  // Falhas de rede não incluem endereço, usuário ou senha.
  ECONNREFUSED: "Não foi possível conectar ao banco.",
  // Tempo excedido é distinguido de uma validação de formulário.
  ETIMEDOUT: "A conexão excedeu o tempo de espera.",
  // Problemas de disco são informados sem revelar caminhos privados.
  ENOSPC: "Não há espaço disponível no armazenamento.",
  // Acesso negado não divulga nomes de arquivo ou permissões de outros usuários.
  EACCES: "O servidor não conseguiu acessar o armazenamento privado.",
  // Divergência de hash impede servir o documento como íntegro.
  TBF_INTEGRIDADE: "As cópias do documento não puderam ser conferidas. Verifique a recuperação.",
  // Configuração fica restrita ao diagnóstico administrativo.
  TBF_CONFIG_ARMAZENAMENTO: "A configuração do armazenamento privado precisa de revisão.",
  // Formato e limite pertencem às regras públicas de upload.
  TBF_ARQUIVO_INVALIDO: "Arquivo recusado. Use PDF, PNG ou JPEG de até 5 MB.",
};
// A lista é limitada aos 100 eventos mais recentes e não disponibiliza exclusão.
async function ConteudoLogs() {
  // Autorização é repetida perto da consulta protegida.
  const autor = await obterAdministrador();
  // Professores e administradores comuns não recebem diagnóstico interno.
  if (!autor || autor.perfil !== "admin_principal") redirect("/dashboard");
  // A interface distingue falha de consulta de ausência de eventos.
  let indisponivel = false;
  // Nenhum evento é presumido antes de consultar o banco.
  let logs: LinhaLog[] = [];
  // Se o banco estiver indisponível, a mensagem orienta consultar o fallback técnico privado.
  try {
    // A conversão UTC não depende do fuso que uma conexão reutilizada tenha recebido.
    const [linhas] = await pool.execute<LinhaLog[]>("SELECT referencia, nivel, origem, codigo, UNIX_TIMESTAMP(criado_em) * 1000 AS criado FROM tbf_logs_tecnicos ORDER BY criado_em DESC LIMIT 100");
    // Somente estes campos controlados participam da renderização.
    logs = linhas;
  } catch {
    // Não gera outro evento de banco ao falhar consultando a própria tela de logs.
    indisponivel = true;
  }
  // Cores e texto tornam os resultados legíveis em ambos os temas.
  return <TemaUsuarios><main className="bg-zinc-950 text-white"><Link href="/dashboard/usuarios" className="text-sm text-zinc-400">← Voltar a Gerenciar Usuários</Link><header className="mt-8"><p className="text-xs uppercase tracking-widest text-zinc-400">Team Black Fighter</p><h1 className="mt-3 text-3xl font-bold">Logs do sistema</h1><p className="mt-3 text-sm text-zinc-400">Últimos 100 eventos técnicos. A referência ajuda a localizar uma falha informada na tela.</p></header>
    {/* Recarregar a página consulta novos eventos; a tela não altera nem apaga histórico. */}
    <p className="mt-6 text-sm text-zinc-400">Atualize esta página para consultar novos registros. Acesso exclusivo do administrador principal.</p>
    {/* Indisponibilidade não é apresentada como ausência de erros. */}
    {indisponivel ? <p role="alert" className="mt-6 text-red-400">Não foi possível consultar os logs no banco. Confira a criação da tabela e, se o banco estiver fora do ar, os logs privados do servidor.</p> : <div className="mt-6 overflow-x-auto rounded-2xl border border-white/15"><table role="table" data-mobile-cards className="w-full min-w-175 text-left text-sm"><thead role="rowgroup" className="bg-white/5 text-zinc-400"><tr role="row"><th role="columnheader" className="p-3">Data e hora</th><th role="columnheader" className="p-3">Nível</th><th role="columnheader" className="p-3">Operação</th><th role="columnheader" className="p-3">Ocorrência</th><th role="columnheader" className="p-3">Referência</th></tr></thead><tbody role="rowgroup">{logs.map((log) => <tr role="row" key={log.referencia} className="border-t border-white/10"><td role="cell" data-label="Data e hora" className="p-3">{log.criado ? new Date(Number(log.criado)).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "Instante indisponível"}</td><td role="cell" data-label="Nível" className={"p-3 font-semibold " + (log.nivel === "aviso" ? "text-yellow-400" : "text-red-400")}>{log.nivel === "aviso" ? "Aviso" : "Erro"}</td><td role="cell" data-label="Operação" className="p-3">{log.origem.replaceAll("_", " ")}</td><td role="cell" data-label="Ocorrência" className="p-3">{descricoes[log.codigo] ?? "A operação não concluiu. Use a referência para análise técnica."}<small className="mt-1 block font-mono text-xs text-zinc-400">{log.codigo}</small></td><td role="cell" data-label="Referência" className="p-3 font-mono text-xs">{log.referencia}</td></tr>)}</tbody></table>{logs.length === 0 && <p className="p-6 text-zinc-400">Nenhuma falha técnica registrada.</p>}</div>}
    {/* Delimita o propósito dos logs e a separação da auditoria de operações. */}
    <p className="mt-6 text-sm text-zinc-500">Os logs não copiam formulários, CPF, telefone, saúde, documentos ou senhas. A auditoria de cadastros e anexos é mantida separadamente.</p>
  </main></TemaUsuarios>;
}
// O fallback não expõe eventos antes da conclusão da autenticação.
export default function PaginaLogs() {
  // A sessão dinâmica permanece dentro da fronteira assíncrona exigida pelo Next.js instalado.
  return <Suspense fallback={<p role="status">Carregando logs...</p>}><ConteudoLogs /></Suspense>;
}
