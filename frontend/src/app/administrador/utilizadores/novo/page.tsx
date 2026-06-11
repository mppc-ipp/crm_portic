"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import UserForm, { type UserFormData } from "@/components/admin/UserForm";
import type { PermCatalogItem } from "@/components/admin/PermissionMatrix";
import { apiFetch } from "@/lib/api";

export default function NovoUtilizadorPage() {
  const router = useRouter();
  const [catalog, setCatalog] = useState<PermCatalogItem[]>([]);
  const [grupos, setGrupos] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    apiFetch<{ catalogo: PermCatalogItem[]; grupos: string[] }>("/api/admin/permissoes").then(
      (data) => {
        setCatalog(data.catalogo);
        setGrupos(data.grupos);
      }
    );
  }, []);

  const initial: UserFormData = {
    nome: "",
    email: "",
    password: "",
    grupos: [],
    permissoes_directas: [],
    is_active: true,
  };

  async function guardar(data: UserFormData) {
    setSaving(true);
    setErro("");
    try {
      const user = await apiFetch<{ id: number }>("/api/admin/utilizadores", {
        method: "POST",
        body: JSON.stringify(data),
      });
      router.push(`/administrador/utilizadores/${user.id}`);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao criar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">Novo utilizador</h2>
      <UserForm
        initial={initial}
        catalog={catalog}
        gruposDisponiveis={grupos}
        onSubmit={guardar}
        saving={saving}
        isNew
        erro={erro}
      />
    </div>
  );
}
