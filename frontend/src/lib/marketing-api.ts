import { apiFetch, API_URL, withAuthHeaders } from "@/lib/api";
import type {
  CalendarioEvento,
  ContaSocial,
  EstatisticasMarketing,
  LinkedInOrganizacao,
  MetaPagina,
  Publicacao,
} from "@/components/marketing/types";

export async function listarPublicacoes(params?: Record<string, string>) {
  const qs = params ? `?${new URLSearchParams(params)}` : "";
  return apiFetch<Publicacao[]>(`/api/marketing/publicacoes${qs}`);
}

export async function obterPublicacao(id: number) {
  return apiFetch<Publicacao>(`/api/marketing/publicacoes/${id}`);
}

export async function criarPublicacao(payload: Record<string, unknown>) {
  return apiFetch<Publicacao>("/api/marketing/publicacoes", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function actualizarPublicacao(id: number, payload: Record<string, unknown>) {
  return apiFetch<Publicacao>(`/api/marketing/publicacoes/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function eliminarPublicacao(id: number) {
  return apiFetch(`/api/marketing/publicacoes/${id}`, { method: "DELETE" });
}

export async function publicarAgora(id: number) {
  return apiFetch<Publicacao>(`/api/marketing/publicacoes/${id}/publicar`, { method: "POST" });
}

export async function agendarPublicacao(id: number, agendado_para: string) {
  return apiFetch<Publicacao>(`/api/marketing/publicacoes/${id}/agendar`, {
    method: "POST",
    body: JSON.stringify({ agendado_para }),
  });
}

export async function cancelarAgendamento(id: number) {
  return apiFetch<Publicacao>(`/api/marketing/publicacoes/${id}/cancelar`, { method: "POST" });
}

export async function republicar(id: number) {
  return apiFetch<Publicacao>(`/api/marketing/publicacoes/${id}/republicar`, { method: "POST" });
}

export async function listarContas() {
  return apiFetch<ContaSocial[]>("/api/marketing/contas");
}

export async function desligarConta(id: number) {
  return apiFetch(`/api/marketing/contas/${id}`, { method: "DELETE" });
}

export async function obterCalendario(de?: string, ate?: string) {
  const params = new URLSearchParams();
  if (de) params.set("de", de);
  if (ate) params.set("ate", ate);
  const qs = params.toString() ? `?${params}` : "";
  return apiFetch<{ eventos: CalendarioEvento[] }>(`/api/marketing/calendario${qs}`);
}

export async function obterEstatisticas() {
  return apiFetch<EstatisticasMarketing>("/api/marketing/estatisticas");
}

export async function uploadMedia(ficheiro: File, publicacaoId?: number, ordem = 0) {
  const form = new FormData();
  form.append("ficheiro", ficheiro);
  if (publicacaoId) form.append("publicacao_id", String(publicacaoId));
  form.append("ordem", String(ordem));
  form.append("tipo", ficheiro.type.startsWith("video/") ? "VIDEO" : "IMAGEM");

  const res = await fetch(`${API_URL}/api/marketing/media`, {
    method: "POST",
    headers: withAuthHeaders(),
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || "Falha no upload");
  }
  return res.json() as Promise<{ publicacao_id: number; midia: { id: number; url: string } }>;
}

export async function iniciarOAuthMeta() {
  const data = await apiFetch<{ url: string }>("/api/marketing/oauth/meta/start");
  window.location.href = data.url;
}

export async function iniciarOAuthLinkedIn() {
  const data = await apiFetch<{ url: string }>("/api/marketing/oauth/linkedin/start");
  window.location.href = data.url;
}

export async function listarPaginasMeta() {
  return apiFetch<{ paginas: MetaPagina[] }>("/api/marketing/contas/disponiveis/meta");
}

export async function listarOrgsLinkedIn() {
  return apiFetch<{ organizacoes: LinkedInOrganizacao[] }>(
    "/api/marketing/contas/disponiveis/linkedin"
  );
}

export async function ligarContaMeta(payload: Record<string, string>) {
  return apiFetch<ContaSocial[]>("/api/marketing/oauth/meta/ligar", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function ligarContaLinkedIn(payload: Record<string, string>) {
  return apiFetch<ContaSocial>("/api/marketing/oauth/linkedin/ligar", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
