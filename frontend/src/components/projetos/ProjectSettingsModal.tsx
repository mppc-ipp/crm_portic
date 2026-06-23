"use client";

import { FormEvent, useEffect, useState } from "react";
import { T } from "./constants";
import MembroEmailList, { extrairEmailsValidos } from "./MembroEmailList";
import { buildThemeStyle, normalizarCor, PALETA_CORES } from "./projectTheme";
import type { MembroProjeto } from "./types";

export type ProjetoSettingsData = {
  nome: string;
  cor: string;
  membrosEmails: string[];
};

type Props = {
  nomeInicial: string;
  corInicial: string;
  membros: MembroProjeto[];
  onClose: () => void;
  onSave: (data: ProjetoSettingsData) => Promise<void>;
};

export default function ProjectSettingsModal({
  nomeInicial,
  corInicial,
  membros,
  onClose,
  onSave,
}: Props) {
  const [nome, setNome] = useState(nomeInicial);
  const [cor, setCor] = useState(corInicial);
  const [emails, setEmails] = useState<string[]>(
    membros.length > 0 ? membros.map((m) => m.email) : [""]
  );
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
      await onSave({
        nome: nome.trim(),
        cor: normalizarCor(cor),
        membrosEmails: extrairEmailsValidos(emails),
      });
      onClose();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao guardar definições");
    } finally {
      setAGuardar(false);
    }
  }

  const corAtiva = normalizarCor(cor);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="projeto-themed w-full max-w-lg rounded-xl bg-white shadow-xl"
        style={buildThemeStyle(corAtiva)}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">Definições do projeto</h2>
        </div>
        <form onSubmit={onSubmit} className="space-y-4 px-6 py-5">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Título *</span>
            <input
              autoFocus
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className={`mt-1 w-full ${T.input}`}
            />
          </label>

          <fieldset>
            <legend className="text-sm font-medium text-slate-700">Cor do projeto</legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {PALETA_CORES.map((p) => (
                <button
                  key={p.cor}
                  type="button"
                  title={p.label}
                  onClick={() => setCor(p.cor)}
                  className={`h-9 w-9 rounded-full border-2 transition ${
                    corAtiva.toLowerCase() === p.cor.toLowerCase()
                      ? "border-slate-900 ring-2 ring-offset-2 ring-slate-400"
                      : "border-white shadow-sm hover:scale-105"
                  }`}
                  style={{ backgroundColor: p.cor }}
                />
              ))}
            </div>
            <label className="mt-3 flex items-center gap-3">
              <span className="text-sm text-slate-600">Personalizada:</span>
              <input
                type="color"
                value={corAtiva}
                onChange={(e) => setCor(e.target.value)}
                className="h-9 w-12 cursor-pointer rounded border border-slate-200 bg-white p-0.5"
              />
              <span className="font-mono text-xs text-slate-500">{corAtiva}</span>
            </label>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-medium text-slate-700">Membros</legend>
            <p className="mt-1 text-xs text-slate-500">
              Pesquise por nome ou email. Podem ser atribuídas a tarefas mesmo sem cadastro na plataforma.
            </p>
            <div className="mt-3">
              <MembroEmailList emails={emails} onChange={setEmails} membrosExistentes={membros} />
            </div>
          </fieldset>

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
              {aGuardar ? "A guardar…" : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
