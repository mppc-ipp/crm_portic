"use client";

import { useMemo } from "react";
import type { TimelineData } from "./types";

type Props = {
  data: TimelineData;
  onSelect: (id: number) => void;
  onUpdateDates: (id: number, dataInicio: string | null, dataLimite: string | null) => Promise<void>;
};

const DIAS_VISIVEIS = 42;
const ROW_H = 40;

function parseDate(iso: string | null, fallback: Date): Date {
  if (!iso) return fallback;
  return new Date(iso + "T12:00:00");
}

export default function TimelineView({ data, onSelect, onUpdateDates }: Props) {
  const { inicio, fim, barras } = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    let min = new Date(hoje);
    min.setDate(min.getDate() - 7);
    let max = new Date(hoje);
    max.setDate(max.getDate() + 35);

    for (const t of data.tarefas) {
      const di = parseDate(t.data_inicio, parseDate(t.data_limite, hoje));
      const df = parseDate(t.data_limite, di);
      if (di < min) min = new Date(di);
      if (df > max) max = new Date(df);
    }

    const totalMs = max.getTime() - min.getTime() || 1;
    const barras = data.tarefas.map((t) => {
      const di = parseDate(t.data_inicio, parseDate(t.data_limite, hoje));
      const df = parseDate(t.data_limite, new Date(di.getTime() + 86400000));
      const left = ((di.getTime() - min.getTime()) / totalMs) * 100;
      const width = Math.max(((df.getTime() - di.getTime()) / totalMs) * 100, 2);
      return { ...t, left, width, di, df };
    });
    return { inicio: min, fim: max, barras };
  }, [data.tarefas]);

  const marcos: Date[] = [];
  const cursor = new Date(inicio);
  while (cursor <= fim && marcos.length < DIAS_VISIVEIS) {
    marcos.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 7);
  }

  const svgHeight = barras.length * ROW_H;

  return (
    <div className="flex-1 overflow-auto p-4">
      <p className="mb-4 text-sm text-slate-500">
        Arraste as barras para ajustar datas. As setas mostram dependências entre tarefas.
      </p>

      {/* Escala temporal */}
      <div className="mb-2 flex border-b border-slate-200 pb-2 pl-48">
        {marcos.map((m) => (
          <div
            key={m.toISOString()}
            className="flex-1 text-center text-[10px] font-medium text-slate-400"
          >
            {m.toLocaleDateString("pt-PT", { day: "numeric", month: "short" })}
          </div>
        ))}
      </div>

      <div className="relative">
        {data.dependencias.length > 0 && barras.length > 0 && (
          <svg
            className="pointer-events-none absolute left-48 right-0 top-0 z-10 overflow-visible"
            width="100%"
            height={svgHeight}
            viewBox={`0 0 100 ${svgHeight}`}
            preserveAspectRatio="none"
            aria-hidden
          >
            <defs>
              <marker
                id="dep-arrow"
                markerWidth="6"
                markerHeight="6"
                refX="5.5"
                refY="3"
                orient="auto"
              >
                <path d="M0,0 L6,3 L0,6 Z" fill="#94a3b8" />
              </marker>
            </defs>
            {data.dependencias.map((d) => {
              const pi = barras.findIndex((b) => b.id === d.predecessora_id);
              const si = barras.findIndex((b) => b.id === d.sucessora_id);
              if (pi < 0 || si < 0) return null;
              const pred = barras[pi];
              const succ = barras[si];
              const x1 = pred.left + pred.width;
              const x2 = succ.left;
              const y1 = pi * ROW_H + ROW_H / 2;
              const y2 = si * ROW_H + ROW_H / 2;
              const mid = (x1 + x2) / 2;
              return (
                <path
                  key={d.id}
                  d={`M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`}
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="0.35"
                  markerEnd="url(#dep-arrow)"
                />
              );
            })}
          </svg>
        )}

        <div className="relative space-y-1">
          {barras.map((b) => (
            <div key={b.id} className="flex items-center gap-2 py-1 hover:bg-slate-50">
              <button
                type="button"
                onClick={() => onSelect(b.id)}
                className="w-44 shrink-0 truncate text-left text-sm text-slate-700 hover:text-proj"
              >
                {b.titulo}
              </button>
              <div className="relative h-8 flex-1 rounded bg-slate-100">
                <div
                  draggable
                  onDragEnd={(e) => {
                    const rect = (e.target as HTMLElement).parentElement?.getBoundingClientRect();
                    if (!rect) return;
                    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                    const totalMs = fim.getTime() - inicio.getTime();
                    const novaInicio = new Date(inicio.getTime() + pct * totalMs);
                    const dur = b.df.getTime() - b.di.getTime();
                    const novaFim = new Date(novaInicio.getTime() + dur);
                    const fmt = (d: Date) =>
                      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                    void onUpdateDates(b.id, fmt(novaInicio), fmt(novaFim));
                  }}
                  className={`absolute top-1 z-20 h-6 cursor-grab rounded-md px-2 text-[10px] font-medium leading-6 text-white shadow-sm active:cursor-grabbing ${
                    b.estado === "CONCLUIDO"
                      ? "bg-emerald-500"
                      : b.estado === "EM_PROGRESSO"
                        ? "bg-blue-500"
                        : b.estado === "BLOQUEADO"
                          ? "bg-rose-500"
                          : "bg-proj"
                  }`}
                  style={{ left: `${b.left}%`, width: `${b.width}%`, minWidth: "24px" }}
                  title={`${b.di.toLocaleDateString("pt-PT")} — ${b.df.toLocaleDateString("pt-PT")}`}
                >
                  <span className="truncate">{b.responsavel_nome ?? ""}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {barras.length === 0 && (
        <p className="py-8 text-center text-sm text-slate-500">
          Adicione tarefas com datas de início e limite para ver a timeline.
        </p>
      )}

      {data.dependencias.length > 0 && (
        <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <h4 className="text-xs font-semibold uppercase text-slate-500">Dependências</h4>
          <ul className="mt-2 space-y-1 text-sm text-slate-600">
            {data.dependencias.map((d) => {
              const pred = data.tarefas.find((t) => t.id === d.predecessora_id);
              const succ = data.tarefas.find((t) => t.id === d.sucessora_id);
              return (
                <li key={d.id}>
                  {pred?.titulo ?? d.predecessora_id} → {succ?.titulo ?? d.sucessora_id}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
