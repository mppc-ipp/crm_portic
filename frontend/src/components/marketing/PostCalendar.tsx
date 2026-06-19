"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { CalendarioEvento } from "./types";
import { estiloEstadoPublicacao } from "@/lib/marketing-api";

const CORES_PADRAO: Record<string, string> = {
  RASCUNHO: "#64748B",
  AGENDADO: "#F59E0B",
  A_PUBLICAR: "#3B82F6",
  PUBLICADO: "#22C55E",
  PARCIAL: "#F97316",
  FALHOU: "#EF4444",
  CANCELADO: "#94A3B8",
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

type Props = {
  eventos: CalendarioEvento[];
  coresEstado?: Record<string, string>;
};

export default function PostCalendar({ eventos, coresEstado = {} }: Props) {
  const hoje = new Date();
  const [mes, setMes] = useState(hoje.getMonth());
  const [ano, setAno] = useState(hoje.getFullYear());

  const cores = useMemo(
    () => ({ ...CORES_PADRAO, ...coresEstado }),
    [coresEstado]
  );

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
                {items.slice(0, 3).map((ev) => {
                  const cor = cores[ev.estado] ?? "#6B7280";
                  return (
                    <Link
                      key={ev.id}
                      href={`/marketing/publicacoes/${ev.id}`}
                      className="block truncate rounded border px-1 py-0.5 text-[10px] leading-tight"
                      style={estiloEstadoPublicacao(cor)}
                      title={ev.titulo}
                    >
                      {ev.titulo}
                    </Link>
                  );
                })}
                {items.length > 3 && (
                  <span className="text-[10px] text-slate-400">+{items.length - 3}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
