"use client";

import { useEffect, useRef, useState } from "react";

export type ColunaEmpresaId =
  | "nif"
  | "cae"
  | "tipo"
  | "tipo_parceria"
  | "estado"
  | "setor"
  | "email"
  | "telefone"
  | "morada"
  | "codigo_postal"
  | "localidade"
  | "concelho"
  | "distrito"
  | "contactos"
  | "data_cadastro"
  | "ultima_interacao";

export type ColunaEmpresa = {
  id: ColunaEmpresaId;
  label: string;
  grupo: "geral" | "morada" | "outros";
};

export const COLUNAS_EMPRESA: ColunaEmpresa[] = [
  { id: "nif", label: "NIF", grupo: "geral" },
  { id: "cae", label: "CAE", grupo: "geral" },
  { id: "tipo", label: "Tipo", grupo: "geral" },
  { id: "tipo_parceria", label: "Tipo de parceria", grupo: "geral" },
  { id: "estado", label: "Estado", grupo: "geral" },
  { id: "setor", label: "Setor", grupo: "geral" },
  { id: "email", label: "Email", grupo: "geral" },
  { id: "telefone", label: "Telefone", grupo: "geral" },
  { id: "morada", label: "Morada", grupo: "morada" },
  { id: "codigo_postal", label: "Código postal", grupo: "morada" },
  { id: "localidade", label: "Localidade", grupo: "morada" },
  { id: "concelho", label: "Concelho", grupo: "morada" },
  { id: "distrito", label: "Distrito", grupo: "morada" },
  { id: "contactos", label: "Pessoas de contacto", grupo: "outros" },
  { id: "data_cadastro", label: "Data de cadastro", grupo: "outros" },
  { id: "ultima_interacao", label: "Última interação", grupo: "outros" },
];

const GRUPOS: { id: ColunaEmpresa["grupo"]; label: string }[] = [
  { id: "geral", label: "Dados gerais" },
  { id: "morada", label: "Morada" },
  { id: "outros", label: "Outros" },
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
    const filtradas = parsed.filter(
      (id): id is ColunaEmpresaId => typeof id === "string" && validas.has(id as ColunaEmpresaId)
    );
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
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const botaoRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!aberto) return;
    function fora(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, [aberto]);

  useEffect(() => {
    if (!aberto || !botaoRef.current) {
      setMenuPos(null);
      return;
    }
    const rect = botaoRef.current.getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
  }, [aberto]);

  function alternar(id: ColunaEmpresaId) {
    const next = visiveis.includes(id) ? visiveis.filter((c) => c !== id) : [...visiveis, id];
    const ordenadas = COLUNAS_EMPRESA.map((c) => c.id).filter((c) => next.includes(c));
    onChange(ordenadas);
    guardarColunasVisiveis(ordenadas);
  }

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        ref={botaoRef}
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="rounded px-1.5 py-0.5 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
        aria-label="Escolher colunas"
        title="Escolher colunas"
      >
        ⋯
      </button>
      {aberto && menuPos && (
        <div
          className="fixed z-50 max-h-[min(24rem,calc(100vh-2rem))] w-60 overflow-y-auto rounded-lg border border-slate-200 bg-white py-2 shadow-lg"
          style={{ top: menuPos.top, right: menuPos.right }}
        >
          <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Campos da tabela
          </p>
          {GRUPOS.map((grupo) => {
            const colunas = COLUNAS_EMPRESA.filter((c) => c.grupo === grupo.id);
            if (colunas.length === 0) return null;
            return (
              <div key={grupo.id} className="border-t border-slate-100 first:border-t-0">
                <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  {grupo.label}
                </p>
                {colunas.map((coluna) => (
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
            );
          })}
        </div>
      )}
    </div>
  );
}
