"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { CalendarioEvento } from "./types";
import PlatformBadge from "./PlatformBadge";

const ESTADO_CORES: Record<string, string> = {
  RASCUNHO: "border-slate-300 bg-slate-50",
  AGENDADO: "border-amber-300 bg-amber-50",
  PUBLICADO: "border-green-300 bg-green-50",
  PARCIAL: "border-orange-300 bg-orange-50",
  FALHOU: "border-red-300 bg-red-50",
  CANCELADO: "border-slate-200 bg-slate-100 opacity-60",
};

function diasDoMes(ano: number, mes: number) {
  const primeiro = new Date(ano, mes, 1);
  const ultimo = new Date(ano, mes + 1, 0);
  const inicioSemana = (primeiro.getDay() + 6) % 7;
  const dias: Array<Date | null> = [];
  for (let i = 0; i < inicioSemana; i++) dias.push(null);
  for (let d = 1; d <= ultimo.getDate(); d++) dias.push(new Date(ano, mes, d));
  return dias;
}

function chaveData(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function PostCalendar({ eventos }: { eventos: CalendarioEvento[] }) {
  const hoje = new Date();
  const [mes, setMes] = useState(hoje.getMonth());
  const [ano, setAno] = useState(hoje.getFullYear());

  const porDia = useMemo(() => {
    const map = new Map<string, CalendarioEvento[]>();
    for (const ev of eventos) {
      if (!ev.data) continue;
      const key = ev.data.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    }
    return map;
  }, [eventos]);

  const dias = diasDoMes(ano, mes);
  const mesLabel = new Date(ano, mes, 1).toLocaleDateString("pt-PT", {
    month: "long",
    year: "numeric",
  });

  function mudarMes(delta: number) {
    const d = new Date(ano, mes + delta, 1);
    setMes(d.getMonth());
    setAno(d.getFullYear());
  }

  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => mudarMes(-1)}
          className="rounded-lg border px-3 py-1 text-sm hover:bg-slate-50"
        >
          ←
        </button>
        <h3 className="text-lg font-medium capitalize">{mesLabel}</h3>
        <button
          type="button"
          onClick={() => mudarMes(1)}
          className="rounded-lg border px-3 py-1 text-sm hover:bg-slate-50"
        >
          →
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-500">
        {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {dias.map((dia, idx) => {
          if (!dia) return <div key={`empty-${idx}`} className="min-h-[88px]" />;
          const key = chaveData(dia);
          const items = porDia.get(key) ?? [];
          const ehHoje = chaveData(hoje) === key;
          return (
            <div
              key={key}
              className={`min-h-[88px] rounded-lg border p-1 ${ehHoje ? "border-portic ring-1 ring-portic/30" : "border-slate-100"}`}
            >
              <div className="text-right text-xs text-slate-500">{dia.getDate()}</div>
              <div className="mt-1 space-y-1">
                {items.slice(0, 3).map((ev) => (
                  <Link
                    key={ev.id}
                    href={`/marketing/publicacoes/${ev.id}`}
                    className={`block truncate rounded border px-1 py-0.5 text-[10px] leading-tight ${ESTADO_CORES[ev.estado] ?? "bg-white"}`}
                    title={ev.titulo}
                  >
                    {ev.titulo}
                  </Link>
                ))}
                {items.length > 3 && (
                  <span className="text-[10px] text-slate-400">+{items.length - 3}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {eventos.slice(0, 8).map((ev) => (
          <Link
            key={`list-${ev.id}`}
            href={`/marketing/publicacoes/${ev.id}`}
            className="flex items-center gap-2 rounded-lg border px-2 py-1 text-sm hover:bg-slate-50"
          >
            <span>{ev.titulo}</span>
            {ev.plataformas.map((p) => (
              <PlatformBadge key={p} plataforma={p} />
            ))}
          </Link>
        ))}
      </div>
    </div>
  );
}
