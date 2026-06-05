"use client";

export type OccInput = { salaId?: string; viaturaId?: string; dataInicio: string; dataFim: string };

export default function SelectedOccurrencesList({
  ocorrencias,
  onRemove
}: {
  ocorrencias: OccInput[];
  onRemove: (index: number) => void;
}) {
  return (
    <div className="space-y-2">
      {ocorrencias.map((o, i) => (
        <div key={`${o.dataInicio}-${i}`} className="flex items-center justify-between rounded border p-2 text-sm">
          <span>{new Date(o.dataInicio).toLocaleString()} - {new Date(o.dataFim).toLocaleString()}</span>
          <button onClick={() => onRemove(i)} className="rounded bg-red-50 px-2 py-1 text-red-700">Remover</button>
        </div>
      ))}
    </div>
  );
}
