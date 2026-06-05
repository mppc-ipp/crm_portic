"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Button, Card } from "@/components/ui/ui";

export default function AdminSalasPage() {
  const [salas, setSalas] = useState<any[]>([]);

  const load = () => apiFetch<any[]>("/api/admin/salas").then(setSalas).catch(() => setSalas([]));

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Tem a certeza de que pretende eliminar esta sala?")) return;
    try {
      await apiFetch(`/api/admin/salas/${id}`, { method: "DELETE" });
      load();
    } catch {
      // AppShell handles unauthenticated redirects.
    }
  };

  return (
    <main className="mx-auto max-w-6xl p-4 md:p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Gestão de salas</h1>
        <Link href="/admin/salas/nova">
          <Button className="bg-blue-700 hover:bg-blue-600 focus:ring-blue-300">+</Button>
        </Link>
      </div>
      <div className="mt-4 grid gap-3">
        {salas.map((s) => (
          <Card key={s.id} className="flex items-center justify-between">
            <div>
              <p className="font-semibold">{s.nome}</p>
              <p className="text-xs text-slate-600">
                {(s.unidade?.nome ?? "Unidade")} · {s.localizacao} · Capacidade {s.capacidade}
                {s.visibilidade === "PUBLICO_GERAL" ? " · Comunidade não académica ativa" : " · Só público académico"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/admin/salas/${s.id}/editar`}
                className="rounded-lg border border-blue-200 bg-blue-100 px-3 py-2 text-sm text-blue-700 transition hover:bg-blue-200"
                title="Editar sala"
              >
                ✎
              </Link>
              <button
                type="button"
                className="rounded-lg border border-rose-200 bg-rose-100 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-200 focus:outline-none focus:ring-2 focus:ring-rose-300"
                title="Eliminar sala"
                onClick={() => handleDelete(s.id)}
              >
                🗑
              </button>
            </div>
          </Card>
        ))}
      </div>
    </main>
  );
}
