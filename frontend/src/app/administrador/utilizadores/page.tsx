"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type Utilizador = {
  id: number;
  nome: string;
  email: string;
  username: string;
  grupos: string[];
  modulos: Record<string, boolean>;
  is_active: boolean;
};

export default function UtilizadoresPage() {
  const [utilizadores, setUtilizadores] = useState<Utilizador[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro("");
    try {
      const params = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : "";
      const data = await apiFetch<Utilizador[]>(`/api/admin/utilizadores${params}`);
      setUtilizadores(data);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => {
    const t = setTimeout(() => void carregar(), 300);
    return () => clearTimeout(t);
  }, [carregar]);

  async function desactivar(id: number) {
    if (!window.confirm("Desactivar este utilizador?")) return;
    await apiFetch(`/api/admin/utilizadores/${id}`, { method: "DELETE" });
    await carregar();
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Utilizadores</h2>
        <Link
          href="/administrador/utilizadores/novo"
          className="rounded-lg bg-portic px-4 py-2 text-sm font-medium text-white"
        >
          Novo utilizador
        </Link>
      </div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Pesquisar por nome ou email…"
        className="mb-4 w-full max-w-md rounded-lg border px-3 py-2 text-sm"
      />
      {erro && <p className="mb-3 text-sm text-red-600">{erro}</p>}
      {loading ? (
        <p className="text-sm text-slate-500">A carregar…</p>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-3 text-left">Nome</th>
                <th className="p-3 text-left">Email</th>
                <th className="p-3 text-left">Grupos</th>
                <th className="p-3 text-left">Módulos</th>
                <th className="p-3 text-left">Estado</th>
                <th className="p-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {utilizadores.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="p-3 font-medium">{u.nome}</td>
                  <td className="p-3">{u.email}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {u.grupos.map((g) => (
                        <span key={g} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">
                          {g}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-3 text-xs text-slate-600">
                    {Object.entries(u.modulos)
                      .filter(([, v]) => v)
                      .map(([k]) => k)
                      .join(", ") || "—"}
                  </td>
                  <td className="p-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        u.is_active ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {u.is_active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/administrador/utilizadores/${u.id}`}
                        className="text-xs font-medium text-portic hover:underline"
                      >
                        Editar
                      </Link>
                      {u.is_active && (
                        <button
                          type="button"
                          onClick={() => desactivar(u.id)}
                          className="text-xs font-medium text-red-600 hover:underline"
                        >
                          Desactivar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {utilizadores.length === 0 && (
            <p className="p-4 text-center text-sm text-slate-500">Nenhum utilizador encontrado.</p>
          )}
        </div>
      )}
    </div>
  );
}
