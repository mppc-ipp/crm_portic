"use client";

import { FormEvent, useEffect, useState } from "react";
import { T } from "./constants";

type Props = {
  onClose: () => void;
  onCreate: (nome: string) => Promise<void>;
};

export default function CreateSectionModal({ onClose, onCreate }: Props) {
  const [nome, setNome] = useState("");
  const [aGuardar, setAGuardar] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;
    setAGuardar(true);
    setErro("");
    try {
      await onCreate(nome.trim());
      onClose();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao criar secção");
    } finally {
      setAGuardar(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">Nova secção</h2>
          <p className="mt-1 text-sm text-slate-500">Defina um nome para a coluna ou grupo de tarefas.</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4 px-6 py-5">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Nome *</span>
            <input
              autoFocus
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Backlog, Sprint 1, Em revisão…"
              className={`mt-1 w-full ${T.input}`}
            />
          </label>
          {erro && <p className="text-sm text-red-600">{erro}</p>}
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button type="submit" disabled={!nome.trim() || aGuardar} className={T.btnPrimary}>
              {aGuardar ? "A criar…" : "Criar secção"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
