"use client";

import { useEffect, useState } from "react";
import { apiFetch, getStoredUser } from "@/lib/api";

type Me = {
  username: string;
  nome: string;
  grupos: string[];
  modulos: Record<string, boolean>;
};

export default function AdminPage() {
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    apiFetch<Me>("/api/auth/me")
      .then(setMe)
      .catch(() => setMe(null));
  }, []);

  const user = getStoredUser();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Administração</h1>
      <p className="text-slate-600 mb-4">
        O CRM tem duas camadas de administração:
      </p>
      <ul className="mb-6 list-disc space-y-1 pl-5 text-sm text-slate-600">
        <li>
          <strong>Frontend Next.js</strong> — módulos com interface própria (Projetos estilo Asana, Salas/Reservas em{" "}
          <code className="text-xs">/admin/*</code>).
        </li>
        <li>
          <strong>Django Admin</strong> — gestão completa de modelos ainda sem ecrã no frontend (utilizadores, grupos,
          startups, empresas avançado, configuração).
        </li>
      </ul>
      <div className="grid gap-4 sm:grid-cols-2">
        <a
          href="http://localhost:8000/admin/auth/user/"
          target="_blank"
          rel="noreferrer"
          className="block bg-white border rounded-xl p-5 hover:border-portic transition"
        >
          <h2 className="font-semibold">Utilizadores</h2>
          <p className="text-sm text-slate-600 mt-1">Criar e editar contas, grupos e permissões</p>
        </a>
        <a
          href="http://localhost:8000/admin/auth/group/"
          target="_blank"
          rel="noreferrer"
          className="block bg-white border rounded-xl p-5 hover:border-portic transition"
        >
          <h2 className="font-semibold">Grupos</h2>
          <p className="text-sm text-slate-600 mt-1">AdministradorGeral, AdministradorParcial, UtilizadorComum</p>
        </a>
        <a
          href="http://localhost:8000/admin/"
          target="_blank"
          rel="noreferrer"
          className="block bg-white border rounded-xl p-5 hover:border-portic transition"
        >
          <h2 className="font-semibold">Django Admin completo</h2>
          <p className="text-sm text-slate-600 mt-1">Todos os modelos do CRM</p>
        </a>
      </div>
      {(me || user) && (
        <div className="mt-8 bg-slate-50 border rounded-xl p-4 text-sm">
          <p>
            <strong>Sessão:</strong> {me?.nome ?? user?.nome} ({me?.username ?? user?.username})
          </p>
          {me?.grupos?.length ? (
            <p className="mt-1">
              <strong>Grupos:</strong> {me.grupos.join(", ")}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
