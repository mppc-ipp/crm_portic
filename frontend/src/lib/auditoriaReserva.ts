export type TipoReservaAuditoria = "sala" | "viatura";

export type ReservaAuditoriaMetadata = {
  tituloReserva?: string;
  pedidoCriadoEm?: string;
  salas?: string[];
  viaturas?: string[];
  ocorrencias?: Array<{
    sala?: string;
    viatura?: string;
    dataInicio?: string;
    dataFim?: string;
  }>;
  usuarioCriador?: {
    id?: string;
    nome?: string;
    email?: string;
  };
};

export function tipoReservaFromEntidade(entidade: string): TipoReservaAuditoria | null {
  if (entidade === "RESERVA") return "sala";
  if (entidade === "RESERVA_VIATURA") return "viatura";
  return null;
}

export function metadataReservaAuditoria(metadata: unknown): ReservaAuditoriaMetadata | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  return metadata as ReservaAuditoriaMetadata;
}

export function formatarDataHoraAuditoria(valor?: string) {
  if (!valor) return "Não informado";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "Não informado";
  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(data);
}
