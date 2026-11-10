// Usa somente arquivos locais privados; não existe ligação com a pasta pública do Next.js.
import { mkdir, open, readFile } from "node:fs/promises";
// O hash permite conferir cópia, leitura e recuperação do mesmo conteúdo original.
import { createHash } from "node:crypto";
// Caminhos são derivados de raízes fixas e de UUID interno validado.
import path from "node:path";
// Cada documento tem limite de cinco MiB nesta etapa de testes.
export const LIMITE_DOCUMENTO = 5 * 1024 * 1024;
// Somente os três formatos previstos podem ser recebidos pelo servidor.
export function identificarArquivo(bytes: Uint8Array): string | null {
  // Arquivos vazios ou excessivos são rejeitados antes de gravar no disco.
  if (!bytes.length || bytes.length > LIMITE_DOCUMENTO) return null;
  // A assinatura identifica PDF; não significa validação jurídica ou varredura antimalware.
  if (bytes.length >= 8 && Buffer.from(bytes.subarray(0, 5)).toString("ascii") === "%PDF-") return "application/pdf";
  // PNG precisa apresentar a assinatura binária completa do formato.
  if (bytes.length >= 24 && Buffer.from(bytes.subarray(0, 8)).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "image/png";
  // JPEG começa pelo marcador de imagem e termina pelo marcador de encerramento.
  if (bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 && bytes[bytes.length - 2] === 255 && bytes[bytes.length - 1] === 217) return "image/jpeg";
  // Extensão e tipo declarados pelo navegador não tornam um arquivo aceitável.
  return null;
}
// Um resumo binário é armazenado na tabela e comparado novamente antes da abertura.
export const resumoArquivo = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest();
// A chave do objeto nunca pode conter nome de pessoa, barras ou navegação de diretórios.
export function caminhoObjeto(raiz: string, chave: string): string {
  // Somente UUIDs gerados internamente identificam arquivos imutáveis.
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}\.bin$/.test(chave) || !path.isAbsolute(raiz)) throw new Error("Armazenamento inválido.");
  // O arquivo fica diretamente na raiz privada e nunca recebe extensão enviada pelo cliente.
  return path.join(raiz, chave);
}
// Grava uma única versão com criação exclusiva, evitando substituir arquivo existente.
async function escreverImutavel(raiz: string, chave: string, bytes: Uint8Array) {
  // A raiz deve ter permissões privadas configuradas na preparação do ambiente.
  await mkdir(raiz, { recursive: true, mode: 0o700 });
  // O modo wx falha se um objeto com a mesma chave já existir.
  const arquivo = await open(caminhoObjeto(raiz, chave), "wx", 0o600);
  // Mesmo em uma falha de disco, o descritor é encerrado.
  try {
    // Escreve todos os bytes sem converter imagens ou PDFs.
    await arquivo.writeFile(bytes);
    // Solicita persistência ao sistema operacional antes de anunciar disponibilidade.
    await arquivo.sync();
  } finally {
    // Libera o descritor em todos os caminhos.
    await arquivo.close();
  }
}
// Cada envio só fica disponível quando original e segunda cópia conferem.
export async function guardarDuasCopias(raiz: string, copia: string, chave: string, bytes: Uint8Array) {
  // Raízes distintas evitam tratar o mesmo arquivo como duas cópias independentes.
  if (path.resolve(raiz).toLowerCase() === path.resolve(copia).toLowerCase()) throw new Error("A cópia precisa de outra pasta.");
  // A versão principal é criada antes da cópia; falhas permanecem rastreáveis no banco.
  await escreverImutavel(raiz, chave, bytes);
  // A segunda versão usa a mesma chave e também não pode sobrescrever conteúdo.
  await escreverImutavel(copia, chave, bytes);
  // Confere os bytes realmente lidos das duas localizações.
  for (const pasta of [raiz, copia]) {
    // Verifica a gravação, sem confiar apenas no término da chamada de escrita.
    const gravado = await readFile(caminhoObjeto(pasta, chave));
    // Um hash diferente mantém o documento indisponível.
    if (gravado.length !== bytes.length || !resumoArquivo(gravado).equals(resumoArquivo(bytes))) throw Object.assign(new Error("Falha de integridade."), { code: "TBF_INTEGRIDADE" });
  }
}
// Uma cópia íntegra permite recuperar conteúdo quando a principal falta ou está corrompida.
export async function lerCopiaIntegra(raiz: string, copia: string, chave: string, hash: Buffer, tamanho: number) {
  // Cada origem é conferida contra o hash original persistido no banco.
  for (const [indice, pasta] of [raiz, copia].entries()) {
    // Uma falha individual permite tentar a outra cópia, sem disponibilizar bytes inválidos.
    try {
      // Lê o objeto indicado pelo UUID interno previamente validado.
      const bytes = await readFile(caminhoObjeto(pasta, chave));
      // Tamanho e hash precisam conferir juntos antes da entrega.
      if (bytes.length === tamanho && resumoArquivo(bytes).equals(hash)) return { bytes, recuperado: indice === 1 };
    } catch {
      // Arquivo ausente ou inacessível é tratado pela tentativa da segunda origem.
    }
  }
  // Ambas as cópias falharam: nunca retornar conteúdo incompleto ou diferente.
  throw Object.assign(new Error("Documento indisponível para recuperação."), { code: "TBF_INTEGRIDADE" });
}
