export type EstadoViatura = "ATIVO" | "INATIVO" | "MANUTENCAO";

export type ViaturaCrm = {
  id: number;
  matricula: string;
  marca: string;
  modelo: string;
  cor: string;
  ano: number | null;
  dono: string;
  telemovel: string;
  sala: string;
  fotoUrl: string | null;
  descricao: string;
  observacoes: string;
  estado: EstadoViatura;
  estadoDisplay: string;
  ativo: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export const ESTADOS_VIATURA: Array<{ value: EstadoViatura; label: string }> = [
  { value: "ATIVO", label: "Ativo" },
  { value: "INATIVO", label: "Inativo" },
  { value: "MANUTENCAO", label: "Em manutenção" },
];

export function identificacaoViatura(v: Pick<ViaturaCrm, "marca" | "modelo" | "matricula">): string {
  const partes = [v.marca?.trim(), v.modelo?.trim(), v.matricula?.trim()].filter(Boolean);
  return partes.length ? partes.join(" · ") : v.matricula;
}

export function viaturaFormData(
  dados: {
    matricula: string;
    marca?: string;
    modelo?: string;
    cor?: string;
    ano?: string;
    dono?: string;
    telemovel?: string;
    sala?: string;
    descricao?: string;
    observacoes?: string;
    estado?: EstadoViatura;
  },
  foto?: File | null
): FormData {
  const form = new FormData();
  form.append("matricula", dados.matricula.trim().toUpperCase());
  form.append("marca", dados.marca?.trim() ?? "");
  form.append("modelo", dados.modelo?.trim() ?? "");
  form.append("cor", dados.cor?.trim() ?? "");
  if (dados.ano?.trim()) form.append("ano", dados.ano.trim());
  form.append("dono", dados.dono?.trim() ?? "");
  form.append("telemovel", dados.telemovel?.trim() ?? "");
  form.append("sala", dados.sala?.trim() ?? "");
  form.append("descricao", dados.descricao?.trim() ?? "");
  form.append("observacoes", dados.observacoes?.trim() ?? "");
  form.append("estado", dados.estado ?? "ATIVO");
  if (foto) form.append("foto", foto);
  return form;
}
