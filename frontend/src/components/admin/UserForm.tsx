"use client";

import { FormEvent, useState } from "react";
import PermissionMatrix, { type PermCatalogItem } from "./PermissionMatrix";

export type UserFormData = {
  nome: string;
  email: string;
  password: string;
  grupos: string[];
  permissoes_directas: string[];
  is_active: boolean;
};

type Props = {
  initial: UserFormData;
  catalog: PermCatalogItem[];
  gruposDisponiveis: string[];
  onSubmit: (data: UserFormData) => Promise<void>;
  saving: boolean;
  isNew?: boolean;
  erro?: string;
};

export default function UserForm({
  initial,
  catalog,
  gruposDisponiveis,
  onSubmit,
  saving,
  isNew,
  erro,
}: Props) {
  const [permissoes, setPermissoes] = useState(initial.permissoes_directas);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await onSubmit({
      nome: String(fd.get("nome") ?? ""),
      email: String(fd.get("email") ?? ""),
      password: String(fd.get("password") ?? ""),
      grupos: gruposDisponiveis.filter((g) => fd.get(`grupo_${g}`) === "on"),
      permissoes_directas: permissoes,
      is_active: fd.get("is_active") === "on",
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {erro && <p className="text-sm text-red-600">{erro}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm text-slate-600">
          Nome
          <input
            name="nome"
            defaultValue={initial.nome}
            required
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
        </label>
        <label className="block text-sm text-slate-600">
          Email
          <input
            name="email"
            type="email"
            defaultValue={initial.email}
            required
            readOnly={!isNew}
            className="mt-1 w-full rounded-lg border px-3 py-2 read-only:bg-slate-50"
          />
        </label>
        <label className="block text-sm text-slate-600 sm:col-span-2">
          {isNew ? "Palavra-passe" : "Nova palavra-passe (opcional)"}
          <input
            name="password"
            type="password"
            required={isNew}
            className="mt-1 w-full rounded-lg border px-3 py-2"
            autoComplete="new-password"
          />
        </label>
      </div>

      <fieldset className="rounded-lg border p-4">
        <legend className="px-1 text-sm font-medium">Grupos</legend>
        <div className="mt-2 flex flex-wrap gap-4">
          {gruposDisponiveis.map((g) => (
            <label key={g} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name={`grupo_${g}`}
                defaultChecked={initial.grupos.includes(g)}
              />
              {g}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="is_active" defaultChecked={initial.is_active} />
        Conta activa
      </label>

      <div>
        <h3 className="mb-2 text-sm font-medium">Permissões directas</h3>
        <PermissionMatrix catalog={catalog} selected={permissoes} onChange={setPermissoes} />
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-portic px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? "A guardar…" : "Guardar"}
        </button>
      </div>
    </form>
  );
}
