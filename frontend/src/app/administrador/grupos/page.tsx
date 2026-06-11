"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type Grupo = {
  id: number;
  nome: string;
  num_utilizadores: number;
};

export default function GruposPage() {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<Grupo[]>("/api/admin/grupos")
      .then(setGrupos)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h2 className="mb-2 text-lg font-semibold">Grupos</h2>
      <p className="mb-4 text-sm text-slate-600">
        Grupos predefinidos do CRM. Alterar permissões de um grupo afecta todos os seus membros.
      </p>
      {loading ? (
        <p className="text-sm text-slate-500">A carregar…</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {grupos.map((g) => (
            <Link
              key={g.id}
              href={`/administrador/grupos/${g.id}`}
              className="block rounded-xl border bg-white p-4 transition hover:border-portic"
            >
              <h3 className="font-medium">{g.nome}</h3>
              <p className="mt-1 text-sm text-slate-600">
                {g.num_utilizadores} utilizador{g.num_utilizadores !== 1 ? "es" : ""}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
