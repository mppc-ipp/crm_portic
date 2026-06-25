"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import NotificationCenter from "@/components/reports/NotificationCenter";
import { apiFetch } from "@/lib/api";
import { formatarDataHora } from "@/lib/eventos";

type ProximoEvento = {
  id: number;
  titulo: string;
  tipo: string;
  data_inicio: string;
  data_fim: string;
  em_curso: boolean;
};

export default function DashboardPage() {
  const [proximosEventos, setProximosEventos] = useState<ProximoEvento[]>([]);

  useEffect(() => {
    apiFetch<{ proximos_eventos: ProximoEvento[] }>("/api/dashboard")
      .then((data) => setProximosEventos(data.proximos_eventos ?? []))
      .catch(() => undefined);
  }, []);

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-600">Centro de notificações do CRM Portic.</p>
      </div>

      {proximosEventos.length > 0 && (
        <section className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Próximos eventos</h2>
            <Link href="/dashboard/eventos" className="text-xs text-blue-700 hover:underline">
              Ver calendário
            </Link>
          </div>
          <ul className="space-y-2">
            {proximosEventos.slice(0, 5).map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
                <span className="font-medium">{e.titulo}</span>
                {e.em_curso && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                    Em curso
                  </span>
                )}
                <span className="text-slate-500"> — {formatarDataHora(e.data_inicio)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <NotificationCenter />
    </div>
  );
}
