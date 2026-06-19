"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { T } from "./constants";

type EmpresaOpcao = {
  id: number;
  nome: string;
  nif: string;
};

type Props = {
  value: number | null;
  label?: string | null;
  onChange: (empresaId: number | null, empresaNome: string | null) => void;
  inputClassName?: string;
};

export default function EmpresaPicker({ value, label, onChange, inputClassName }: Props) {
  const [disponivel, setDisponivel] = useState<boolean | null>(null);
  const [pesquisa, setPesquisa] = useState("");
  const [resultados, setResultados] = useState<EmpresaOpcao[]>([]);
  const [aPesquisar, setAPesquisar] = useState(false);
  const [aberto, setAberto] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelado = false;
    apiFetch<EmpresaOpcao[]>("/api/empresas?q=")
      .then(() => {
        if (!cancelado) setDisponivel(true);
      })
      .catch(() => {
        if (!cancelado) setDisponivel(false);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  const pesquisar = useCallback(async (termo: string) => {
    if (!disponivel) return;
    setAPesquisar(true);
    try {
      const qs = termo.trim() ? `?q=${encodeURIComponent(termo.trim())}` : "";
      const data = await apiFetch<EmpresaOpcao[]>(`/api/empresas${qs}`);
      setResultados(data);
    } catch {
      setResultados([]);
    } finally {
      setAPesquisar(false);
    }
  }, [disponivel]);

  useEffect(() => {
    if (!disponivel || !aberto) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void pesquisar(pesquisa);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [pesquisa, aberto, disponivel, pesquisar]);

  useEffect(() => {
    function onClickFora(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberto(false);
      }
    }
    document.addEventListener("mousedown", onClickFora);
    return () => document.removeEventListener("mousedown", onClickFora);
  }, []);

  if (disponivel === false) return null;

  const inputCls = inputClassName ?? T.input;

  if (value && label) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
        <span className="flex-1 text-slate-700">{label}</span>
        <button
          type="button"
          onClick={() => {
            onChange(null, null);
            setPesquisa("");
            setResultados([]);
          }}
          className="text-slate-400 hover:text-slate-600"
          aria-label="Remover empresa"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={pesquisa}
        onChange={(e) => {
          setPesquisa(e.target.value);
          setAberto(true);
        }}
        onFocus={() => {
          setAberto(true);
          if (resultados.length === 0) void pesquisar(pesquisa);
        }}
        placeholder="Pesquisar empresa por nome ou NIF…"
        className={`w-full ${inputCls}`}
        autoComplete="off"
      />
      {aberto && (
        <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {aPesquisar && (
            <li className="px-3 py-2 text-sm text-slate-400">A pesquisar…</li>
          )}
          {!aPesquisar && resultados.length === 0 && (
            <li className="px-3 py-2 text-sm text-slate-400">Nenhuma empresa encontrada</li>
          )}
          {resultados.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                onClick={() => {
                  onChange(e.id, e.nome);
                  setPesquisa("");
                  setAberto(false);
                }}
              >
                <span className="font-medium text-slate-800">{e.nome}</span>
                {e.nif && <span className="ml-2 text-slate-400">{e.nif}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
