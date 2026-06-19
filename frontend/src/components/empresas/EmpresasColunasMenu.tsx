"use client";

import { useEffect, useRef, useState } from "react";

export type ColunaEmpresaId =
  | "nif"
  | "cae"
  | "tipo"
  | "estado"
  | "setor"
  | "email"
  | "telefone"
  | "localidade"
  | "ultima_interacao";

export type ColunaEmpresa = {
  id: ColunaEmpresaId;
  label: string;
};

export const COLUNAS_EMPRESA: ColunaEmpresa[] = [
  { id: "nif", label: "NIF" },
  { id: "cae", label: "CAE" },
  { id: "tipo", label: "Tipo" },
  { id: "estado", label: "Estado" },
  { id: "setor", label: "Setor" },
  { id: "email", label: "Email" },
  { id: "telefone", label: "Telefone" },
  { id: "localidade", label: "Localidade" },
  { id: "ultima_interacao", label: "Última interação" },
];

export const COLUNAS_EMPRESA_PADRAO: ColunaEmpresaId[] = [
  "nif",
  "cae",
  "tipo",
  "estado",
  "setor",
];

const STORAGE_KEY = "crm.empresas.colunasVisiveis";

export function lerColunasVisiveis(): ColunaEmpresaId[] {
  if (typeof window === "undefined") return COLUNAS_EMPRESA_PADRAO;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return COLUNAS_EMPRESA_PADRAO;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return COLUNAS_EMPRESA_PADRAO;
    const validas = new Set(COLUNAS_EMPRESA.map((c) => c.id));
    const filtradas = parsed.filter((id): id is ColunaEmpresaId => typeof id === "string" && validas.has(id as ColunaEmpresaId));
    return filtradas.length > 0 ? filtradas : COLUNAS_EMPRESA_PADRAO;
  } catch {
    return COLUNAS_EMPRESA_PADRAO;
  }
}

export function guardarColunasVisiveis(colunas: ColunaEmpresaId[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(colunas));
}

type Props = {
  visiveis: ColunaEmpresaId[];
  onChange: (colunas: ColunaEmpresaId[]) => void;
};

export default function EmpresasColunasMenu({ visiveis, onChange }: Props) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    function fora(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, [aberto]);

  function alternar(id: ColunaEmpresaId) {
    const next = visiveis.includes(id) ? visiveis.filter((c) => c !== id) : [...visiveis, id];
    const ordenadas = COLUNAS_EMPRESA.map((c) => c.id).filter((c) => next.includes(c));
    onChange(ordenadas);
    guardarColunasVisiveis(ordenadas);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="rounded px-1.5 py-0.5 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
        aria-label="Escolher colunas"
        title="Escolher colunas"
      >
        ⋯
      </button>
      {aberto && (
        <div className="absolute right-0 z-20 mt-1 w-52 rounded-lg border border-slate-200 bg-white py-2 shadow-lg">
          <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Colunas</p>
          {COLUNAS_EMPRESA.map((coluna) => (
            <label
              key={coluna.id}
              className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              <input
                type="checkbox"
                checked={visiveis.includes(coluna.id)}
                onChange={() => alternar(coluna.id)}
                className="rounded border-slate-300"
              />
              {coluna.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
