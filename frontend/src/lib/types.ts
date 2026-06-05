export type TipoUsuario = "INTERNO" | "EXTERNO" | "ADMIN_UNIDADE" | "SUPER_ADMIN";

export type AdminModulos = {
  salas: boolean;
  viaturas: boolean;
};

export type ModulosInstalacao = {
  salas: boolean;
  viaturas: boolean;
};

export const MODULOS_INSTALACAO_PADRAO: ModulosInstalacao = { salas: true, viaturas: true };

export type SessaoUtilizador = {
  id: string;
  nome: string;
  email: string;
  telemovel: string | null;
  tipo: TipoUsuario;
  adminModulos: AdminModulos;
  modulosInstalacao: ModulosInstalacao;
};

export type VisibilidadeSala = "PUBLICO_GERAL" | "COMUNIDADE_ACADEMICA";

export type UnidadeResumo = {
  id: string;
  nome: string;
};

export type Sala = {
  id: string;
  nome: string;
  capacidade: number;
  fotoUrl?: string | null;
  descricao: string;
  localizacao: string;
  recursos: string[];
  mobilidadeReduzida: boolean;
  status: "DISPONIVEL" | "MANUTENCAO" | "INDISPONIVEL";
  visibilidade?: VisibilidadeSala;
  unidadeId?: string;
  unidade?: UnidadeResumo | null;
};

export type EventoCalendario = {
  id: string;
  salaId: string;
  dataInicio: string;
  dataFim: string;
  status: string;
  title: string;
  descricao?: string;
  editable: boolean;
  pedidoReservaId?: string;
  usuario?: { nome: string; email: string };
};

export type OcorrenciaReserva = {
  id: string;
  salaId: string;
  dataInicio: string;
  dataFim: string;
  status: string;
  sala?: Sala;
};

export type ReservaAdmin = {
  id: string;
  titulo: string;
  descricao: string;
  numeroPessoas: number;
  status: string;
  usuarioId: string;
  ocorrencias: OcorrenciaReserva[];
  usuario?: { nome: string; email: string };
};

export type VisibilidadeViatura = VisibilidadeSala;

export type Viatura = {
  id: string;
  nome: string;
  matricula: string;
  marca?: string | null;
  modelo?: string | null;
  cor?: string | null;
  capacidade: number;
  fotoUrl?: string | null;
  descricao?: string;
  localizacao: string;
  recursos: string[];
  status: "DISPONIVEL" | "MANUTENCAO" | "INDISPONIVEL";
  visibilidade?: VisibilidadeViatura;
  unidadeId?: string;
  unidade?: UnidadeResumo | null;
};
