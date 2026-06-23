"use client";

import { useMemo, useState } from "react";
import DependencyIndicators from "./DependencyIndicators";
import type { Objetivo, Secao } from "./types";

type Props = {
  secoes: Secao[];
  onSelect: (obj: Objetivo) => void;
};

const DIAS_SEM = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

export default function CalendarView({ secoes, onSelect }: Props) {
  const [mesAtual, setMesAtual] = useState(() => new Date());

  const tarefas = useMemo(
    () => secoes.flatMap((s) => s.objetivos).filter((o) => o.data_limite),
    [secoes]
  );

  const tarefasPorDia = useMemo(() => {
    const map = new Map<string, Objetivo[]>();
    for (const t of tarefas) {
      if (!t.data_limite) continue;
      const key = t.data_limite;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return map;
  }, [tarefas]);

  const ano = mesAtual.getFullYear();
  const mes = mesAtual.getMonth();
  const primeiroDia = new Date(ano, mes, 1);
  const ultimoDia = new Date(ano, mes + 1, 0);
  let inicioSemana = (primeiroDia.getDay() + 6) % 7;
  const dias: Array<{ data: Date | null; key: string }> = [];

  for (let i = 0; i < inicioSemana; i++) dias.push({ data: null, key: `e-${i}` });
  for (let d = 1; d <= ultimoDia.getDate(); d++) {
    const data = new Date(ano, mes, d);
    dias.push({ data, key: `${ano}-${mes}-${d}` });
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  return (
    <div className="flex-1 overflow-auto p-4">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMesAtual(new Date(ano, mes - 1, 1))}
          className="rounded-lg px-3 py-1 text-sm text-slate-600 hover:bg-slate-100"
        >
          ←
        </button>
        <h3 className="text-lg font-semibold capitalize text-slate-800">
          {mesAtual.toLocaleDateString("pt-PT", { month: "long", year: "numeric" })}
        </h3>
        <button
          type="button"
          onClick={() => setMesAtual(new Date(ano, mes + 1, 1))}
          className="rounded-lg px-3 py-1 text-sm text-slate-600 hover:bg-slate-100"
        >
          →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200">
        {DIAS_SEM.map((d) => (
          <div key={d} className="bg-slate-50 px-2 py-2 text-center text-xs font-semibold text-slate-500">
            {d}
          </div>
        ))}
        {dias.map(({ data, key }) => {
          if (!data) return <div key={key} className="min-h-[100px] bg-white" />;
          const iso = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
          const items = tarefasPorDia.get(iso) ?? [];
          const ehHoje = data.getTime() === hoje.getTime();
          return (
            <div
              key={key}
              className={`min-h-[100px] bg-white p-1.5 ${ehHoje ? "ring-2 ring-inset ring-proj" : ""}`}
            >
              <span className={`text-xs font-medium ${ehHoje ? "text-proj" : "text-slate-500"}`}>
                {data.getDate()}
              </span>
              <div className="mt-1 space-y-0.5">
                {items.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onSelect(t)}
                    className={`block w-full truncate rounded px-1 py-0.5 text-left text-[10px] font-medium ${
                      t.estado === "CONCLUIDO"
                        ? "bg-slate-100 text-slate-400 line-through"
                        : "bg-proj-10 text-proj hover:bg-proj-20"
                    }`}
                  >
                    <span className="block truncate">{t.titulo}</span>
                    <DependencyIndicators
                      entradaTitulos={t.dependencias_entrada_titulos}
                      saidaTitulos={t.dependencias_saida_titulos}
                      compact
                    />
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {tarefas.length === 0 && (
        <p className="mt-4 text-center text-sm text-slate-500">
          Nenhuma tarefa com data limite. Defina prazos para vê-las no calendário.
        </p>
      )}
    </div>
  );
}
