"use client";

import { useState } from "react";
import type { VistaGuardada, VistaProjeto } from "./types";

type Props = {
  vistas: VistaGuardada[];
  vistaAtual: VistaProjeto;
  filtros: Record<string, string>;
  onApply: (vista: VistaGuardada) => void;
  onSave: (nome: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
};

export default function SavedViewsBar({ vistas, vistaAtual, filtros, onApply, onSave, onDelete }: Props) {
  const [nome, setNome] = useState("");
  const [aGuardar, setAGuardar] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-6 py-2">
      <span className="text-xs font-medium text-slate-400">Vistas:</span>
      {vistas.map((v) => (
        <button
          key={v.id}
          type="button"
          onClick={() => onApply(v)}
          className={`group flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition ${
            v.tipo_vista === vistaAtual
              ? "bg-proj-10 text-proj"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          {v.nome}
          {v.padrao && <span className="text-[10px]">★</span>}
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              void onDelete(v.id);
            }}
            onKeyDown={(e) => e.key === "Enter" && void onDelete(v.id)}
            className="ml-1 hidden text-slate-400 group-hover:inline hover:text-rose-500"
          >
            ✕
          </span>
        </button>
      ))}
      {aGuardar ? (
        <input
          autoFocus
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && nome.trim()) {
              void onSave(nome.trim()).then(() => {
                setNome("");
                setAGuardar(false);
              });
            }
            if (e.key === "Escape") setAGuardar(false);
          }}
          placeholder="Nome da vista"
          className="rounded-lg border border-slate-200 px-2 py-1 text-xs outline-none focus:border-proj"
        />
      ) : (
        <button
          type="button"
          onClick={() => setAGuardar(true)}
          className="rounded-full px-3 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100"
          title={`Guardar vista atual (${vistaAtual}) com filtros: ${JSON.stringify(filtros)}`}
        >
          + Guardar vista
        </button>
      )}
    </div>
  );
}
