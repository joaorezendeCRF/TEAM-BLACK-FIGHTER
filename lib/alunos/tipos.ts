// Contratos serializáveis: listas comuns não recebem CPF, contato, saúde ou responsável.
export type AlunoResumo = {
  // UUID estável do aluno, sem derivação de CPF ou nome.
  id: string;
  // Matrícula escolhida identifica a ficha documental e seu histórico.
  matriculaId: string;
  // Nome autorizado para busca e apresentação na área interna.
  nome: string;
  // Identificador do catálogo de oito graduações.
  faixa: string;
  // Situação cadastral independente do pagamento das mensalidades.
  situacao: string;
  // Frequência semanal registrada naquela matrícula.
  aulas: number;
  // Modalidade explícita evita identificar personal apenas pelo preço.
  modalidade: "normal" | "personal";
  // Preço histórico inteiro evita imprecisão de valores monetários.
  centavos: number;
  // Nome de apresentação recuperado do vínculo com a conta do professor.
  professor: string;
  // Marca explícita de ambiente fictício; não é escolhida pelo formulário.
  teste: boolean;
  // Quantidade de versões disponíveis, sem conteúdo ou chaves dos arquivos.
  documentos: number;
};
// O seletor recebe apenas professores ativos, por identificador estável.
export type ProfessorOpcao = {
  // Chave da conta ativa usada para conferir o vínculo no servidor.
  id: number;
  // Rótulo do seletor, que não substitui a conferência por ID.
  nome: string;
};
// A configuração de teste é fornecida pelo servidor, nunca escolhida pelo formulário.
export type PainelAlunos = {
  // Somente o servidor decide se a persistência de testes está habilitada.
  habilitado: boolean;
  // Edição e personal dependem da estrutura adicional executada manualmente no Workbench.
  edicaoDisponivel: boolean;
  // Listagem mínima não contém identidade fiscal, contatos ou segurança.
  alunos: AlunoResumo[];
  // Contas ativas com perfil de professor alimentam o formulário.
  professores: ProfessorOpcao[];
  // Uma falha de consulta não deve parecer ausência de cadastros.
  indisponivel?: boolean;
};
// Metadados públicos da área autenticada não contêm chave privada nem nome original do arquivo.
export type DocumentoResumo = {
  // Identificador da versão usado na rota privada com sessão revalidada.
  id: string;
  // Sequência preservada sem sobrescrever versões anteriores.
  versao: number;
  // Classificação administrativa escolhida de lista fechada.
  tipo: string;
  // Tipo técnico conferido pelo conteúdo recebido.
  mime: string;
  // Quantidade de bytes permite mostrar tamanho sem carregar o arquivo.
  tamanho: number;
  // Instante UTC do envio é apresentado no fuso brasileiro.
  criado: string;
  // Só disponível permite abertura; pendência e falha permanecem visíveis.
  estado: string;
};

// Apenas a leitura autenticada da matrícula selecionada devolve estes dados restritos.
export type FichaEdicao = {
  // Matrícula que mantém seus documentos e sua identidade durante a edição.
  matriculaId: string;
  // Versão compartilhada pelo aluno impede sobrescrita por uma ficha antiga.
  versao: number;
  // Campos completos ficam apenas no painel selecionado; não participam da listagem comum.
  dados: import("../demonstracao/enrollment").EnrollmentDraft;
  // Preço contratado é preservado quando não há troca de plano.
  centavos: number;
};
