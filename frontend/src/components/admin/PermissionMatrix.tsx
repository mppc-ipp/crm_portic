"use client";

import { useMemo } from "react";

export type PermCatalogItem = {
  modulo: string;
  label: string;
  modulo_base: string | null;
  permissoes: { codigo: string; label: string }[];
};

type Props = {
  catalog: PermCatalogItem[];
  selected: string[];
  onChange: (perms: string[]) => void;
  disabled?: boolean;
};

export default function PermissionMatrix({ catalog, selected, onChange, disabled }: Props) {
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  function toggle(codigo: string) {
    if (disabled) return;
    const next = new Set(selectedSet);
    if (next.has(codigo)) next.delete(codigo);
    else next.add(codigo);
    onChange([...next]);
  }

  function toggleModulo(mod: PermCatalogItem) {
    if (disabled) return;
    const codes = mod.permissoes.map((p) => p.codigo);
    const allOn = codes.every((c) => selectedSet.has(c));
    const next = new Set(selectedSet);
    if (allOn) codes.forEach((c) => next.delete(c));
    else codes.forEach((c) => next.add(c));
    if (mod.modulo_base) next.add(mod.modulo_base);
    onChange([...next]);
  }

  const modulosActivos = catalog.filter((mod) =>
    mod.permissoes.some((p) => selectedSet.has(p.codigo)) || (mod.modulo_base && selectedSet.has(mod.modulo_base))
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Módulos visíveis no menu:{" "}
        {modulosActivos.length > 0
          ? modulosActivos.map((m) => m.label).join(", ")
          : "nenhum"}
      </p>
      {catalog.map((mod) => {
        const expanded = mod.permissoes.some((p) => selectedSet.has(p.codigo));
        return (
          <div key={mod.modulo} className="rounded-lg border p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-sm">{mod.label}</span>
              <button
                type="button"
                disabled={disabled}
                onClick={() => toggleModulo(mod)}
                className="text-xs font-medium text-portic hover:underline disabled:opacity-50"
              >
                {expanded ? "Desmarcar módulo" : "Marcar módulo"}
              </button>
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {mod.permissoes.map((p) => (
                <label key={p.codigo} className="flex items-start gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    disabled={disabled}
                    checked={selectedSet.has(p.codigo)}
                    onChange={() => toggle(p.codigo)}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="block">{p.label}</span>
                    <span className="text-xs text-slate-400">{p.codigo}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
