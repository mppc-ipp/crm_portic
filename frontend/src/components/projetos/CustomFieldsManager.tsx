"use client";

import { useState } from "react";
import type { CampoPersonalizado } from "./types";

type Props = {
  campos: CampoPersonalizado[];
  onAdd: (nome: string, tipo: CampoPersonalizado["tipo"]) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
};

export default function CustomFieldsManager({ campos, onAdd, onDelete }: Props) {
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<CampoPersonalizado["tipo"]>("TEXTO");

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAberto(!aberto)}
        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
      >
        Campos ({campos.length})
      </button>
      {aberto && (
        <div className="absolute right-0 top-full z-30 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
          <h4 className="text-sm font-semibold text-slate-800">Campos personalizados</h4>
          <ul className="mt-2 space-y-1">
            {campos.map((c) => (
              <li key={c.id} className="flex items-center justify-between text-sm text-slate-600">
                <span>
                  {c.nome} <span className="text-xs text-slate-400">({c.tipo})</span>
                </span>
                <button type="button" onClick={() => void onDelete(c.id)} className="text-xs text-rose-500">
                  ✕
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex gap-2">
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome do campo"
              className="flex-1 rounded border border-slate-200 px-2 py-1 text-xs"
            />
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as CampoPersonalizado["tipo"])}
              className="rounded border border-slate-200 px-1 text-xs"
            >
              <option value="TEXTO">Texto</option>
              <option value="NUMERO">Número</option>
              <option value="DATA">Data</option>
            </select>
          </div>
          <button
            type="button"
            disabled={!nome.trim()}
            onClick={() =>
              void onAdd(nome.trim(), tipo).then(() => {
                setNome("");
              })
            }
            className="mt-2 w-full rounded-lg bg-slate-800 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          >
            Adicionar campo
          </button>
        </div>
      )}
    </div>
  );
}
