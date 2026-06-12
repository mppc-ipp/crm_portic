"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addMonths,
  endOfMonth,
  format,
  isBefore,
  isSameDay,
  startOfDay,
  startOfMonth,
  subMonths,
} from "date-fns";
import CalendarioCustom, { CalendarViewMode } from "@/components/calendar/CalendarioCustom";
import EventModal from "@/components/eventos/EventModal";
import { apiFetch, getStoredUser } from "@/lib/api";
import {
  estiloTipoEvento,
  formatarDataHora,
  type EventoDetalhe,
  type TipoEventoConfig,
} from "@/lib/eventos";
import { EventoCalendario } from "@/lib/types";

type Tab = "calendario" | "historico";

export default function EventosPage() {
  const [tab, setTab] = useState<Tab>("calendario");
  const [eventosCal, setEventosCal] = useState<EventoCalendario[]>([]);
  const [historico, setHistorico] = useState<EventoDetalhe[]>([]);
  const [tipos, setTipos] = useState<TipoEventoConfig[]>([]);
  const [monthCursor, setMonthCursor] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>("month");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalEventoId, setModalEventoId] = useState<number | null>(null);
  const [modalReadOnly, setModalReadOnly] = useState(false);
  const [pendingSlot, setPendingSlot] = useState<{ inicio: Date; fim: Date } | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [aCarregar, setACarregar] = useState(false);

  const user = getStoredUser();
  const podeGerir = Boolean(user?.admin_geral || user?.permissoes?.gerir_eventos);

  const isPastSelectedDay = isBefore(startOfDay(selectedDay), startOfDay(new Date()));

  const carregarCalendario = useCallback(async () => {
    setACarregar(true);
    try {
      const inicio = startOfMonth(subMonths(monthCursor, 1)).toISOString();
      const fim = endOfMonth(addMonths(monthCursor, 1)).toISOString();
      const params = new URLSearchParams({
        inicio,
        fim,
        periodo: "futuros",
        formato: "calendario",
      });
      if (filtroTipo) params.set("tipo", filtroTipo);
      const data = await apiFetch<EventoCalendario[]>(`/api/eventos?${params}`);
      setEventosCal(data);
    } catch {
      setFeedback({ type: "error", message: "Não foi possível carregar o calendário." });
    } finally {
      setACarregar(false);
    }
  }, [monthCursor, filtroTipo]);

  const carregarHistorico = useCallback(async () => {
    setACarregar(true);
    try {
      const params = new URLSearchParams({ periodo: "passados" });
      if (filtroTipo) params.set("tipo", filtroTipo);
      const data = await apiFetch<EventoDetalhe[]>(`/api/eventos?${params}`);
      setHistorico(data);
    } catch {
      setFeedback({ type: "error", message: "Não foi possível carregar o histórico." });
    } finally {
      setACarregar(false);
    }
  }, [filtroTipo]);

  useEffect(() => {
    apiFetch<TipoEventoConfig[]>("/api/eventos/tipos?ativos=1")
      .then(setTipos)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (tab === "calendario") void carregarCalendario();
    else void carregarHistorico();
  }, [tab, carregarCalendario, carregarHistorico]);

  const eventosDoDia = useMemo(
    () =>
      eventosCal
        .filter((e) => isSameDay(new Date(e.dataInicio), selectedDay))
        .sort((a, b) => new Date(a.dataInicio).getTime() - new Date(b.dataInicio).getTime()),
    [eventosCal, selectedDay]
  );

  const abrirCriar = (inicio?: Date, fim?: Date) => {
    if (!podeGerir) return;
    if (isPastSelectedDay && tab === "calendario") {
      setFeedback({ type: "error", message: "Não é possível criar eventos em datas passadas." });
      return;
    }
    setModalEventoId(null);
    setModalReadOnly(false);
    if (inicio && fim) {
      setPendingSlot({ inicio, fim });
    } else {
      const inicioDefault = new Date(selectedDay);
      inicioDefault.setHours(9, 0, 0, 0);
      const fimDefault = new Date(selectedDay);
      fimDefault.setHours(10, 0, 0, 0);
      setPendingSlot({ inicio: inicioDefault, fim: fimDefault });
    }
    setModalOpen(true);
  };

  const abrirEvento = (id: number, readOnly = false) => {
    setModalEventoId(id);
    setModalReadOnly(readOnly);
    setPendingSlot(null);
    setModalOpen(true);
  };

  const handleSaved = () => {
    setFeedback({ type: "success", message: "Evento guardado com sucesso." });
    if (tab === "calendario") {
      void carregarCalendario();
      setViewMode("day");
    } else {
      void carregarHistorico();
    }
  };

  return (
    <main className="mx-auto max-w-7xl p-4 md:p-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Eventos</h1>
          <p className="text-sm text-slate-600">
            Calendário de workshops, demo days e outros eventos do Portic.
          </p>
        </div>
        {podeGerir && tab === "calendario" && (
          <button
            type="button"
            onClick={() => abrirCriar()}
            className="rounded-lg bg-[#1e3a5f] px-4 py-2 text-sm font-medium text-white hover:bg-[#162d4a]"
          >
            Novo evento
          </button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap gap-2 border-b border-slate-200">
        {(["calendario", "historico"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`border-b-2 px-4 py-2 text-sm font-medium capitalize ${
              tab === t
                ? "border-[#1e3a5f] text-[#1e3a5f]"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t === "calendario" ? "Calendário" : "Histórico"}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Tipo</label>
          <select
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
          >
            <option value="">Todos</option>
            {tipos.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      {feedback && (
        <div
          className={`mb-4 rounded-lg border px-3 py-2 text-sm ${
            feedback.type === "error"
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {feedback.message}
        </div>
      )}

      {aCarregar && <p className="mb-2 text-sm text-slate-500">A carregar…</p>}

      {tab === "calendario" && (
        <>
          <CalendarioCustom
            eventos={eventosCal}
            viewMode={viewMode}
            selectedDay={selectedDay}
            disableDayInteractions={isPastSelectedDay || !podeGerir}
            onSelectDay={(day) => {
              setSelectedDay(day);
              setViewMode("day");
            }}
            onBackToMonth={() => setViewMode("month")}
            onBaseDateChange={setMonthCursor}
            onEventClick={(evento) => abrirEvento(Number(evento.id), !evento.editable)}
            onSelectOccurrences={(occurrences) => {
              if (!podeGerir) return;
              const first = occurrences[0];
              if (!first) return;
              if (isPastSelectedDay) {
                setFeedback({ type: "error", message: "Não é possível criar eventos em datas passadas." });
                return;
              }
              abrirCriar(first.inicio, first.fim);
            }}
          />

          {viewMode === "day" && (
            <section className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="mb-3 text-sm font-semibold text-slate-800">
                Eventos em {format(selectedDay, "dd/MM/yyyy")}
              </h2>
              {eventosDoDia.length === 0 ? (
                <p className="text-sm text-slate-500">Nenhum evento neste dia.</p>
              ) : (
                <ul className="space-y-2">
                  {eventosDoDia.map((e) => (
                      <li key={e.id}>
                        <button
                          type="button"
                          onClick={() => abrirEvento(Number(e.id), !e.editable)}
                          className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-left text-sm hover:bg-slate-50"
                          style={estiloTipoEvento(e.tipoCor)}
                        >
                          <span className="font-medium">{e.title}</span>
                          <span className="text-xs opacity-80">
                            {format(new Date(e.dataInicio), "HH:mm")} —{" "}
                            {format(new Date(e.dataFim), "HH:mm")}
                          </span>
                        </button>
                      </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </>
      )}

      {tab === "historico" && (
        <section className="rounded-xl border border-slate-200 bg-white">
          {historico.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">Nenhum evento passado registado.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {historico.map((ev) => (
                <li key={ev.id}>
                  <button
                    type="button"
                    onClick={() => abrirEvento(ev.id, true)}
                    className="flex w-full flex-wrap items-center justify-between gap-2 px-4 py-3 text-left hover:bg-slate-50"
                  >
                    <div>
                      <p className="font-medium text-slate-900">{ev.titulo}</p>
                      <p className="text-xs text-slate-500">
                        {ev.tipo_display}
                      </p>
                    </div>
                    <div className="text-right text-xs text-slate-500">
                      <p>{formatarDataHora(ev.data_inicio)}</p>
                      {ev.anexos.length > 0 && (
                        <p className="mt-0.5">{ev.anexos.length} anexo(s)</p>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <EventModal
        open={modalOpen}
        eventoId={modalEventoId}
        initialInicio={pendingSlot?.inicio}
        initialFim={pendingSlot?.fim}
        readOnly={modalReadOnly}
        podeGerir={podeGerir}
        onClose={() => {
          setModalOpen(false);
          setPendingSlot(null);
        }}
        onSaved={handleSaved}
      />
    </main>
  );
}
