export function dominioLink(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function inicialNome(nome: string): string {
  return (nome.trim()[0] || "?").toUpperCase();
}

export const NOMES_PADRAO = {
  FACEBOOK: "A sua página",
  INSTAGRAM: "utilizador",
  LINKEDIN: "A sua organização",
  TIKTOK: "@utilizador",
} as const;
