import type { Atribuivel, Objetivo, Projeto } from "./types";

/** Membros do projeto + responsável (com ou sem cadastro). */
export function atribuiveisDoProjeto(projeto: Projeto | null): Atribuivel[] {
  if (!projeto) return [];
  const items: Atribuivel[] = [];
  const emailsVistos = new Set<string>();

  for (const m of projeto.membros ?? []) {
    const norm = m.email.toLowerCase();
    if (emailsVistos.has(norm)) continue;
    emailsVistos.add(norm);
    if (m.tem_cadastro && m.utilizador) {
      items.push({
        key: `u:${m.utilizador}`,
        label: m.nome ?? m.email,
        tem_cadastro: true,
      });
    } else {
      items.push({
        key: `e:${norm}`,
        label: m.email,
        tem_cadastro: false,
      });
    }
  }

  if (projeto.responsavel) {
    const key = `u:${projeto.responsavel}`;
    if (!items.some((i) => i.key === key)) {
      items.push({
        key,
        label: projeto.responsavel_nome ?? "Responsável",
        tem_cadastro: true,
      });
    }
  }

  return items.sort((a, b) => a.label.localeCompare(b.label, "pt"));
}

export function parseAtribuicaoKey(key: string): {
  responsavel: number | null;
  responsavel_email: string | null;
} {
  if (!key) return { responsavel: null, responsavel_email: null };
  if (key.startsWith("u:")) {
    const id = Number(key.slice(2));
    return Number.isFinite(id) ? { responsavel: id, responsavel_email: null } : { responsavel: null, responsavel_email: null };
  }
  if (key.startsWith("e:")) {
    return { responsavel: null, responsavel_email: key.slice(2) };
  }
  return { responsavel: null, responsavel_email: null };
}

export function atribuicaoKeyFromObjetivo(obj: Objetivo): string {
  if (obj.responsavel) return `u:${obj.responsavel}`;
  if (obj.responsavel_email) return `e:${obj.responsavel_email.toLowerCase()}`;
  return "";
}

export function objetivoCorrespondeAtribuicao(obj: Objetivo, filtroKey: string): boolean {
  if (!filtroKey) return true;
  if (filtroKey.startsWith("u:")) {
    return String(obj.responsavel) === filtroKey.slice(2);
  }
  if (filtroKey.startsWith("e:")) {
    return (obj.responsavel_email ?? "").toLowerCase() === filtroKey.slice(2);
  }
  return true;
}

export function iniciais(nome: string | null | undefined): string {
  if (!nome) return "?";
  const partes = nome.trim().split(/\s+/);
  if (partes.length >= 2) return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
  return nome.slice(0, 2).toUpperCase();
}

export function corAvatar(nome: string | null | undefined): string {
  const cores = [
    "bg-rose-500",
    "bg-orange-500",
    "bg-amber-500",
    "bg-emerald-500",
    "bg-teal-500",
    "bg-sky-500",
    "bg-indigo-500",
    "bg-violet-500",
    "bg-fuchsia-500",
  ];
  if (!nome) return cores[0];
  let hash = 0;
  for (let i = 0; i < nome.length; i++) hash = nome.charCodeAt(i) + ((hash << 5) - hash);
  return cores[Math.abs(hash) % cores.length];
}

export function formatarData(data: string | null): string {
  if (!data) return "";
  return new Date(data + "T12:00:00").toLocaleDateString("pt-PT", {
    day: "numeric",
    month: "short",
  });
}

export function dataVencida(data: string | null): boolean {
  if (!data) return false;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const limite = new Date(data + "T12:00:00");
  return limite < hoje;
}

export function estiloDataLimite(obj: Objetivo): string {
  if (!obj.data_limite) return "text-slate-400";
  if (obj.estado === "CONCLUIDO") return "text-slate-400 line-through";
  if (dataVencida(obj.data_limite)) return "text-rose-600 bg-rose-50";
  const hoje = new Date();
  const limite = new Date(obj.data_limite + "T12:00:00");
  const diff = (limite.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24);
  if (diff <= 2) return "text-amber-700 bg-amber-50";
  return "text-slate-600 bg-slate-100";
}
