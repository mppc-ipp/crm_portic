"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type Formulario = {
  id: number;
  titulo: string;
  ativo: boolean;
  edicao_ano: number;
  link_publico: string;
};

export default function FormulariosPage() {
  const [items, setItems] = useState<Formulario[]>([]);

  useEffect(() => {
    apiFetch<Formulario[]>("/api/startups/formularios")
      .then(setItems)
      .catch(console.error);
  }, []);

  return (
    <div>
      <Link href="/startups" className="text-sm text-portic hover:underline">
        ← Startups
      </Link>
      <h1 className="text-2xl font-bold mt-2 mb-4">Formulários de candidatura</h1>
      <div className="space-y-3">
        {items.map((f) => (
          <div key={f.id} className="bg-white border rounded-xl p-4">
            <p className="font-semibold">
              {f.titulo} ({f.edicao_ano})
              {!f.ativo && <span className="text-red-500 text-sm ml-2">inativo</span>}
            </p>
            <a
              href={f.link_publico}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-portic hover:underline break-all"
            >
              {f.link_publico}
            </a>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-slate-500">
            Crie formulários no{" "}
            <a href="http://localhost:8000/admin/startups/formulariocandidatura/" className="underline">
              Django Admin
            </a>
            .
          </p>
        )}
      </div>
    </div>
  );
}
