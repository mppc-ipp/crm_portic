import type { Plataforma } from "@/components/marketing/types";

export type TipoMidia = "IMAGEM" | "VIDEO";

export type MediaInfo = {
  tipo: TipoMidia;
  width: number;
  height: number;
  durationSec?: number;
  sizeBytes: number;
  mimeType: string;
  fileName: string;
};

export type MediaValidationIssue = {
  plataforma: Plataforma;
  nivel: "erro" | "aviso";
  mensagem: string;
};

export const NOMES_PLATAFORMA: Record<Plataforma, string> = {
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  LINKEDIN: "LinkedIn",
  TIKTOK: "TikTok",
};

const MB = 1024 * 1024;

function aspectRatio(w: number, h: number): number {
  return w / h;
}

function formatarTamanho(bytes: number): string {
  if (bytes >= MB) return `${(bytes / MB).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

function formatarDuracao(seg: number): string {
  const m = Math.floor(seg / 60);
  const s = Math.round(seg % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function mimeCompat(mime: string, permitidos: string[]): boolean {
  const base = mime.toLowerCase().split(";")[0].trim();
  return permitidos.some((p) => base === p || base.endsWith(p.replace("*", "")));
}

function validarFacebook(info: MediaInfo): MediaValidationIssue[] {
  const issues: MediaValidationIssue[] = [];
  const ratio = aspectRatio(info.width, info.height);

  if (info.tipo === "IMAGEM") {
    if (!mimeCompat(info.mimeType, ["image/jpeg", "image/png", "image/gif", "image/webp", "image/bmp"])) {
      issues.push({
        plataforma: "FACEBOOK",
        nivel: "erro",
        mensagem: "Formato não suportado (use JPEG, PNG, GIF ou WebP)",
      });
    }
    if (info.sizeBytes > 30 * MB) {
      issues.push({
        plataforma: "FACEBOOK",
        nivel: "erro",
        mensagem: `Ficheiro demasiado grande (${formatarTamanho(info.sizeBytes)}; máx. 30 MB)`,
      });
    }
    if (info.width < 600 || info.height < 315) {
      issues.push({
        plataforma: "FACEBOOK",
        nivel: "aviso",
        mensagem: `Resolução baixa (${info.width}×${info.height}; recomendado mín. 600×315 px)`,
      });
    }
    if (ratio < 0.56 || ratio > 1.78) {
      issues.push({
        plataforma: "FACEBOOK",
        nivel: "aviso",
        mensagem: `Proporção ${ratio.toFixed(2)}:1 fora do ideal (9:16 a 16:9)`,
      });
    }
  } else {
    if (!mimeCompat(info.mimeType, ["video/mp4", "video/quicktime", "video/x-msvideo"])) {
      issues.push({
        plataforma: "FACEBOOK",
        nivel: "erro",
        mensagem: "Formato de vídeo não suportado (use MP4 ou MOV)",
      });
    }
    if (info.sizeBytes > 4 * 1024 * MB) {
      issues.push({
        plataforma: "FACEBOOK",
        nivel: "erro",
        mensagem: `Vídeo demasiado grande (${formatarTamanho(info.sizeBytes)}; máx. 4 GB)`,
      });
    }
    if (info.durationSec !== undefined && info.durationSec < 1) {
      issues.push({
        plataforma: "FACEBOOK",
        nivel: "erro",
        mensagem: "Vídeo demasiado curto (mín. 1 segundo)",
      });
    }
    if (info.durationSec !== undefined && info.durationSec > 240 * 60) {
      issues.push({
        plataforma: "FACEBOOK",
        nivel: "erro",
        mensagem: `Vídeo demasiado longo (${formatarDuracao(info.durationSec)}; máx. 240 min)`,
      });
    }
    if (ratio < 0.56 || ratio > 1.78) {
      issues.push({
        plataforma: "FACEBOOK",
        nivel: "aviso",
        mensagem: `Proporção ${ratio.toFixed(2)}:1 fora do ideal (9:16 a 16:9)`,
      });
    }
  }

  return issues;
}

function validarInstagram(info: MediaInfo): MediaValidationIssue[] {
  const issues: MediaValidationIssue[] = [];
  const ratio = aspectRatio(info.width, info.height);

  if (info.tipo === "IMAGEM") {
    if (!mimeCompat(info.mimeType, ["image/jpeg", "image/png"])) {
      issues.push({
        plataforma: "INSTAGRAM",
        nivel: "erro",
        mensagem: "Formato não suportado (use JPEG ou PNG)",
      });
    }
    if (info.sizeBytes > 8 * MB) {
      issues.push({
        plataforma: "INSTAGRAM",
        nivel: "erro",
        mensagem: `Ficheiro demasiado grande (${formatarTamanho(info.sizeBytes)}; máx. 8 MB)`,
      });
    }
    if (info.width < 320) {
      issues.push({
        plataforma: "INSTAGRAM",
        nivel: "erro",
        mensagem: `Largura mínima 320 px (actual: ${info.width} px)`,
      });
    }
    if (info.width > 1440) {
      issues.push({
        plataforma: "INSTAGRAM",
        nivel: "aviso",
        mensagem: `Largura ${info.width} px será reduzida (máx. recomendado 1440 px)`,
      });
    }
    if (ratio < 0.8 || ratio > 1.91) {
      issues.push({
        plataforma: "INSTAGRAM",
        nivel: "aviso",
        mensagem: `Proporção ${ratio.toFixed(2)}:1 fora do feed (4:5 a 1.91:1; ex.: 1080×1080 ou 1080×1350)`,
      });
    }
  } else {
    if (!mimeCompat(info.mimeType, ["video/mp4", "video/quicktime"])) {
      issues.push({
        plataforma: "INSTAGRAM",
        nivel: "erro",
        mensagem: "Formato de vídeo não suportado (use MP4 ou MOV)",
      });
    }
    if (info.sizeBytes > 100 * MB) {
      issues.push({
        plataforma: "INSTAGRAM",
        nivel: "erro",
        mensagem: `Vídeo demasiado grande (${formatarTamanho(info.sizeBytes)}; máx. 100 MB no feed)`,
      });
    }
    if (info.durationSec !== undefined && info.durationSec < 3) {
      issues.push({
        plataforma: "INSTAGRAM",
        nivel: "erro",
        mensagem: "Vídeo demasiado curto (mín. 3 segundos)",
      });
    }
    if (info.durationSec !== undefined && info.durationSec > 60) {
      issues.push({
        plataforma: "INSTAGRAM",
        nivel: "aviso",
        mensagem: `Vídeo com ${formatarDuracao(info.durationSec)} — feed aceita até ~60 s; Reels até 90 s`,
      });
    }
    if (ratio < 0.8 || ratio > 1.91) {
      issues.push({
        plataforma: "INSTAGRAM",
        nivel: "aviso",
        mensagem: `Proporção ${ratio.toFixed(2)}:1 fora do feed (4:5 a 1.91:1); Reels: 9:16`,
      });
    }
  }

  return issues;
}

function validarLinkedIn(info: MediaInfo): MediaValidationIssue[] {
  const issues: MediaValidationIssue[] = [];
  const ratio = aspectRatio(info.width, info.height);

  if (info.tipo === "IMAGEM") {
    if (!mimeCompat(info.mimeType, ["image/jpeg", "image/png", "image/gif"])) {
      issues.push({
        plataforma: "LINKEDIN",
        nivel: "erro",
        mensagem: "Formato não suportado (use JPEG, PNG ou GIF)",
      });
    }
    if (info.sizeBytes > 5 * MB) {
      issues.push({
        plataforma: "LINKEDIN",
        nivel: "erro",
        mensagem: `Ficheiro demasiado grande (${formatarTamanho(info.sizeBytes)}; máx. 5 MB)`,
      });
    }
    if (info.width < 552 || info.height < 276) {
      issues.push({
        plataforma: "LINKEDIN",
        nivel: "aviso",
        mensagem: `Resolução baixa (${info.width}×${info.height}; recomendado mín. 1200×627 px)`,
      });
    }
    if (ratio < 0.42 || ratio > 2.4) {
      issues.push({
        plataforma: "LINKEDIN",
        nivel: "aviso",
        mensagem: `Proporção ${ratio.toFixed(2)}:1 fora do ideal (1:2.4 a 2.4:1; link: 1.91:1)`,
      });
    }
  } else {
    if (!mimeCompat(info.mimeType, ["video/mp4"])) {
      issues.push({
        plataforma: "LINKEDIN",
        nivel: "erro",
        mensagem: "Formato de vídeo não suportado (use MP4)",
      });
    }
    if (info.sizeBytes > 200 * MB) {
      issues.push({
        plataforma: "LINKEDIN",
        nivel: "erro",
        mensagem: `Vídeo demasiado grande (${formatarTamanho(info.sizeBytes)}; máx. 200 MB)`,
      });
    }
    if (info.sizeBytes < 75 * 1024) {
      issues.push({
        plataforma: "LINKEDIN",
        nivel: "aviso",
        mensagem: "Vídeo muito pequeno (mín. recomendado 75 KB)",
      });
    }
    if (info.durationSec !== undefined && info.durationSec < 3) {
      issues.push({
        plataforma: "LINKEDIN",
        nivel: "erro",
        mensagem: "Vídeo demasiado curto (mín. 3 segundos)",
      });
    }
    if (info.durationSec !== undefined && info.durationSec > 30 * 60) {
      issues.push({
        plataforma: "LINKEDIN",
        nivel: "erro",
        mensagem: `Vídeo demasiado longo (${formatarDuracao(info.durationSec)}; máx. 30 min)`,
      });
    }
    if (ratio < 0.42 || ratio > 2.4) {
      issues.push({
        plataforma: "LINKEDIN",
        nivel: "aviso",
        mensagem: `Proporção ${ratio.toFixed(2)}:1 fora do ideal (1:2.4 a 2.4:1)`,
      });
    }
  }

  return issues;
}

function validarTikTok(info: MediaInfo): MediaValidationIssue[] {
  const issues: MediaValidationIssue[] = [];
  const ratio = aspectRatio(info.width, info.height);

  if (info.tipo === "IMAGEM") {
    issues.push({
      plataforma: "TIKTOK",
      nivel: "erro",
      mensagem: "TikTok só aceita vídeo (não imagens)",
    });
    return issues;
  }

  if (!mimeCompat(info.mimeType, ["video/mp4", "video/quicktime", "video/webm"])) {
    issues.push({
      plataforma: "TIKTOK",
      nivel: "erro",
      mensagem: "Formato de vídeo não suportado (use MP4, MOV ou WebM)",
    });
  }
  if (info.sizeBytes > 287 * MB) {
    issues.push({
      plataforma: "TIKTOK",
      nivel: "erro",
      mensagem: `Vídeo demasiado grande (${formatarTamanho(info.sizeBytes)}; máx. 287 MB)`,
    });
  }
  if (info.durationSec !== undefined && info.durationSec < 3) {
    issues.push({
      plataforma: "TIKTOK",
      nivel: "erro",
      mensagem: "Vídeo demasiado curto (mín. 3 segundos)",
    });
  }
  if (info.durationSec !== undefined && info.durationSec > 10 * 60) {
    issues.push({
      plataforma: "TIKTOK",
      nivel: "erro",
      mensagem: `Vídeo demasiado longo (${formatarDuracao(info.durationSec)}; máx. 10 min)`,
    });
  }
  if (info.width < 540 || info.height < 960) {
    issues.push({
      plataforma: "TIKTOK",
      nivel: "aviso",
      mensagem: `Resolução baixa (${info.width}×${info.height}; recomendado 1080×1920 px, 9:16)`,
    });
  }
  const is916 = ratio >= 0.52 && ratio <= 0.6;
  const is11 = ratio >= 0.95 && ratio <= 1.05;
  const is169 = ratio >= 1.7 && ratio <= 1.8;
  if (!is916 && !is11 && !is169) {
    issues.push({
      plataforma: "TIKTOK",
      nivel: "aviso",
      mensagem: `Proporção ${ratio.toFixed(2)}:1 fora do ideal (9:16, 1:1 ou 16:9)`,
    });
  }

  return issues;
}

const VALIDADORES: Record<Plataforma, (info: MediaInfo) => MediaValidationIssue[]> = {
  FACEBOOK: validarFacebook,
  INSTAGRAM: validarInstagram,
  LINKEDIN: validarLinkedIn,
  TIKTOK: validarTikTok,
};

export function validarMidiaParaPlataformas(
  info: MediaInfo,
  plataformas: Plataforma[]
): MediaValidationIssue[] {
  if (plataformas.length === 0) return [];
  return plataformas.flatMap((p) => VALIDADORES[p](info));
}

export function validarCarrossel(
  totalImagens: number,
  plataformas: Plataforma[]
): MediaValidationIssue[] {
  const issues: MediaValidationIssue[] = [];
  if (plataformas.includes("INSTAGRAM") && totalImagens > 10) {
    issues.push({
      plataforma: "INSTAGRAM",
      nivel: "erro",
      mensagem: `Carrossel com ${totalImagens} imagens (máx. 10 no Instagram)`,
    });
  }
  if (plataformas.includes("FACEBOOK") && totalImagens > 10) {
    issues.push({
      plataforma: "FACEBOOK",
      nivel: "erro",
      mensagem: `Carrossel com ${totalImagens} imagens (máx. 10 no Facebook)`,
    });
  }
  if (plataformas.includes("LINKEDIN") && totalImagens > 9) {
    issues.push({
      plataforma: "LINKEDIN",
      nivel: "erro",
      mensagem: `Carrossel com ${totalImagens} imagens (máx. 9 no LinkedIn)`,
    });
  }
  return issues;
}

/** Carrossel Instagram: 2–10 imagens com a mesma proporção. */
export function validarCarrosselInstagram(
  infos: MediaInfo[],
  plataformas: Plataforma[]
): MediaValidationIssue[] {
  if (!plataformas.includes("INSTAGRAM")) return [];
  const imagens = infos.filter((i) => i.tipo === "IMAGEM");
  if (imagens.length < 2) return [];

  const issues: MediaValidationIssue[] = [];
  const ratios = imagens.map((i) => aspectRatio(i.width, i.height));
  const base = ratios[0];
  const inconsistente = ratios.some((r) => Math.abs(r - base) > 0.05);
  if (inconsistente) {
    issues.push({
      plataforma: "INSTAGRAM",
      nivel: "erro",
      mensagem: "Carrossel: todas as imagens devem ter a mesma proporção",
    });
  }
  return issues;
}

export function validarMixMidias(
  infos: MediaInfo[],
  plataformas: Plataforma[]
): MediaValidationIssue[] {
  const issues: MediaValidationIssue[] = [];
  const temVideo = infos.some((i) => i.tipo === "VIDEO");
  const temImagem = infos.some((i) => i.tipo === "IMAGEM");

  if (temVideo && temImagem && plataformas.includes("INSTAGRAM")) {
    issues.push({
      plataforma: "INSTAGRAM",
      nivel: "erro",
      mensagem: "Não pode misturar imagens e vídeo na mesma publicação",
    });
  }
  if (temVideo && temImagem && plataformas.includes("FACEBOOK")) {
    issues.push({
      plataforma: "FACEBOOK",
      nivel: "erro",
      mensagem: "Não pode misturar imagens e vídeo na mesma publicação",
    });
  }
  if (temVideo && temImagem && plataformas.includes("LINKEDIN")) {
    issues.push({
      plataforma: "LINKEDIN",
      nivel: "erro",
      mensagem: "Não pode misturar imagens e vídeo na mesma publicação",
    });
  }
  if (temImagem && plataformas.includes("TIKTOK")) {
    issues.push({
      plataforma: "TIKTOK",
      nivel: "erro",
      mensagem: "TikTok não aceita imagens — remova as fotos ou desmarque o TikTok",
    });
  }
  return issues;
}

export function estadoPlataforma(
  plataforma: Plataforma,
  issues: MediaValidationIssue[]
): "ok" | "aviso" | "erro" {
  const daPlataforma = issues.filter((i) => i.plataforma === plataforma);
  if (daPlataforma.some((i) => i.nivel === "erro")) return "erro";
  if (daPlataforma.some((i) => i.nivel === "aviso")) return "aviso";
  return "ok";
}

export function agruparIssuesPorPlataforma(
  issues: MediaValidationIssue[]
): Partial<Record<Plataforma, MediaValidationIssue[]>> {
  const map: Partial<Record<Plataforma, MediaValidationIssue[]>> = {};
  for (const issue of issues) {
    map[issue.plataforma] = [...(map[issue.plataforma] ?? []), issue];
  }
  return map;
}

export function issuesRequisitosMidia(
  plataforma: Plataforma,
  midias: { tipo: string }[]
): MediaValidationIssue[] {
  const issues: MediaValidationIssue[] = [];
  if (plataforma === "INSTAGRAM" && !midias.some((m) => m.tipo === "IMAGEM")) {
    issues.push({
      plataforma: "INSTAGRAM",
      nivel: "erro",
      mensagem: "Exige pelo menos uma imagem",
    });
  }
  if (plataforma === "TIKTOK" && !midias.some((m) => m.tipo === "VIDEO")) {
    issues.push({
      plataforma: "TIKTOK",
      nivel: "erro",
      mensagem: "Exige pelo menos um vídeo",
    });
  }
  return issues;
}

export function issuesDaPlataforma(
  plataforma: Plataforma,
  validacoes: { issues: MediaValidationIssue[] }[],
  issuesGlobais: MediaValidationIssue[]
): MediaValidationIssue[] {
  return [
    ...issuesGlobais.filter((i) => i.plataforma === plataforma),
    ...validacoes.flatMap((v) => v.issues.filter((i) => i.plataforma === plataforma)),
  ];
}

export function errosBloqueantes(
  plataformas: Plataforma[],
  validacoes: { issues: MediaValidationIssue[] }[],
  issuesGlobais: MediaValidationIssue[],
  midias: { tipo: string }[] = []
): MediaValidationIssue[] {
  if (plataformas.length === 0) return [];
  const requisitos = plataformas.flatMap((p) => issuesRequisitosMidia(p, midias));
  return [
    ...requisitos,
    ...issuesGlobais,
    ...validacoes.flatMap((v) => v.issues),
  ].filter((i) => plataformas.includes(i.plataforma) && i.nivel === "erro");
}

function lerDimensoesImagem(ficheiro: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(ficheiro);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não foi possível ler a imagem"));
    };
    img.src = url;
  });
}

function lerDimensoesVideo(
  ficheiro: File
): Promise<{ width: number; height: number; durationSec: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(ficheiro);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve({
        width: video.videoWidth,
        height: video.videoHeight,
        durationSec: video.duration,
      });
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não foi possível ler o vídeo"));
    };
    video.src = url;
  });
}

export async function lerInfoMidiaFromUrl(url: string, tipo: TipoMidia): Promise<MediaInfo> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Não foi possível carregar a mídia");
  const blob = await res.blob();
  const ext = tipo === "VIDEO" ? "mp4" : "jpg";
  const file = new File([blob], `media.${ext}`, { type: blob.type || (tipo === "VIDEO" ? "video/mp4" : "image/jpeg") });
  return lerInfoMidia(file);
}

export async function lerInfoMidia(ficheiro: File): Promise<MediaInfo> {
  const tipo: TipoMidia = ficheiro.type.startsWith("video/") ? "VIDEO" : "IMAGEM";
  const base = {
    tipo,
    sizeBytes: ficheiro.size,
    mimeType: ficheiro.type || "application/octet-stream",
    fileName: ficheiro.name,
  };

  if (tipo === "IMAGEM") {
    const { width, height } = await lerDimensoesImagem(ficheiro);
    return { ...base, width, height };
  }

  const { width, height, durationSec } = await lerDimensoesVideo(ficheiro);
  return { ...base, width, height, durationSec };
}

export function formatarAlertaMidia(
  ficheiro: string,
  issues: MediaValidationIssue[]
): string {
  const porPlataforma = new Map<Plataforma, MediaValidationIssue[]>();
  for (const issue of issues) {
    const lista = porPlataforma.get(issue.plataforma) ?? [];
    lista.push(issue);
    porPlataforma.set(issue.plataforma, lista);
  }

  const linhas = [`«${ficheiro}» não cumpre os requisitos:\n`];
  for (const [plataforma, lista] of porPlataforma) {
    linhas.push(`${NOMES_PLATAFORMA[plataforma]}:`);
    for (const item of lista) {
      const prefix = item.nivel === "erro" ? "✗" : "⚠";
      linhas.push(`  ${prefix} ${item.mensagem}`);
    }
    linhas.push("");
  }
  return linhas.join("\n").trim();
}

export const REQUISITOS_RESUMO: Record<Plataforma, { imagem: string; video: string }> = {
  FACEBOOK: {
    imagem: "Carrossel: até 10 fotos JPEG/PNG/GIF/WebP",
    video: "MP4/MOV, máx. 4 GB (não misturar com fotos no carrossel)",
  },
  INSTAGRAM: {
    imagem: "Carrossel: até 10 fotos JPEG/PNG, mesma proporção (4:5–1.91:1)",
    video: "MP4/MOV, máx. 100 MB, mín. 3 s (não misturar com fotos)",
  },
  LINKEDIN: {
    imagem: "Carrossel: até 9 fotos JPEG/PNG/GIF, máx. 5 MB cada",
    video: "MP4, máx. 200 MB (não misturar com fotos)",
  },
  TIKTOK: {
    imagem: "Não suportado (apenas vídeo)",
    video: "MP4/MOV, máx. 287 MB, 3 s–10 min, ideal 9:16 (1080×1920)",
  },
};

export const PLATAFORMAS_CARROSSEL: Plataforma[] = ["INSTAGRAM", "FACEBOOK", "LINKEDIN"];

export function limiteCarrossel(plataforma: Plataforma): number | null {
  if (plataforma === "INSTAGRAM" || plataforma === "FACEBOOK") return 10;
  if (plataforma === "LINKEDIN") return 9;
  return null;
}
