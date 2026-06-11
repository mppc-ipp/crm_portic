type Card = {
  label: string;
  value: string | number;
  hint?: string;
};

export default function ReportSummaryCards({ cards }: { cards: Card[] }) {
  if (!cards.length) return null;
  return (
    <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="rounded-xl border bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{c.label}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{c.value}</p>
          {c.hint && <p className="mt-0.5 text-xs text-slate-500">{c.hint}</p>}
        </div>
      ))}
    </div>
  );
}
