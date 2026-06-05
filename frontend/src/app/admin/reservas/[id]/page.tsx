"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";

export default function AdminReservaDetail() {
  const params = useParams<{ id: string }>();
  const reservaId = String(params.id);
  const [reserva, setReserva] = useState<any>(null);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  useEffect(() => {
    apiFetch<any>(`/api/reservas/${reservaId}`)
      .then((data) => {
        setReserva(data);
        setTitulo(data.titulo);
        setDescricao(data.descricao);
      })
      .catch(() => undefined);
  }, [reservaId]);
  if (!reserva) return <main className="p-8">A carregar...</main>;
  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="text-3xl font-bold">Reserva do administrador</h1>
      <input className="mt-3 w-full rounded border px-3 py-2" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
      <textarea className="mt-3 w-full rounded border px-3 py-2" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
      <button className="mt-3 rounded bg-slate-900 px-3 py-2 text-white" onClick={async () => {
        try {
          await apiFetch(`/api/admin/reservas/${reservaId}`, {
            method: "PUT",
            body: JSON.stringify({ titulo, descricao, ocorrencias: reserva.ocorrencias, status: reserva.status, usuarioId: reserva.usuarioId })
          });
        } catch {
          // AppShell handles unauthenticated redirects.
        }
      }}>Guardar alterações</button>
    </main>
  );
}
