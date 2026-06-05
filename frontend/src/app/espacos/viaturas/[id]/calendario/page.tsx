"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import CalendarioCustom from "@/components/calendar/CalendarioCustom";
import ReservationModal from "@/components/calendar/ReservationModal";
import { apiFetch } from "@/lib/api";
import type { EventoCalendario } from "@/lib/types";

export default function ViaturaCalendarioPage() {
  const params = useParams<{ id: string }>();
  const viaturaId = params.id ? String(params.id) : "";
  const [eventos, setEventos] = useState<EventoCalendario[]>([]);
  const [nome, setNome] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingOccurrences, setPendingOccurrences] = useState<Array<{ inicio: Date; fim: Date }>>([]);
  const hoje = useMemo(() => new Date(), []);

  const carregarEventos = useCallback(async () => {
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1).toISOString();
    const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 2, 1).toISOString();
    const data = await apiFetch<EventoCalendario[]>(
      `/api/viaturas/calendario?viaturaId=${viaturaId}&inicio=${encodeURIComponent(inicio)}&fim=${encodeURIComponent(fim)}`
    );
    setEventos(data);
  }, [hoje, viaturaId]);

  useEffect(() => {
    if (!viaturaId) return;
    void (async () => {
      const v = await apiFetch<{ nome: string }>(`/api/viaturas/${viaturaId}`);
      setNome(v.nome);
      await carregarEventos();
    })();
  }, [viaturaId, carregarEventos]);

  return (
    <div>
      <Link href="/espacos/viaturas" className="text-sm text-viaturas hover:underline">
        ← Viaturas
      </Link>
      <h1 className="text-2xl font-bold mt-2 text-viaturas">{nome || "Calendário"}</h1>
      <CalendarioCustom
        eventos={eventos}
        onSelectOccurrences={(occ) => {
          setPendingOccurrences(occ);
          setModalOpen(true);
        }}
      />
      {modalOpen && (
        <ReservationModal
          salaId={viaturaId}
          recursoField="viaturaId"
          pendingOccurrences={pendingOccurrences}
          onClose={() => {
            setModalOpen(false);
            setPendingOccurrences([]);
          }}
          onSubmit={async ({ titulo, descricao, numeroPessoas, ocorrencias }) => {
            await apiFetch("/api/viaturas/reservas", {
              method: "POST",
              body: JSON.stringify({
                titulo,
                descricao,
                numero_pessoas: numeroPessoas,
                modulo: "VIATURA",
                ocorrencias,
              }),
            });
            setModalOpen(false);
            setPendingOccurrences([]);
            await carregarEventos();
          }}
        />
      )}
    </div>
  );
}
