// Somente o formulário interativo executa no navegador; as consultas ficam no servidor.
"use client";
// Estado da ação controla envio, resultado e seleção condicional do perfil.
import { useActionState, useId, useRef, useState } from "react";
// A gravação revalida sessão, senha e versão no servidor.
import { editarUsuario } from "./editar-usuario-action";
// Importação somente de tipos não inclui o módulo criptográfico no navegador.
import type { ContaEditavel } from "@/lib/edicao-usuario";
// O aviso permanece visível mesmo quando uma promoção remove o controle da linha.
import { useFeedbackContas } from "./feedback-contas";
// Recebe exclusivamente campos públicos e uma versão sem hash de senha.
export default function EditarUsuario({ conta, versao, alteraPerfil }: { conta: ContaEditavel; versao: string; alteraPerfil: boolean }) {
  // Cada linha possui rótulos únicos, sem depender do nome da pessoa.
  const prefixo = useId();
  // A referência recolhe o painel depois da gravação confirmada.
  const painel = useRef<HTMLDetailsElement>(null);
  // Perfil só muda quando o administrador principal escolhe explicitamente.
  const [perfil, definirPerfil] = useState(conta.perfil);
  // Compartilha apenas o texto público de confirmação.
  const informar = useFeedbackContas();
  // Evita envios duplicados e conserva o formulário aberto quando houver erro.
  const [estado, enviar, pendente] = useActionState(async (anterior: { sucesso: boolean; mensagem: string }, dados: FormData) => {
    // A ação compara os dados com a conta atual no banco.
    const resultado = await editarUsuario(anterior, dados);
    // Fecha somente após sucesso; o servidor atualiza a tabela pela revalidação.
    if (resultado.sucesso) {
      // O retorno de sucesso fica fora do painel fechado.
      informar(resultado.mensagem);
      // Protege a referência caso a alteração do perfil já tenha removido o controle.
      if (painel.current) painel.current.open = false;
    }
    // Uma falha não limpa o preenchimento nem expõe o SQL.
    return resultado;
  }, { sucesso: false, mensagem: "" });
  // Promoção exige senha administrativa nova; demais edições preservam a senha existente.
  const promocao = conta.perfil === "professor" && perfil === "administrador";
  // Reutiliza a paleta já adaptada ao tema branco e preto.
  const classe = "mt-1 w-full rounded-lg border border-white/20 bg-zinc-950 px-3 py-2 text-white";
  // O painel compacto não ocupa uma linha inteira quando está fechado.
  return <details ref={painel} className="max-w-sm open:min-w-64">
    {/* Ícone de lápis diferencia edição de redefinição de senha. */}
    <summary className="reset-password-trigger"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m15 5 4 4M4 20l4-1 12-12a3 3 0 0 0-4-4L4 15Z" /></svg><span>Editar usuário</span><span className="reset-password-chevron" aria-hidden="true">⌄</span></summary>
    {/* Os valores atuais são apresentados para revisão antes do envio. */}
    <form action={enviar} autoComplete="off" className="mt-4 space-y-3">
      {/* Identificador e versão são revalidados; não representam autorização. */}
      <input type="hidden" name="id" value={conta.id} /><input type="hidden" name="versao" value={versao} />
      {/* Bloqueia campos durante o envio para não misturar duas solicitações. */}
      <fieldset disabled={pendente} className="space-y-3 disabled:opacity-60">
        {/* Nome, login e e-mail são os únicos campos cadastrais editáveis. */}
        {[{ chave: "nome", rotulo: "Nome", valor: conta.nome, limite: 150 }, { chave: "usuario", rotulo: "Usuário de acesso", valor: conta.usuario, limite: 50 }, { chave: "email", rotulo: "E-mail (opcional)", valor: conta.email ?? "", limite: 150 }].map((campo) => <div key={campo.chave}><label htmlFor={prefixo + campo.chave}>{campo.rotulo}</label><input id={prefixo + campo.chave} name={campo.chave} type={campo.chave === "email" ? "email" : "text"} required={campo.chave !== "email"} defaultValue={campo.valor} maxLength={campo.limite} className={classe} /></div>)}
        {/* Apenas o principal recebe seletor; o servidor repete a mesma regra. */}
        {alteraPerfil ? <label>Perfil<select name="perfil" value={perfil} onChange={(evento) => definirPerfil(evento.target.value)} className={classe}><option value="professor">Professor</option><option value="administrador">Administrador</option></select></label> : <input type="hidden" name="perfil" value={conta.perfil} />}
        {/* Um professor promovido não conserva uma senha que poderia violar a política administrativa. */}
        {promocao && <><p className="text-xs text-zinc-400">Para promover, defina uma nova senha de administrador.</p><label>Nova senha administrativa<input name="novaSenha" type="password" minLength={6} maxLength={1024} autoComplete="new-password" required className={classe} /></label><label>Confirmar nova senha<input name="confirmacao" type="password" minLength={6} maxLength={1024} autoComplete="new-password" required className={classe} /></label></>}
        {/* A senha digitada é a do autor conectado e nunca é preenchida automaticamente. */}
        <label>Sua senha de administrador<input name="senhaAdministrador" type="password" maxLength={1024} autoComplete="current-password" required className={classe} /></label>
        {/* Explica o efeito de editar o login sem repetir credenciais no retorno. */}
        <p className="text-xs text-zinc-400">Ao mudar o usuário de acesso, essa pessoa precisará entrar novamente com o novo login.</p>
        {/* Confirmação explícita aplica os dados revisados ao banco. */}
        <button type="submit" className="rounded-lg bg-white px-4 py-2 font-semibold text-black">{pendente ? "Salvando..." : "Salvar alterações"}</button>
      </fieldset>
      {/* Erros permanecem visíveis até uma correção ou um novo envio. */}
      {!estado.sucesso && estado.mensagem && <p role="alert" className="text-sm text-red-400">{estado.mensagem}</p>}
    </form>
  </details>;
}
