// Os arquivos destes testes são sintéticos e ficam exclusivamente em diretório temporário próprio.
import test from "node:test";
// Confere integridade, versões e ausência de sobrescrita.
import assert from "node:assert/strict";
// O teste cria e remove apenas o diretório temporário que ele mesmo recebeu.
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
// A localização temporária vem do sistema operacional, sem usar pastas de documentos do usuário.
import { tmpdir } from "node:os";
// Caminhos normalizados são conferidos antes da limpeza recursiva.
import path from "node:path";
// UUIDs sintéticos identificam objetos sem nomes de pessoas.
import { randomUUID } from "node:crypto";
// Exercita o mesmo código de gravação e recuperação utilizado pelos anexos privados.
import { caminhoObjeto, guardarDuasCopias, identificarArquivo, lerCopiaIntegra, LIMITE_DOCUMENTO, resumoArquivo } from "../lib/alunos/arquivos-privados";
// Conteúdo mínimo de teste não representa documento assinado de pessoa real.
const pdf = Buffer.from("%PDF-1.4\n% documento ficticio para teste\n%%EOF");
// Tipos são determinados pelo conteúdo; extensão e MIME do cliente são irrelevantes.
test("documentos recusam arquivo vazio, HTML, SVG e tamanho excessivo", () => {
  // Um PDF sintético com a assinatura esperada é identificado como PDF.
  assert.equal(identificarArquivo(pdf), "application/pdf");
  // Arquivo sem conteúdo não é um documento válido.
  assert.equal(identificarArquivo(Buffer.alloc(0)), null);
  // Conteúdo ativo não pertence à lista fechada de formatos.
  assert.equal(identificarArquivo(Buffer.from("<html><script>teste</script></html>")), null);
  // SVG não pode ser usado como uma imagem aceita pelo servidor.
  assert.equal(identificarArquivo(Buffer.from("<svg></svg>")), null);
  // O limite é aplicado antes da leitura de assinatura.
  assert.equal(identificarArquivo(Buffer.alloc(LIMITE_DOCUMENTO + 1)), null);
});
// Caminhos recebidos de URL ou nomes originais jamais viram nomes internos de objeto.
test("armazenamento recusa travessia de diretório e chaves sem UUID", () => {
  // A raiz do exemplo é apenas um caminho; este teste não grava arquivo.
  const raiz = path.join(tmpdir(), "tbf-exemplo-nao-criado");
  // Tentativa de escapar para a pasta pública é recusada antes de acesso ao disco.
  assert.throws(() => caminhoObjeto(raiz, "../public/arquivo.pdf"));
  // Nem um nome comum de PDF pode substituir o UUID interno.
  assert.throws(() => caminhoObjeto(raiz, "documento.pdf"));
});
// A restauração realmente lê os bytes de uma segunda origem após falha da principal.
test("duas cópias preservam bytes, não sobrescrevem e recuperam original ausente ou corrompido", async (t) => {
  // O sistema operacional gera uma pasta única pertencente somente a este teste.
  const temporario = await mkdtemp(path.join(tmpdir(), "tbf-arquivos-teste-"));
  // A limpeza só pode alcançar esta raiz validada dentro da pasta temporária.
  t.after(async () => {
    // Confere o caminho absoluto antes de qualquer exclusão recursiva.
    const resolvido = path.resolve(temporario), permitido = path.resolve(tmpdir()) + path.sep;
    // Um caminho inesperado não é removido silenciosamente.
    if (!resolvido.startsWith(permitido) || !path.basename(resolvido).startsWith("tbf-arquivos-teste-")) throw new Error("Limpeza fora da raiz de teste.");
    // Remove somente os arquivos sintéticos que o teste acabou de criar.
    await rm(resolvido, { recursive: true, force: true });
  });
  // As duas pastas reproduzem origens distintas, sem tocar no armazenamento configurado do site.
  const raiz = path.join(temporario, "principal"), copia = path.join(temporario, "copia"), chave = randomUUID() + ".bin";
  // A gravação só termina depois de conferir as duas versões.
  await guardarDuasCopias(raiz, copia, chave, pdf);
  // Os bytes originais são preservados sem conversão.
  assert.deepEqual(await readFile(caminhoObjeto(raiz, chave)), pdf);
  // Uma segunda tentativa com a mesma chave deve falhar em vez de sobrescrever.
  await assert.rejects(guardarDuasCopias(raiz, copia, chave, Buffer.from("outro conteúdo fictício")));
  // A recuperação distingue a origem principal de uma cópia de contingência.
  assert.equal((await lerCopiaIntegra(raiz, copia, chave, resumoArquivo(pdf), pdf.length)).recuperado, false);
  // Simula perda somente do arquivo sintético deste teste.
  await rm(caminhoObjeto(raiz, chave));
  // A segunda origem ainda possui exatamente o documento original.
  assert.deepEqual((await lerCopiaIntegra(raiz, copia, chave, resumoArquivo(pdf), pdf.length)).bytes, pdf);
  // Simula corrupção da principal e confere novamente a origem íntegra.
  await writeFile(caminhoObjeto(raiz, chave), "corrompido-ficticio");
  // Bytes diferentes não são entregues como se fossem válidos.
  assert.equal((await lerCopiaIntegra(raiz, copia, chave, resumoArquivo(pdf), pdf.length)).recuperado, true);
  // Corrompe também a segunda cópia, sempre dentro do diretório sintético.
  await writeFile(caminhoObjeto(copia, chave), "corrompido-ficticio");
  // Nenhum objeto é retornado quando ambas as origens falham na conferência.
  await assert.rejects(lerCopiaIntegra(raiz, copia, chave, resumoArquivo(pdf), pdf.length));
});
