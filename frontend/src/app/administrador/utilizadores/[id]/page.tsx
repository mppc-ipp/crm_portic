"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import UserForm, { type UserFormData } from "@/components/admin/UserForm";
import type { PermCatalogItem } from "@/components/admin/PermissionMatrix";
import { apiFetch } from "@/lib/api";

type Utilizador = UserFormData & { id: number; username: string };

export default function EditarUtilizadorPage() {
  const params = useParams();
  const id = params.id as string;
  const [user, setUser] = useState<Utilizador | null>(null);
  const [catalog, setCatalog] = useState<PermCatalogItem[]>([]);
  const [grupos, setGrupos] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    Promise.all([
      apiFetch<Utilizador>(`/api/admin/utilizadores/${id}`),
      apiFetch<{ catalogo: PermCatalogItem[]; grupos: string[] }>("/api/admin/permissoes"),
    ]).then(([u, cat]) => {
      setUser(u);
      setCatalog(cat.catalogo);
      setGrupos(cat.grupos);
    });
  }, [id]);

  async function guardar(data: UserFormData) {
    setSaving(true);
    setErro("");
    try {
      const payload = { ...data };
      if (!payload.password) delete (payload as { password?: string }).password;
      const updated = await apiFetch<Utilizador>(`/api/admin/utilizadores/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      setUser(updated);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao guardar");
    } finally {
      setSaving(false);
    }
  }

  if (!user) return <p className="text-sm text-slate-500">A carregar…</p>;

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <Link href="/administrador/utilizadores" className="text-sm text-portic hover:underline">
          ← Utilizadores
        </Link>
        <h2 className="text-lg font-semibold">Editar: {user.nome}</h2>
      </div>
      <UserForm
        initial={user}
        catalog={catalog}
        gruposDisponiveis={grupos}
        onSubmit={guardar}
        saving={saving}
        erro={erro}
      />
    </div>
  );
}
