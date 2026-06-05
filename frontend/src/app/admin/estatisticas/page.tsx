"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Button, Card, Field, Input } from "@/components/ui/ui";
import { format, parseISO, subDays } from "date-fns";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

type EstatisticasPayload = {
  resumo: { ocorrenciasAprovadas: number; totalHorasReservadas: number; salasAtivas: number };
  porHoraDia: { hora: number; minutos: number }[];
  porDiaSemana: { dia: number; label: string; minutos: number }[];
  porSala: { salaId: string; nome: string; horas: number }[];
  porDiaCalendario: { data: string; horas: number }[];
};

const barFill = "#0f172a";
const barFillMuted = "#94a3b8";

export default function AdminEstatisticasPage() {
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const defaultStartStr = format(subDays(new Date(), 30), "yyyy-MM-dd");
  const [dataInicio, setDataInicio] = useState(defaultStartStr);
  const [dataFim, setDataFim] = useState(todayStr);
  const [unidadeId, setUnidadeId] = useState("");
  const [unidades, setUnidades] = useState<{ id: string; nome: string }[]>([]);
  const [payload, setPayload] = useState<EstatisticasPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ id: string; nome: string }[]>("/api/admin/unidades")
      .then(setUnidades)
      .catch(() => setUnidades([]));
  }, []);

  useEffect(() => {
    let alive = true;
    const q = new URLSearchParams();
    q.set("dataInicio", dataInicio);
    q.set("dataFim", dataFim);
    if (unidadeId) q.set("unidadeId", unidadeId);
    setLoading(true);
    setError(null);
    apiFetch<EstatisticasPayload>(`/api/admin/estatisticas?${q.toString()}`)
      .then((d) => {
        if (alive) setPayload(d);
      })
      .catch((e) => {
        if (alive) {
          setError(e instanceof Error ? e.message : "Erro ao carregar estatísticas");
          setPayload(null);
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [dataInicio, dataFim, unidadeId]);

  const peakHora = useMemo(() => {
    if (!payload?.porHoraDia.length) return null;
    let max = -1;
    let hora = 0;
    for (const row of payload.porHoraDia) {
      if (row.minutos > max) {
        max = row.minutos;
        hora = row.hora;
      }
    }
    if (max <= 0) return null;
    return { hora, minutos: max };
  }, [payload]);

  const chartHora = useMemo(
    () =>
      (payload?.porHoraDia ?? []).map((r) => ({
        label: `${String(r.hora).padStart(2, "0")}h`,
        minutos: r.minutos,
        hora: r.hora
      })),
    [payload]
  );

  const chartDiaSemana = useMemo(() => payload?.porDiaSemana ?? [], [payload]);

  const chartSalas = useMemo(
    () =>
      (payload?.porSala ?? []).map((s) => ({
        nome: s.nome.length > 28 ? `${s.nome.slice(0, 26)}…` : s.nome,
        horas: s.horas
      })),
    [payload]
  );

  const chartCalendario = useMemo(
    () =>
      (payload?.porDiaCalendario ?? []).map((d) => {
        try {
          const parsed = parseISO(d.data);
          return {
            label: format(parsed, "dd/MM"),
            labelLong: format(parsed, "dd/MM/yyyy"),
            horas: d.horas
          };
        } catch {
          return { label: d.data, labelLong: d.data, horas: d.horas };
        }
      }),
    [payload]
  );

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-3xl font-bold">Estatísticas</h1>
        <p className="mt-1 text-sm text-slate-600">
          Ocupação de salas com reservas aprovadas no período selecionado (soma do tempo reservado por sala).
        </p>
      </div>

      <Card className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Field label="Data início">
          <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
        </Field>
        <Field label="Data fim">
          <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
        </Field>
        {unidades.length > 1 ? (
          <Field label="Unidade">
            <select
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              value={unidadeId}
              onChange={(e) => setUnidadeId(e.target.value)}
            >
              <option value="">Todas as unidades no meu âmbito</option>
              {unidades.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                </option>
              ))}
            </select>
          </Field>
        ) : null}
      </Card>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </div>
      )}

      {loading && !payload ? (
        <p className="text-sm text-slate-600">A carregar…</p>
      ) : payload ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reservas (ocorrências)</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{payload.resumo.ocorrenciasAprovadas}</p>
            </Card>
            <Card>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Horas reservadas</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{payload.resumo.totalHorasReservadas}</p>
            </Card>
            <Card>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Salas ativas</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{payload.resumo.salasAtivas}</p>
            </Card>
          </div>

          {peakHora && (
            <p className="text-sm text-slate-700">
              Pico de ocupação por relógio:{" "}
              <strong>
                {String(peakHora.hora).padStart(2, "0")}h–{peakHora.hora === 23 ? "24" : String(peakHora.hora + 1).padStart(2, "0")}h
              </strong>{" "}
              (~{peakHora.minutos} min de reserva agregados nessa hora do dia).
            </p>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <h2 className="text-lg font-semibold text-slate-900">Ocupação por hora do dia</h2>
              <p className="mt-1 text-xs text-slate-500">Minutos de reserva que intersectam cada hora (0–23h).</p>
              <div className="mt-4 h-72 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartHora} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={2} />
                    <YAxis tick={{ fontSize: 11 }} width={40} />
                    <Tooltip
                      formatter={(v: number) => [`${v} min`, "Reservado"]}
                      labelFormatter={(l) => `Hora ${l}`}
                      contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }}
                    />
                    <Bar dataKey="minutos" radius={[4, 4, 0, 0]}>
                      {chartHora.map((entry) => (
                        <Cell key={entry.hora} fill={peakHora && entry.hora === peakHora.hora ? barFill : barFillMuted} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <h2 className="text-lg font-semibold text-slate-900">Por dia da semana</h2>
              <p className="mt-1 text-xs text-slate-500">Segunda a domingo — minutos de reserva no período.</p>
              <div className="mt-4 h-72 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartDiaSemana} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} width={40} />
                    <Tooltip
                      formatter={(v: number) => [`${v} min`, "Reservado"]}
                      contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }}
                    />
                    <Bar dataKey="minutos" fill={barFill} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <Card>
            <h2 className="text-lg font-semibold text-slate-900">Salas com mais horas reservadas</h2>
            <p className="mt-1 text-xs text-slate-500">Top 10 no período.</p>
            <div className="mt-4 h-80 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={chartSalas} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v} h`} />
                    <YAxis type="category" dataKey="nome" width={120} tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(v: number) => [`${v} h`, "Reservado"]}
                      contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }}
                    />
                    <Bar dataKey="horas" fill={barFill} radius={[0, 4, 4, 0]} barSize={18} />
                  </BarChart>
                </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-slate-900">Evolução diária</h2>
            <p className="mt-1 text-xs text-slate-500">Horas reservadas por dia civil.</p>
            <div className="mt-4 h-72 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartCalendario} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" minTickGap={24} />
                  <YAxis tick={{ fontSize: 11 }} width={40} />
                  <Tooltip
                    formatter={(v: number) => [`${v} h`, "Reservado"]}
                    labelFormatter={(_, items) => {
                      const row = items?.[0]?.payload as { labelLong?: string } | undefined;
                      return row?.labelLong ?? "";
                    }}
                    contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }}
                  />
                  <Line type="monotone" dataKey="horas" stroke={barFill} strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {loading && <p className="text-xs text-slate-500">A atualizar dados…</p>}
        </>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setDataInicio(format(subDays(new Date(), 30), "yyyy-MM-dd"));
            setDataFim(format(new Date(), "yyyy-MM-dd"));
            setUnidadeId("");
          }}
        >
          Últimos 30 dias
        </Button>
      </div>
    </main>
  );
}
