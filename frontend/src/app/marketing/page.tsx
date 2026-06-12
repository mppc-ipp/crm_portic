"use client";

import { useCallback, useEffect, useState } from "react";
import PostCalendar from "@/components/marketing/PostCalendar";
import StatsCards from "@/components/marketing/StatsCards";
import type { CalendarioEvento, EstatisticasMarketing } from "@/components/marketing/types";
import { obterCalendario, obterEstatisticas } from "@/lib/marketing-api";

export default function MarketingCalendarioPage() {
  const [eventos, setEventos] = useState<CalendarioEvento[]>([]);
  const [stats, setStats] = useState<EstatisticasMarketing | null>(null);
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro("");
    try {
      const hoje = new Date();
      const de = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1).toISOString().slice(0, 10);
      const ate = new Date(hoje.getFullYear(), hoje.getMonth() + 2, 0).toISOString().slice(0, 10);
      const [cal, est] = await Promise.all([obterCalendario(de, ate), obterEstatisticas()]);
      setEventos(cal.eventos);
      setStats(est);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  if (loading) return <p className="text-sm text-slate-500">A carregar calendário…</p>;
  if (erro) return <p className="text-sm text-red-600">{erro}</p>;

  return (
    <div>
      {stats && <StatsCards stats={stats} />}
      <PostCalendar eventos={eventos} />
    </div>
  );
}
