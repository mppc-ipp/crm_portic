"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";

export type EmpresaVinculada = {
  id: number;
  nome: string;
  nif?: string;
};

type Props = {
  selecionadas: EmpresaVinculada[];
  onChange: (empresas: EmpresaVinculada[]) => void;
  editavel?: boolean;
  labelClass?: string;
  inputClass?: string;
};

export default function EmpresasVincular({
  selecionadas,
  onChange,
  editavel = true,
  labelClass = "block text-sm text-slate-600",
  inputClass = "mt-1 w-full rounded-lg border px-3 py-2 text-sm",
}: Props) {
  const [disponivel, setDisponivel] = useState<boolean | null>(null);
  const [pesquisa, setPesquisa] = useState("");
  const [resultados, setResultados] = useState<EmpresaVinculada[]>([]);
  const [aPesquisar, setAPesquisar] = useState(false);
  const [aberto, setAberto] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelado = false;
    apiFetch<EmpresaVinculada[]>("/api/empresas?q=")
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
      const data = await apiFetch<EmpresaVinculada[]>(`/api/empresas${qs}`);
      setResultados(data);
    } catch {
      setResultados([]);
    } finally {
      setAPesquisar(false);
    }
  }, [disponivel]);

  useEffect(() => {
    if (!disponivel || !aberto || !editavel) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void pesquisar(pesquisa);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [pesquisa, aberto, disponivel, editavel, pesquisar]);

  useEffect(() => {
    function onClickFora(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberto(false);
      }
    }
    document.addEventListener("mousedown", onClickFora);
    return () => document.removeEventListener("mousedown", onClickFora);
  }, []);

  function adicionar(empresa: EmpresaVinculada) {
    if (selecionadas.some((e) => e.id === empresa.id)) return;
    onChange([...selecionadas, empresa]);
    setPesquisa("");
    setAberto(false);
  }

  function remover(id: number) {
    onChange(selecionadas.filter((e) => e.id !== id));
  }

  if (disponivel === false) return null;

  const idsSeleccionados = new Set(selecionadas.map((e) => e.id));
  const resultadosFiltrados = resultados.filter((e) => !idsSeleccionados.has(e.id));

  return (
    <div>
      <label className={labelClass}>
        Vincular empresa <span className="font-normal text-slate-400">(opcional)</span>
      </label>
      {editavel && selecionadas.length === 0 && (
        <p className="mt-0.5 text-xs text-slate-500">
          Pode publicar sem vincular empresa. Se vincular, a publicação aparece no histórico da empresa.
        </p>
      )}
      {selecionadas.length > 0 && (
        <ul className="mt-2 space-y-2">
          {selecionadas.map((empresa) => (
            <li
              key={empresa.id}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
            >
              <span className="flex-1 text-slate-700">{empresa.nome}</span>
              {editavel && (
                <button
                  type="button"
                  onClick={() => remover(empresa.id)}
                  className="text-slate-400 hover:text-slate-600"
                  aria-label={`Remover ${empresa.nome}`}
                >
                  ✕
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {editavel && (
        <div ref={containerRef} className="relative mt-2">
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
            className={inputClass}
            autoComplete="off"
          />
          {aberto && (
            <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
              {aPesquisar && (
                <li className="px-3 py-2 text-sm text-slate-400">A pesquisar…</li>
              )}
              {!aPesquisar && resultadosFiltrados.length === 0 && (
                <li className="px-3 py-2 text-sm text-slate-400">Nenhuma empresa encontrada</li>
              )}
              {resultadosFiltrados.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                    onClick={() => adicionar(e)}
                  >
                    <span className="font-medium text-slate-800">{e.nome}</span>
                    {e.nif && <span className="ml-2 text-slate-400">{e.nif}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {!editavel && selecionadas.length === 0 && (
        <p className="mt-1 text-sm text-slate-500">Nenhuma empresa vinculada.</p>
      )}
    </div>
  );
}
