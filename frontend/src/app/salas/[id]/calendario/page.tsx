"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import CalendarioCustom from "@/components/calendar/CalendarioCustom";
import ReservationModal from "@/components/calendar/ReservationModal";
import { apiFetch } from "@/lib/api";
import { EventoCalendario, Sala } from "@/lib/types";

export default function SalaCalendarioPage() {
  const params = useParams<{ id: string }>();
  const salaId = params.id ? String(params.id) : "";
  const [eventos, setEventos] = useState<EventoCalendario[]>([]);
  const [sala, setSala] = useState<Sala | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingOccurrences, setPendingOccurrences] = useState<Array<{ inicio: Date; fim: Date }>>([]);
  const [erro, setErro] = useState("");
  const [aCarregar, setACarregar] = useState(true);
  const hoje = useMemo(() => new Date(), []);

  const carregarEventos = useCallback(async () => {
    if (!salaId) return;
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1).toISOString();
    const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 2, 1).toISOString();
    const data = await apiFetch<EventoCalendario[]>(
      `/api/calendario?salaId=${encodeURIComponent(salaId)}&inicio=${encodeURIComponent(inicio)}&fim=${encodeURIComponent(fim)}`
    );
    setEventos(data);
  }, [hoje, salaId]);

  useEffect(() => {
    if (!salaId) {
      setErro("Identificador da sala inválido.");
      setSala(null);
      setEventos([]);
      setACarregar(false);
      return;
    }

    let cancelled = false;
    setACarregar(true);
    setErro("");

    void (async () => {
      try {
        const salaData = await apiFetch<Sala>(`/api/salas/${encodeURIComponent(salaId)}`);
        if (cancelled) return;
        setSala(salaData);
        await carregarEventos();
      } catch (e) {
        if (cancelled) return;
        setSala(null);
        setEventos([]);
        const mensagem = e instanceof Error ? e.message : "Não foi possível carregar o calendário.";
        setErro(mensagem);
      } finally {
        if (!cancelled) setACarregar(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [salaId, carregarEventos]);

  const recarregarAposReserva = async () => {
    try {
      await carregarEventos();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível atualizar o calendário.");
    }
  };

  return (
    <main className="mx-auto max-w-7xl p-8">
      <h1 className="mb-1 text-3xl font-bold">Calendário da sala</h1>
      <p className="mb-4 text-sm text-slate-600">
        Sala:{" "}
        <span className="font-semibold text-slate-800">
          {aCarregar ? "A carregar..." : (sala?.nome ?? "—")}
        </span>
      </p>
      {erro && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <p>{erro}</p>
          <Link href="/salas" className="mt-2 inline-block font-medium text-rose-900 underline">
            Voltar à lista de salas
          </Link>
        </div>
      )}
      {!erro && (
        <CalendarioCustom
          eventos={eventos}
          onSelectOccurrences={(occurrences) => {
            setPendingOccurrences(occurrences);
            setModalOpen(true);
          }}
        />
      )}
      {modalOpen && sala && (
        <ReservationModal
          salaId={salaId}
          pendingOccurrences={pendingOccurrences}
          onClose={() => setModalOpen(false)}
          onSubmit={async (payload) => {
            await apiFetch("/api/reservas", { method: "POST", body: JSON.stringify(payload) });
            setModalOpen(false);
            await recarregarAposReserva();
          }}
        />
      )}
    </main>
  );
}
