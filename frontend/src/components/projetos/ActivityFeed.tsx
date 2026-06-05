"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { Atividade } from "./types";

export default function ActivityFeed({ projetoId }: { projetoId: number }) {
  const [items, setItems] = useState<Atividade[]>([]);
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    apiFetch<Atividade[]>(`/api/projetos/${projetoId}/atividade`)
      .then(setItems)
      .catch(() => setItems([]));
  }, [projetoId, aberto]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAberto(!aberto)}
        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
      >
        Atividade
      </button>
      {aberto && (
        <div className="absolute right-0 top-full z-30 mt-2 w-80 rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="border-b px-4 py-2 text-sm font-semibold text-slate-800">Feed de atividade</div>
          <div className="max-h-80 overflow-y-auto p-3">
            {items.map((a) => (
              <div key={a.id} className="mb-3 border-b border-slate-50 pb-3 last:mb-0 last:border-0">
                <p className="text-sm text-slate-800">{a.descricao}</p>
                <p className="mt-0.5 text-[10px] text-slate-400">
                  {a.utilizador_nome} · {new Date(a.created_at).toLocaleString("pt-PT")}
                </p>
              </div>
            ))}
            {!items.length && <p className="text-sm text-slate-400">Sem atividade registada.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
