import type { CSSProperties } from "react";

export type TipoEventoConfig = {
  id: number;
  codigo: string;
  nome: string;
  cor: string;
  ordem: number;
  ativo: boolean;
};

export type EventoOrganizacional = {
  id: string;
  title: string;
  dataInicio: string;
  dataFim: string;
  tipo?: string;
  tipoCor?: string;
  tipoNome?: string;
  descricao?: string;
  editable: boolean;
};

export type AnexoEvento = {
  id: number;
  nome_original: string;
  tamanho: number;
  tipo_mime: string;
  url: string;
  carregado_por_nome: string | null;
  created_at: string;
};

export type EventoDetalhe = {
  id: number;
  titulo: string;
  tipo: number;
  tipo_display: string;
  tipo_cor: string;
  tipo_codigo: string;
  data_inicio: string;
  data_fim: string;
  descricao: string;
  particular: boolean;
  anexos: AnexoEvento[];
  passado: boolean;
  editable: boolean;
  created_at: string;
  updated_at: string;
};

export function estiloTipoEvento(cor?: string): CSSProperties | undefined {
  if (!cor) return undefined;
  return {
    backgroundColor: `${cor}22`,
    color: cor,
    borderColor: `${cor}55`,
  };
}

export function classeEventoCalendario(status?: string, title?: string): string {
  if (status === "PENDENTE") return "bg-amber-100 text-amber-800";
  if (title === "Ocupado") return "bg-slate-200 text-slate-700";
  return "border";
}

export function formatarDataHora(value: string) {
  return new Date(value).toLocaleString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function paraDatetimeLocal(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function deDatetimeLocal(value: string) {
  const [datePart, timePart] = value.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const [hh, mm] = (timePart || "00:00").split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm, 0, 0).toISOString();
}

/** Verifica se o evento intersecta o slot horário [hour, hour+1) no dia indicado. */
export function eventoCobreHora(
  dataInicio: string,
  dataFim: string,
  baseDate: Date,
  hour: number
): boolean {
  const inicio = new Date(dataInicio);
  const fim = new Date(dataFim);
  const slotInicio = new Date(baseDate);
  slotInicio.setHours(hour, 0, 0, 0);
  const slotFim = new Date(baseDate);
  slotFim.setHours(hour + 1, 0, 0, 0);
  return inicio < slotFim && fim > slotInicio;
}

export function formatarTamanho(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
