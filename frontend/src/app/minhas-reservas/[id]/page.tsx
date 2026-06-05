"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";

export default function MinhaReservaDetalhePage() {
  const params = useParams<{ id: string }>();
  const reservaId = String(params.id);
  const [item, setItem] = useState<any>(null);
  useEffect(() => { apiFetch(`/api/reservas/${reservaId}`).then(setItem).catch(() => setItem(null)); }, [reservaId]);
  if (!item) return <main className="p-8">A carregar...</main>;

  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="text-3xl font-bold">{item.titulo}</h1>
      <p className="mt-2">Estado: {item.status}</p>
      <p className="mt-2">{item.descricao}</p>
      <button
        className="mt-4 rounded bg-red-600 px-3 py-2 text-white"
        onClick={async () => {
          try {
            await apiFetch(`/api/reservas/${item.id}/cancelar`, { method: "PATCH" });
            const updated = await apiFetch(`/api/reservas/${reservaId}`);
            setItem(updated);
          } catch {
            // AppShell handles unauthenticated redirects.
          }
        }}
      >
        Cancelar
      </button>
    </main>
  );
}
