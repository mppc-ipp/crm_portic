export const COR_PROJETO_PADRAO = "#1e3a5f";

export const PALETA_CORES = [
  { cor: "#1e3a5f", label: "Portic" },
  { cor: "#0369a1", label: "Oceano" },
  { cor: "#0d9488", label: "Turquesa" },
  { cor: "#059669", label: "Esmeralda" },
  { cor: "#7c3aed", label: "Violeta" },
  { cor: "#db2777", label: "Rosa" },
  { cor: "#dc2626", label: "Vermelho" },
  { cor: "#ea580c", label: "Laranja" },
  { cor: "#ca8a04", label: "Âmbar" },
  { cor: "#475569", label: "Ardósia" },
] as const;

function clamp(n: number) {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function parseHex(hex: string): [number, number, number] | null {
  const h = hex.replace("#", "").trim();
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h.length === 6
        ? h
        : null;
  if (!full || !/^[0-9a-fA-F]{6}$/.test(full)) return null;
  const num = parseInt(full, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

export function lightenHex(hex: string, amount = 28): string {
  const rgb = parseHex(hex);
  if (!rgb) return COR_PROJETO_PADRAO;
  const [r, g, b] = rgb.map((c) => clamp(c + amount));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export function normalizarCor(hex: string | undefined | null): string {
  if (!hex) return COR_PROJETO_PADRAO;
  return parseHex(hex) ? hex : COR_PROJETO_PADRAO;
}

export function buildThemeStyle(cor: string): Record<string, string> {
  const primary = normalizarCor(cor);
  const hover = lightenHex(primary);
  return {
    "--proj-primary": primary,
    "--proj-primary-hover": hover,
  };
}
