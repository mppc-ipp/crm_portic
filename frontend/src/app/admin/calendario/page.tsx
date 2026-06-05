"use client";

import { useEffect, useMemo, useState } from "react";
import { endOfMonth, format, isBefore, isSameDay, startOfDay, startOfMonth, subMonths, addMonths } from "date-fns";
import CalendarioCustom, { CalendarViewMode } from "@/components/calendar/CalendarioCustom";
import ReservationModal from "@/components/calendar/ReservationModal";
import { apiFetch } from "@/lib/api";
import { EventoCalendario, ReservaAdmin, Sala, SessaoUtilizador } from "@/lib/types";

export default function AdminCalendarioPage() {
  const [salas, setSalas] = useState<Sala[]>([]);
  const [selectedSalaId, setSelectedSalaId] = useState("");
  const [monthCursor, setMonthCursor] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>("month");
  const [eventos, setEventos] = useState<EventoCalendario[]>([]);
  const [pendingOccurrences, setPendingOccurrences] = useState<Array<{ inicio: Date; fim: Date }>>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [currentUser, setCurrentUser] = useState<SessaoUtilizador | null>(null);
  const [editingReserva, setEditingReserva] = useState<ReservaAdmin | null>(null);
  const [editTitulo, setEditTitulo] = useState("");
  const [editDescricao, setEditDescricao] = useState("");
  const [editNumeroPessoas, setEditNumeroPessoas] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    apiFetch<Sala[]>("/api/admin/salas")
      .then((data) => {
        setSalas(data);
        if (data[0]) {
          setSelectedSalaId(data[0].id);
        }
      })
      .catch(() => {
        // Session guard in AppShell handles unauthenticated redirects.
      });
    apiFetch<SessaoUtilizador>("/api/auth/me").then(setCurrentUser).catch(() => undefined);
  }, []);

  const carregarEventos = async (salaId: string, baseDate: Date) => {
    if (!salaId) return;
    setIsLoading(true);
    try {
      const inicio = startOfMonth(subMonths(baseDate, 1)).toISOString();
      const fim = endOfMonth(addMonths(baseDate, 1)).toISOString();
      const data = await apiFetch<EventoCalendario[]>(
        `/api/calendario?salaId=${salaId}&inicio=${inicio}&fim=${fim}`
      );
      setEventos(data);
    } catch {
      // Ignore fetch errors here to avoid unhandled promise rejections
      // while AppShell redirects unauthenticated users.
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void carregarEventos(selectedSalaId, monthCursor);
  }, [monthCursor, selectedSalaId]);

  useEffect(() => {
    const refreshIfVisible = () => {
      if (!document.hidden) {
        void carregarEventos(selectedSalaId, monthCursor);
      }
    };
    const onVisibilityChange = () => {
      if (!document.hidden) {
        refreshIfVisible();
      }
    };
    window.addEventListener("focus", refreshIfVisible);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("focus", refreshIfVisible);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSalaId, monthCursor]);

  const eventosDoDia = useMemo(
    () =>
      eventos
        .filter((evento) => isSameDay(new Date(evento.dataInicio), selectedDay))
        .sort((a, b) => new Date(a.dataInicio).getTime() - new Date(b.dataInicio).getTime()),
    [eventos, selectedDay]
  );
  const isPastSelectedDay = isBefore(startOfDay(selectedDay), startOfDay(new Date()));

  const abrirEdicao = async (pedidoReservaId: string) => {
    if (isPastSelectedDay) {
      setFeedback({ type: "error", message: "Não é permitido editar reservas em datas já passadas." });
      return;
    }
    const reserva = await apiFetch<ReservaAdmin>(`/api/reservas/${pedidoReservaId}`);
    setEditingReserva(reserva);
    setEditTitulo(reserva.titulo);
    setEditDescricao(reserva.descricao);
    setEditNumeroPessoas(reserva.numeroPessoas);
  };

  return (
    <main className="mx-auto max-w-7xl p-4 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Calendário administrativo</h1>
          <p className="text-sm text-slate-600">Selecione a sala, veja o mês e clique no dia para gestão por hora.</p>
        </div>
        <div className="w-full max-w-sm">
          <label className="mb-1 block text-sm font-medium text-slate-700">Sala</label>
          <select
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            value={selectedSalaId}
            onChange={(event) => setSelectedSalaId(event.target.value)}
          >
            {salas.map((sala) => (
              <option key={sala.id} value={sala.id}>
                {sala.nome} - {sala.localizacao}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button
          className={`rounded-lg px-3 py-2 text-sm ${viewMode === "month" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}
          onClick={() => setViewMode("month")}
        >
          Mês
        </button>
        <button
          className={`rounded-lg px-3 py-2 text-sm ${viewMode === "day" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}
          onClick={() => setViewMode("day")}
        >
          Dia/Horas
        </button>
      </div>

      {feedback && (
        <div
          className={`mt-3 rounded-lg border px-3 py-2 text-sm ${
            feedback.type === "error"
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {feedback.message}
        </div>
      )}

      <div className="mt-4">
        <CalendarioCustom
          eventos={eventos}
          viewMode={viewMode}
          disableDayInteractions={isPastSelectedDay}
          selectedDay={selectedDay}
          onSelectDay={(day) => {
            setSelectedDay(day);
            setViewMode("day");
          }}
          onBackToMonth={() => setViewMode("month")}
          onBaseDateChange={setMonthCursor}
          onEventClick={(evento) => {
            if (isPastSelectedDay) {
              setFeedback({ type: "error", message: "Não é permitido editar reservas em datas já passadas." });
              return;
            }
            if (evento.pedidoReservaId) {
              void abrirEdicao(evento.pedidoReservaId);
            }
          }}
          onSelectOccurrences={(occurrences) => {
            if (isPastSelectedDay) {
              setFeedback({ type: "error", message: "Não é permitido criar reservas em datas já passadas." });
              return;
            }
            setPendingOccurrences(occurrences);
            setModalOpen(true);
          }}
        />
      </div>

      <section className="mt-5 space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Reservas em {format(selectedDay, "dd/MM/yyyy")} ({eventosDoDia.length})
          </h2>
          <div className="flex items-center gap-2">
            {isPastSelectedDay && (
              <span className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-600">Dia passado (somente leitura)</span>
            )}
            {isLoading && <span className="text-xs text-slate-500">Atualizando...</span>}
          </div>
        </div>
        {eventosDoDia.length === 0 ? (
          <p className="text-sm text-slate-500">Sem reservas para este dia.</p>
        ) : (
          <div className="space-y-2">
            {eventosDoDia.map((evento) => (
              <article key={evento.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-900">{evento.title}</p>
                    <p className="text-xs text-slate-600">
                      {format(new Date(evento.dataInicio), "HH:mm")} - {format(new Date(evento.dataFim), "HH:mm")}
                    </p>
                    {evento.usuario && (
                      <p className="text-xs text-slate-600">
                        {evento.usuario.nome} ({evento.usuario.email})
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {!!evento.pedidoReservaId && (
                      <button
                        className={`rounded border px-2 py-1 text-xs ${
                          isPastSelectedDay
                            ? "cursor-not-allowed bg-slate-100 text-slate-400"
                            : "bg-white hover:bg-slate-100"
                        }`}
                        disabled={isPastSelectedDay}
                        onClick={() => void abrirEdicao(evento.pedidoReservaId!)}
                      >
                        Editar
                      </button>
                    )}
                    {!!evento.pedidoReservaId && (
                      <button
                        className={`rounded border px-2 py-1 text-xs ${
                          isPastSelectedDay
                            ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                            : "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                        }`}
                        disabled={isPastSelectedDay}
                        onClick={async () => {
                          if (isPastSelectedDay) {
                            setFeedback({ type: "error", message: "Não é permitido cancelar reservas em datas já passadas." });
                            return;
                          }
                          try {
                            await apiFetch(`/api/admin/reservas/${evento.pedidoReservaId}/cancelar`, {
                              method: "PATCH"
                            });
                            setFeedback({ type: "success", message: "Reserva cancelada com sucesso." });
                            await carregarEventos(selectedSalaId, monthCursor);
                          } catch (error) {
                            const message = error instanceof Error ? error.message : "Falha ao cancelar reserva.";
                            setFeedback({ type: "error", message });
                          }
                        }}
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {modalOpen && selectedSalaId && currentUser && (
        <ReservationModal
          salaId={selectedSalaId}
          pendingOccurrences={pendingOccurrences}
          onClose={() => setModalOpen(false)}
          onSubmit={async (payload) => {
            try {
              await apiFetch("/api/admin/reservas", {
                method: "POST",
                body: JSON.stringify({
                  ...payload,
                  usuarioId: currentUser.id
                })
              });
              setFeedback({ type: "success", message: "Reserva criada com sucesso." });
              setModalOpen(false);
              await carregarEventos(selectedSalaId, monthCursor);
            } catch (error) {
              const message = error instanceof Error ? error.message : "Falha ao criar reserva.";
              setFeedback({ type: "error", message });
            }
          }}
        />
      )}

      {editingReserva && (
        <div className="fixed inset-0 z-30 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-xl bg-white p-5">
            <h3 className="text-lg font-semibold">Editar reserva</h3>
            <div className="mt-3">
              <label className="mb-1 block text-sm font-medium text-slate-700">Título</label>
              <input
                className="w-full rounded border px-3 py-2"
                value={editTitulo}
                onChange={(event) => setEditTitulo(event.target.value)}
                placeholder="Título"
              />
            </div>
            <div className="mt-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Descrição</label>
              <textarea
                className="w-full rounded border px-3 py-2"
                value={editDescricao}
                onChange={(event) => setEditDescricao(event.target.value)}
                placeholder="Descrição"
              />
            </div>
            <div className="mt-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Quantidade de pessoas</label>
              <input
                className="w-full rounded border px-3 py-2"
                value={editNumeroPessoas}
                type="number"
                min={1}
                onChange={(event) => setEditNumeroPessoas(Number(event.target.value))}
              />
            </div>
            <div className="mt-3 flex gap-2">
              <button
                className="rounded bg-slate-900 px-3 py-2 text-sm text-white"
                onClick={async () => {
                  try {
                    await apiFetch(`/api/admin/reservas/${editingReserva.id}`, {
                      method: "PUT",
                      body: JSON.stringify({
                        titulo: editTitulo,
                        descricao: editDescricao,
                        numeroPessoas: editNumeroPessoas,
                        status: editingReserva.status,
                        usuarioId: editingReserva.usuarioId,
                        ocorrencias: editingReserva.ocorrencias
                      })
                    });
                    setEditingReserva(null);
                    setFeedback({ type: "success", message: "Reserva atualizada com sucesso." });
                    await carregarEventos(selectedSalaId, monthCursor);
                  } catch (error) {
                    const message = error instanceof Error ? error.message : "Falha ao atualizar reserva.";
                    setFeedback({ type: "error", message });
                  }
                }}
              >
                Guardar
              </button>
              <button className="rounded bg-slate-100 px-3 py-2 text-sm" onClick={() => setEditingReserva(null)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
