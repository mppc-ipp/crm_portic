export const LOCALIZACAO_VIATURA_GERAL = "Geral";

export function localizacaoViaturaParaGuardar(valor: string | null | undefined): string {
  const texto = String(valor ?? "").trim();
  return texto || LOCALIZACAO_VIATURA_GERAL;
}

export function localizacaoViaturaParaFormulario(valor: string | null | undefined): string {
  const texto = String(valor ?? "").trim();
  if (!texto || texto.toLowerCase() === LOCALIZACAO_VIATURA_GERAL.toLowerCase()) return "";
  return texto;
}

export function viaturaLinhaIdentificacao(v: {
  marca?: string | null;
  modelo?: string | null;
  matricula?: string | null;
}): string | null {
  const partes = [v.marca?.trim(), v.modelo?.trim(), v.matricula?.trim()].filter(Boolean) as string[];
  return partes.length ? partes.join(" · ") : null;
}

export function viaturaDetalhesInfo(v: {
  capacidade?: number;
  cor?: string | null;
  localizacao?: string | null;
  recursos?: string[];
  unidade?: { nome?: string } | null;
}): string[] {
  const linhas: string[] = [];
  if (v.capacidade != null) linhas.push(`Capacidade: ${v.capacidade} pessoa(s)`);
  if (v.cor?.trim()) linhas.push(`Cor: ${v.cor.trim()}`);
  if (v.localizacao?.trim()) linhas.push(`Localização: ${v.localizacao.trim()}`);
  if (v.unidade?.nome) linhas.push(`Unidade: ${v.unidade.nome}`);
  if (v.recursos?.length) linhas.push(`Recursos: ${v.recursos.join(", ")}`);
  return linhas;
}
