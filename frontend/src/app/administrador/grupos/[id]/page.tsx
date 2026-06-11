"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import PermissionMatrix, { type PermCatalogItem } from "@/components/admin/PermissionMatrix";
import { apiFetch } from "@/lib/api";

type Grupo = {
  id: number;
  nome: string;
  permissoes: string[];
};

export default function EditarGrupoPage() {
  const params = useParams();
  const id = params.id as string;
  const [grupo, setGrupo] = useState<Grupo | null>(null);
  const [catalog, setCatalog] = useState<PermCatalogItem[]>([]);
  const [permissoes, setPermissoes] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState(false);

  useEffect(() => {
    Promise.all([
      apiFetch<Grupo>(`/api/admin/grupos/${id}`),
      apiFetch<{ catalogo: PermCatalogItem[] }>("/api/admin/permissoes"),
    ]).then(([g, cat]) => {
      setGrupo(g);
      setPermissoes(g.permissoes);
      setCatalog(cat.catalogo);
    });
  }, [id]);

  async function guardar() {
    setSaving(true);
    setErro("");
    setOk(false);
    try {
      await apiFetch(`/api/admin/grupos/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ permissoes }),
      });
      setOk(true);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao guardar");
    } finally {
      setSaving(false);
    }
  }

  if (!grupo) return <p className="text-sm text-slate-500">A carregar…</p>;

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <Link href="/administrador/grupos" className="text-sm text-portic hover:underline">
          ← Grupos
        </Link>
        <h2 className="text-lg font-semibold">{grupo.nome}</h2>
      </div>
      <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        Alterações às permissões deste grupo afectam imediatamente todos os utilizadores que pertencem a ele.
      </p>
      {erro && <p className="mb-3 text-sm text-red-600">{erro}</p>}
      {ok && <p className="mb-3 text-sm text-green-700">Permissões guardadas.</p>}
      <PermissionMatrix catalog={catalog} selected={permissoes} onChange={setPermissoes} />
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={() => void guardar()}
          disabled={saving}
          className="rounded-lg bg-portic px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? "A guardar…" : "Guardar permissões"}
        </button>
      </div>
    </div>
  );
}
