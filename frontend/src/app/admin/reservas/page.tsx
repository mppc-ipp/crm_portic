"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Button, Card } from "@/components/ui/ui";
import { addDays, addWeeks, format, isBefore, startOfDay, startOfWeek } from "date-fns";

export default function AdminReservasPage() {
  const [items, setItems] = useState<any[]>([]);
  const [selectedDay, setSelectedDay] = useState<string>("");
  const [baseDate, setBaseDate] = useState(new Date());
  const [leavingIds, setLeavingIds] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; message: string } | null>(null);
  const load = () =>
    apiFetch<any[]>("/api/admin/reservas")
      .then((reservas) => setItems(reservas.filter((reserva) => reserva.status === "PENDENTE")))
      .catch(() => setItems([]));
  useEffect(() => { load(); }, []);
  const weekStart = startOfWeek(baseDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }).map((_, idx) => addDays(weekStart, idx));
  const todayStart = startOfDay(new Date());
  const selectedItems = items.filter((r) =>
    r.ocorrencias?.some((o: any) => o.dataInicio.slice(0, 10) === selectedDay)
  );
  const formatPeriodoReserva = (ocorrencias: any[] = []) => {
    if (!ocorrencias.length) return "Sem período definido";
    const sorted = [...ocorrencias].sort(
      (a, b) => new Date(a.dataInicio).getTime() - new Date(b.dataInicio).getTime()
    );
    const inicio = new Date(sorted[0].dataInicio);
    const fim = new Date(sorted[sorted.length - 1].dataFim);
    return `${format(inicio, "dd/MM/yyyy HH:mm")} - ${format(fim, "dd/MM/yyyy HH:mm")}`;
  };

  const formatLocalizacao = (ocorrencias: any[] = []) => {
    if (!ocorrencias.length) return "Sem localização definida";
    const locais = Array.from(
      new Set(
        ocorrencias.map((o) => {
          const salaNome = o.sala?.nome ?? "Sala não informada";
          const localizacaoSala = o.sala?.localizacao ?? "Bloco/Piso não informados";
          return `${salaNome} - ${localizacaoSala}`;
        })
      )
    );
    return locais.join(" | ");
  };

  const handleAction = async (id: string, endpoint: "aprovar" | "rejeitar" | "cancelar") => {
    setFeedback(null);
    try {
      await apiFetch(`/api/admin/reservas/${id}/${endpoint}`, { method: "PATCH" });
      setLeavingIds((prev) => [...prev, id]);
      window.setTimeout(() => {
        setItems((prev) => prev.filter((item) => item.id !== id));
        setLeavingIds((prev) => prev.filter((itemId) => itemId !== id));
      }, 220);
      const acaoLabel = endpoint === "aprovar" ? "aprovado" : endpoint === "rejeitar" ? "rejeitado" : "cancelado";
      setFeedback({ type: "success", message: `Pedido ${acaoLabel} com sucesso.` });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao processar a ação.";
      setFeedback({ type: "error", message });
    }
  };
  return (
    <main className="mx-auto max-w-6xl p-4 md:p-8">
      <h1 className="text-3xl font-bold">Gestão de reservas</h1>
      {feedback && (
        <div
          role="alert"
          className={`mt-4 flex items-start justify-between gap-3 rounded-lg border px-3 py-2 text-sm ${
            feedback.type === "error"
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="text-xs font-medium underline">
            Fechar
          </button>
        </div>
      )}
      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={() => setBaseDate((d) => addWeeks(d, -1))}
          className="rounded border bg-white px-2 py-1 text-sm hover:bg-slate-100"
          aria-label="Semana anterior"
        >
          {"<"}
        </button>
        <div className="text-sm font-semibold text-slate-700">
          Semana de {format(weekDays[0], "dd/MM")} a {format(weekDays[6], "dd/MM")}
        </div>
        <button
          onClick={() => setBaseDate((d) => addWeeks(d, 1))}
          className="rounded border bg-white px-2 py-1 text-sm hover:bg-slate-100"
          aria-label="Próxima semana"
        >
          {">"}
        </button>
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-7">
        {weekDays.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const isPastDay = isBefore(day, todayStart);
          const count = items.filter((r) => r.ocorrencias?.some((o: any) => o.dataInicio.slice(0, 10) === key)).length;
          return (
            <button
              key={key}
              className={`rounded-xl border p-3 text-left ${
                isPastDay
                  ? "border-slate-300 bg-[repeating-linear-gradient(135deg,#f1f5f9,#f1f5f9_6px,#e2e8f0_6px,#e2e8f0_12px)] text-slate-500"
                  : selectedDay === key
                    ? "border-slate-900 bg-slate-100"
                    : "border-slate-200 bg-white"
              }`}
              onClick={() => setSelectedDay(key)}
            >
              <p className="text-xs text-slate-500">{format(day, "dd/MM")}</p>
              <p className="mt-1 text-sm font-semibold">{count} reservas</p>
            </button>
          );
        })}
      </div>
      <div className="mt-4 space-y-4">
        {(selectedDay ? selectedItems : items).map((r) => (
          <Card
            key={r.id}
            className={`p-5 transition-all duration-200 ${
              leavingIds.includes(r.id) ? "translate-x-full opacity-0" : "translate-x-0 opacity-100"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="text-lg font-semibold text-slate-900">{r.titulo}</p>
                <p className="text-sm text-slate-700">{r.descricao}</p>
                <p className="text-sm text-slate-700">
                  <span className="font-medium">Utilizador do pedido:</span> {r.usuario?.nome ?? "Não informado"}
                </p>
                <p className="text-sm text-slate-700">
                  <span className="font-medium">Quantidade de pessoas:</span> {r.numeroPessoas}
                </p>
                <p className="text-sm text-slate-700">
                  <span className="font-medium">Período de reserva:</span> {formatPeriodoReserva(r.ocorrencias)}
                </p>
                <p className="text-sm text-slate-700">
                  <span className="font-medium">Localização:</span> {formatLocalizacao(r.ocorrencias)}
                </p>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button variant="success" onClick={() => handleAction(r.id, "aprovar")} title="Aprovar reserva" aria-label="Aprovar reserva">
                ✓
              </Button>
              <Button variant="danger" onClick={() => handleAction(r.id, "rejeitar")} title="Rejeitar reserva" aria-label="Rejeitar reserva">
                X
              </Button>
            </div>
          </Card>
        ))}
        {!items.length && <p className="text-sm text-slate-600">Não há reservas pendentes para análise.</p>}
      </div>
    </main>
  );
}
