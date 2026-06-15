"use client";

import { FormEvent, useEffect, useState } from "react";
import { T } from "./constants";
import type { Atribuivel } from "./types";
import { parseAtribuicaoKey } from "./utils";

export type NovaTarefaData = {
  titulo: string;
  descricao: string;
  data_limite: string | null;
  responsavel: number | null;
  responsavel_email: string;
};

type Props = {
  secaoNome: string;
  atribuiveis: Atribuivel[];
  onClose: () => void;
  onCreate: (data: NovaTarefaData) => Promise<void>;
};

export default function CreateTaskModal({ secaoNome, atribuiveis, onClose, onCreate }: Props) {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [dataLimite, setDataLimite] = useState("");
  const [atribuicao, setAtribuicao] = useState("");
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
    if (!titulo.trim()) return;
    setAGuardar(true);
    setErro("");
    try {
      const { responsavel, responsavel_email } = parseAtribuicaoKey(atribuicao);
      await onCreate({
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        data_limite: dataLimite || null,
        responsavel,
        responsavel_email,
      });
      onClose();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao criar tarefa");
    } finally {
      setAGuardar(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-lg rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="nova-tarefa-titulo"
      >
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 id="nova-tarefa-titulo" className="text-lg font-bold text-slate-900">
            Nova tarefa
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Secção: <span className="font-medium text-slate-700">{secaoNome}</span>
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 px-6 py-5">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Título *</span>
            <input
              autoFocus
              required
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="O que precisa de ser feito?"
              className={`mt-1 w-full ${T.input}`}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Descrição</span>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={3}
              placeholder="Detalhes, notas ou contexto…"
              className={`mt-1 w-full resize-none ${T.input}`}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Data limite</span>
              <input
                type="date"
                value={dataLimite}
                onChange={(e) => setDataLimite(e.target.value)}
                className={`mt-1 w-full ${T.input}`}
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Atribuído a</span>
              <select
                value={atribuicao}
                onChange={(e) => setAtribuicao(e.target.value)}
                className={`mt-1 w-full ${T.input}`}
              >
                <option value="">Ninguém</option>
                {atribuiveis.map((a) => (
                  <option key={a.key} value={a.key}>
                    {a.label}
                  </option>
                ))}
              </select>
              {atribuiveis.length === 0 && (
                <p className="mt-1 text-xs text-amber-700">
                  Adicione membros nas definições do projeto (roda dentada).
                </p>
              )}
            </label>
          </div>

          {erro && <p className="text-sm text-red-600">{erro}</p>}

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!titulo.trim() || aGuardar}
              className={T.btnPrimary}
            >
              {aGuardar ? "A criar…" : "Criar tarefa"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
