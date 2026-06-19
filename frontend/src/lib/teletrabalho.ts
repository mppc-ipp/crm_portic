import type { CsvColumn } from "@/lib/exportCsv";

export type TipoRegistoTeletrabalho =
  | "ENTRADA_MANHA"
  | "SAIDA_MANHA"
  | "ENTRADA_TARDE"
  | "SAIDA_TARDE";

export type RegistoTeletrabalho = {
  id: number;
  tipo: TipoRegistoTeletrabalho;
  tipo_label: string;
  observacao: string;
  registrado_em: string;
  dia: string;
  utilizador_id?: number;
  utilizador_nome?: string;
};

export const TIPOS_REGISTO: Array<{ value: TipoRegistoTeletrabalho; label: string }> = [
  { value: "ENTRADA_MANHA", label: "Entrada manhã" },
  { value: "SAIDA_MANHA", label: "Saída manhã" },
  { value: "ENTRADA_TARDE", label: "Entrada tarde" },
  { value: "SAIDA_TARDE", label: "Saída tarde" },
];

const LISBON_TZ = "Europe/Lisbon";

export function formatarDataHoraPortugal(value: string) {
  return new Date(value).toLocaleString("pt-PT", {
    timeZone: LISBON_TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatarDiaPortugal(value: string) {
  return new Date(value).toLocaleDateString("pt-PT", {
    timeZone: LISBON_TZ,
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function agruparPorDia(registos: RegistoTeletrabalho[]): Record<string, RegistoTeletrabalho[]> {
  return registos.reduce<Record<string, RegistoTeletrabalho[]>>((acc, reg) => {
    const dia = reg.dia;
    if (!acc[dia]) acc[dia] = [];
    acc[dia].push(reg);
    return acc;
  }, {});
}

export const COLUNAS_CSV_GESTAO: CsvColumn<RegistoTeletrabalho>[] = [
  { key: "dia", header: "Dia" },
  { key: "utilizador_nome", header: "Utilizador" },
  { key: "tipo_label", header: "Tipo" },
  {
    key: "registrado_em",
    header: "Hora",
    format: (r) => formatarDataHoraPortugal(r.registrado_em),
  },
  { key: "observacao", header: "Observação" },
];

export function nomeFicheiroCsvGestao(filtros: { dia?: string; periodo?: string }) {
  const partes = ["teletrabalho"];
  if (filtros.dia) partes.push(filtros.dia);
  if (filtros.periodo) partes.push(filtros.periodo);
  return `${partes.join("_")}.csv`;
}
