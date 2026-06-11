"use client";

import { useEffect, useState } from "react";
import { apiFetch, getStoredUser } from "@/lib/api";
import type { PermCatalogItem } from "@/components/admin/PermissionMatrix";

export default function ModulosPage() {
  const [catalog, setCatalog] = useState<PermCatalogItem[]>([]);
  const user = getStoredUser();

  useEffect(() => {
    apiFetch<{ catalogo: PermCatalogItem[] }>("/api/admin/permissoes").then((d) =>
      setCatalog(d.catalogo)
    );
  }, []);

  return (
    <div>
      <h2 className="mb-2 text-lg font-semibold">Módulos do sistema</h2>
      <p className="mb-6 text-sm text-slate-600">
        Visão dos módulos CRM activos e permissões base associadas.
      </p>
      <div className="mb-6 rounded-xl border bg-slate-50 p-4 text-sm">
        <p><strong>Sessão:</strong> {user?.nome}</p>
        <p className="mt-1"><strong>Administrador geral:</strong> {user?.admin_geral ? "Sim" : "Não"}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {catalog.map((mod) => (
          <div key={mod.modulo} className="rounded-xl border bg-white p-4">
            <h3 className="font-medium">{mod.label}</h3>
            {mod.modulo_base && (
              <p className="mt-1 text-xs text-slate-500">Permissão base: {mod.modulo_base}</p>
            )}
            <ul className="mt-3 space-y-1 text-sm text-slate-600">
              {mod.permissoes.map((p) => (
                <li key={p.codigo}>• {p.label}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
