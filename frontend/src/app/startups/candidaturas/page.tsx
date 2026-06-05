"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type Candidatura = {
  id: number;
  nome_startup: string;
  email_contacto: string;
  estado_display: string;
  edicao_ano: number;
  submetida_em: string;
};

export default function CandidaturasPage() {
  const [items, setItems] = useState<Candidatura[]>([]);

  useEffect(() => {
    apiFetch<Candidatura[]>("/api/startups/candidaturas")
      .then(setItems)
      .catch(console.error);
  }, []);

  return (
    <div>
      <Link href="/startups" className="text-sm text-portic hover:underline">
        ← Startups
      </Link>
      <h1 className="text-2xl font-bold mt-2 mb-4">Candidaturas</h1>
      <div className="space-y-3">
        {items.map((c) => (
          <div key={c.id} className="bg-white border rounded-xl p-4">
            <p className="font-semibold">{c.nome_startup}</p>
            <p className="text-sm text-slate-600">
              {c.estado_display} · Edição {c.edicao_ano} · {c.email_contacto}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {new Date(c.submetida_em).toLocaleString("pt-PT")}
            </p>
          </div>
        ))}
        {items.length === 0 && <p className="text-slate-500">Sem candidaturas.</p>}
      </div>
    </div>
  );
}
