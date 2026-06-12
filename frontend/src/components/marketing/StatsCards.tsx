import type { EstatisticasMarketing } from "./types";

const ESTADO_LABELS: Record<string, string> = {
  RASCUNHO: "Rascunhos",
  AGENDADO: "Agendados",
  PUBLICADO: "Publicados",
  PARCIAL: "Parciais",
  FALHOU: "Falhados",
  CANCELADO: "Cancelados",
};

export default function StatsCards({ stats }: { stats: EstatisticasMarketing }) {
  const cards = [
    { label: "Contas ligadas", value: stats.contas_ligadas },
    ...Object.entries(ESTADO_LABELS).map(([key, label]) => ({
      label,
      value: stats.por_estado[key] ?? 0,
    })),
  ];

  return (
    <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="rounded-xl border bg-white p-4">
          <p className="text-xs text-slate-500">{card.label}</p>
          <p className="mt-1 text-2xl font-semibold text-slate-800">{card.value}</p>
        </div>
      ))}
    </div>
  );
}
