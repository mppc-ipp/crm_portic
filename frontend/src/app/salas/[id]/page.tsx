"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Sala } from "@/lib/types";

export default function SalaDetalhePage() {
  const params = useParams<{ id: string }>();
  const salaId = String(params.id);
  const [sala, setSala] = useState<Sala | null>(null);

  useEffect(() => {
    apiFetch<Sala>(`/api/salas/${salaId}`).then(setSala).catch(() => setSala(null));
  }, [salaId]);

  if (!sala) return <main className="p-8">A carregar...</main>;
  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-3xl font-bold">{sala.nome}</h1>
      <p className="mt-2">{sala.descricao}</p>
      <p className="mt-1">Capacidade: {sala.capacidade}</p>
      <p className="mt-1">Localização: {sala.localizacao}</p>
      <Link className="mt-4 inline-block rounded bg-blue-600 px-3 py-2 text-white" href={`/salas/${sala.id}/calendario`}>Ver calendário</Link>
    </main>
  );
}
