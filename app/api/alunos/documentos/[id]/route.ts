// Diagnóstico privado não recebe arquivo, chave de armazenamento ou dados da matrícula.
import { registrarFalha } from "@/lib/logs";
// Uma URL conhecida não dispensa a revalidação da sessão ativa.
import { obterUsuarioAutenticado } from "@/lib/autorizacao";
// O serviço confere autorização, matrícula, estado, tamanho e hash antes da resposta.
import { abrirDocumento } from "@/lib/alunos/documentos";
// Leitura de arquivos privados exige o runtime Node.js.
// Cache Components utiliza Node.js por padrão e não aceita configuração runtime por segmento.
// A versão instalada do Next.js recebe parâmetros dinâmicos como uma Promise.
export async function GET(_request: Request, contexto: { params: Promise<{ id: string }> }) {
  // Revalida conta, login e situação em cada tentativa de abertura.
  const autor = await obterUsuarioAutenticado();
  // Conteúdo privado nunca é devolvido a visitantes.
  if (!autor) return new Response("Acesso não autorizado.", { status: 401, headers: { "Cache-Control": "no-store" } });
  // Arquivo ausente ou corrompido não deve produzir um download aparentemente válido.
  try {
    // O identificador é validado novamente pelo serviço antes de qualquer consulta.
    const { id } = await contexto.params;
    // A auditoria é confirmada antes de devolver os bytes.
    const documento = await abrirDocumento(id, autor);
    // A extensão deriva do MIME validado, não do nome enviado pelo usuário.
    const extensao = documento.mime === "application/pdf" ? "pdf" : documento.mime === "image/png" ? "png" : "jpg";
    // Cabeçalhos impedem cache e interpretação como conteúdo ativo da aplicação.
    return new Response(new Uint8Array(documento.bytes), { headers: {
      // Tipo é escolhido a partir de uma lista fechada conferida na entrada.
      "Content-Type": documento.mime,
      // O nome genérico evita expor nomes pessoais em URLs ou nomes de download.
      "Content-Disposition": `inline; filename="documento-v${documento.versao}.${extensao}"`,
      // Nenhum intermediário pode reutilizar os bytes para outra sessão.
      "Cache-Control": "private, no-store, max-age=0",
      // Impede que o navegador tente executar um tipo diferente do declarado.
      "X-Content-Type-Options": "nosniff",
      // PDF e imagens não recebem capacidade de executar scripts da aplicação.
      "Content-Security-Policy": "sandbox; default-src 'none'; frame-ancestors 'self'",
      // O endereço privado não é enviado como referência a outras páginas.
      "Referrer-Policy": "no-referrer",
    } });
  } catch (erro) {
    // A referência pública localiza a falha sem incluir conteúdo pessoal.
    const referencia = await registrarFalha("abrir_documento", erro);
    // A resposta não distingue conteúdo inexistente de conteúdo não autorizado.
    return new Response("Documento indisponível. Referência: " + referencia, { status: 404, headers: { "Cache-Control": "no-store" } });
  }
}
