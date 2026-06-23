import type { CSSProperties } from "react";

export type NivelAviso = "INFO" | "ALERTA" | "CRITICO";
export type EstadoOcorrencia = "ABERTA" | "EM_TRATAMENTO" | "FECHADA";

export type AvisoSeguranca = {
  id: number;
  titulo: string;
  conteudo: string;
  nivel: NivelAviso;
  nivelDisplay: string;
  dataInicio: string;
  dataFim: string | null;
  ativo: boolean;
  criadoPorNome?: string | null;
};

export type OcorrenciaSeguranca = {
  id: number;
  titulo: string;
  descricao: string;
  tipoId: number | null;
  tipo: string | null;
  tipoCor: string | null;
  dataHora: string;
  local: string;
  estado: EstadoOcorrencia;
  estadoDisplay: string;
  observacoesResolucao: string;
  registadoPorNome?: string | null;
  dia: string;
};

export type TipoOcorrencia = {
  id: number;
  codigo: string;
  nome: string;
  cor: string;
  ordem: number;
  ativo: boolean;
};

export type EventoSegurancaAgenda = {
  id: number;
  titulo: string;
  tipo: string;
  tipoCor: string;
  dataInicio: string;
  dataFim: string;
  descricao: string;
};

export type AgendaSeguranca = Record<string, EventoSegurancaAgenda[]>;

export const NIVEIS_AVISO: Array<{ value: NivelAviso; label: string; cor: string }> = [
  { value: "INFO", label: "Informação", cor: "bg-blue-100 text-blue-800" },
  { value: "ALERTA", label: "Alerta", cor: "bg-amber-100 text-amber-800" },
  { value: "CRITICO", label: "Crítico", cor: "bg-red-100 text-red-800" },
];

export const ESTADOS_OCORRENCIA: Array<{ value: EstadoOcorrencia; label: string }> = [
  { value: "ABERTA", label: "Aberta" },
  { value: "EM_TRATAMENTO", label: "Em tratamento" },
  { value: "FECHADA", label: "Fechada" },
];

const LISBON_TZ = "Europe/Lisbon";

export function formatarDataHoraSeguranca(value: string) {
  return new Date(value).toLocaleString("pt-PT", {
    timeZone: LISBON_TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatarDiaSeguranca(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("pt-PT", {
    timeZone: LISBON_TZ,
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function nivelAvisoClasse(nivel: NivelAviso): string {
  return NIVEIS_AVISO.find((n) => n.value === nivel)?.cor ?? "bg-slate-100 text-slate-800";
}

export function estiloTipoOcorrencia(cor?: string | null): CSSProperties | undefined {
  if (!cor) return undefined;
  return {
    backgroundColor: `${cor}22`,
    color: cor,
    borderColor: `${cor}55`,
  };
}

export function toDatetimeLocal(value: string): string {
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromDatetimeLocal(value: string): string {
  return new Date(value).toISOString();
}
