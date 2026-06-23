export const ESTADOS_OBJ = [
  { id: "PENDENTE", label: "Pendente", cor: "bg-slate-100 text-slate-700" },
  { id: "EM_PROGRESSO", label: "Em progresso", cor: "bg-blue-100 text-blue-700" },
  { id: "CONCLUIDO", label: "Concluído", cor: "bg-emerald-100 text-emerald-700" },
  { id: "BLOQUEADO", label: "Bloqueado", cor: "bg-rose-100 text-rose-700" },
] as const;

export const URGENTE_TAG_CLASSES = "bg-red-100 text-red-700";

export const VISTAS = [
  { id: "lista" as const, label: "Lista", icon: "☰" },
  { id: "quadro" as const, label: "Quadro", icon: "▦" },
  { id: "calendario" as const, label: "Calendário", icon: "📅" },
  { id: "timeline" as const, label: "Timeline", icon: "▬" },
];

export const SECTION_TEMPLATES = [
  { id: "vazio", label: "Vazio", descricao: "Sem secções — cria as que fizerem sentido" },
  { id: "kanban", label: "Kanban", descricao: "A fazer, Em curso, Concluído" },
] as const;

export type TemplateSecoesId = (typeof SECTION_TEMPLATES)[number]["id"];

export const KANBAN_SECOES = ["A fazer", "Em curso", "Concluído"] as const;

/** Classes do tema do projeto (usa CSS vars --proj-primary) */
export const T = {
  btnPrimary:
    "rounded-lg bg-proj px-4 py-2 text-sm font-semibold text-white hover:bg-proj-hover disabled:opacity-50",
  btnPrimarySm:
    "rounded-lg bg-proj px-3 py-1.5 text-sm font-semibold text-white hover:bg-proj-hover disabled:opacity-50",
  btnGhost: "text-sm font-medium text-slate-500 hover:text-proj",
  input: "rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-proj",
  tabActive: "border-b-proj text-proj",
  hoverRow: "hover:bg-slate-50 hover:text-proj",
  hoverRowBg: "hover:bg-slate-50",
  unreadBg: "bg-slate-50",
  badge: "bg-proj text-white",
  pillActive: "bg-proj-10 text-proj",
  dotActive: "bg-proj",
  textActive: "text-proj font-semibold",
  ringToday: "ring-proj text-proj",
  bar: "bg-proj",
  calTask: "bg-proj-10 text-proj hover:bg-proj-20",
  btnOutline: "rounded-lg border border-proj px-4 py-2 text-sm font-medium text-proj hover:bg-proj-5",
} as const;
