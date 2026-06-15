export type Subtarefa = {
  id: number;
  titulo: string;
  concluida: boolean;
  ordem: number;
};

export type Comentario = {
  id: number;
  texto: string;
  autor: number | null;
  autor_nome: string;
  created_at: string;
};

export type Dependencia = {
  id: number;
  predecessora: number;
  sucessora: number;
  predecessora_titulo: string;
  sucessora_titulo: string;
};

export type CampoPersonalizado = {
  id: number;
  nome: string;
  tipo: "TEXTO" | "NUMERO" | "DATA";
  opcoes: string[];
  ordem: number;
};

export type ValorCampo = {
  id: number;
  campo: number;
  campo_nome: string;
  campo_tipo: string;
  valor_texto: string;
  valor_numero: number | null;
  valor_data: string | null;
};

export type Objetivo = {
  id: number;
  secao_id: number;
  titulo: string;
  descricao: string;
  data_inicio: string | null;
  data_limite: string | null;
  estado: string;
  ordem: number;
  responsavel: number | null;
  responsavel_email?: string | null;
  responsavel_nome: string | null;
  subtarefas_total?: number;
  subtarefas_concluidas?: number;
  comentarios_total?: number;
  subtarefas?: Subtarefa[];
  comentarios?: Comentario[];
  dependencias_entrada?: Dependencia[];
  dependencias_saida?: Dependencia[];
  valores_campos?: ValorCampo[];
};

export type Secao = {
  id: number;
  nome: string;
  ordem: number;
  objetivos: Objetivo[];
};

export type VistaGuardada = {
  id: number;
  nome: string;
  tipo_vista: VistaProjeto;
  filtros: Record<string, string>;
  padrao: boolean;
};

export type MembroProjeto = {
  id: number;
  email: string;
  utilizador: number | null;
  nome: string | null;
  tem_cadastro: boolean;
};

export type Projeto = {
  id: number;
  nome: string;
  resumo: string;
  estado: string;
  arquivado?: boolean;
  cor?: string;
  responsavel?: number | null;
  responsavel_nome?: string | null;
  membros?: MembroProjeto[];
  secoes: Secao[];
  campos_personalizados?: CampoPersonalizado[];
  vistas_guardadas?: VistaGuardada[];
};

export type Utilizador = {
  id: number;
  nome: string;
  username: string;
  email: string;
};

/** Opção de atribuição: utilizador cadastrado (u:) ou membro por email (e:). */
export type Atribuivel = {
  key: string;
  label: string;
  tem_cadastro: boolean;
};

export type VistaProjeto = "lista" | "quadro" | "calendario" | "timeline";

export type Atividade = {
  id: number;
  acao: string;
  descricao: string;
  utilizador_nome: string;
  objetivo_titulo: string | null;
  created_at: string;
};

export type TimelineTarefa = {
  id: number;
  titulo: string;
  estado: string;
  data_inicio: string | null;
  data_limite: string | null;
  responsavel_nome: string | null;
  secao_nome: string;
};

export type TimelineData = {
  tarefas: TimelineTarefa[];
  dependencias: Array<{ id: number; predecessora_id: number; sucessora_id: number }>;
};
