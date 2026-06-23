export type Plataforma = "FACEBOOK" | "INSTAGRAM" | "LINKEDIN" | "TIKTOK";

export type EstadoPublicacao =
  | "RASCUNHO"
  | "AGENDADO"
  | "A_PUBLICAR"
  | "PUBLICADO"
  | "PARCIAL"
  | "FALHOU"
  | "CANCELADO";

export type ContaSocial = {
  id: number;
  plataforma: Plataforma;
  plataforma_nome: string;
  nome_exibicao: string;
  external_id: string;
  token_expira_em: string | null;
  token_expirado: boolean;
  metadata: Record<string, string>;
  ativa: boolean;
  ligada_por_nome: string;
  created_at: string;
};

export type PublicacaoMidia = {
  id: number;
  tipo: "IMAGEM" | "VIDEO";
  ordem: number;
  url: string;
};

export type PublicacaoDestino = {
  id: number;
  plataforma: Plataforma;
  plataforma_nome: string;
  conta: number;
  conta_nome: string;
  estado: string;
  external_post_id: string;
  erro: string;
  publicado_em: string | null;
};

export type PublicacaoLog = {
  id: number;
  nivel: string;
  mensagem: string;
  detalhes: Record<string, unknown>;
  created_at: string;
};

export type PublicacaoEmpresa = {
  id: number;
  nome: string;
};

export type Publicacao = {
  id: number;
  titulo_interno: string;
  texto: string;
  link_url: string;
  estado: EstadoPublicacao;
  agendado_para: string | null;
  publicado_em: string | null;
  criado_por_nome: string;
  midias: PublicacaoMidia[];
  destinos: PublicacaoDestino[];
  empresas: PublicacaoEmpresa[];
  logs: PublicacaoLog[];
  created_at: string;
  updated_at: string;
};

export type CalendarioEvento = {
  id: number;
  titulo: string;
  estado: EstadoPublicacao;
  data: string | null;
  plataformas: Plataforma[];
};

export type CorEstadoPublicacao = {
  id: number;
  codigo: EstadoPublicacao;
  nome: string;
  cor: string;
  ordem: number;
  created_at: string;
};

export type EstatisticasMarketing = {
  por_estado: Record<string, number>;
  por_plataforma: Record<string, number>;
  contas_ligadas: number;
};

export type MetaPagina = {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: { id: string; username?: string };
};

export type LinkedInOrganizacao = {
  id: string;
  urn: string;
  nome: string;
};

export type TikTokPerfil = {
  open_id: string;
  display_name: string;
  avatar_url?: string;
};
