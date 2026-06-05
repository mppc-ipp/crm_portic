"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type Edicao = { id: number; ano: number; nome: string };
type Startup = {
  id: number;
  nome: string;
  edicao_ano: number;
  estado_display: string;
  email_contacto: string;
};

export default function StartupsPage() {
  const [startups, setStartups] = useState<Startup[]>([]);
  const [edicoes, setEdicoes] = useState<Edicao[]>([]);
  const [ano, setAno] = useState("");
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro("");
    try {
      const params = ano ? `?ano=${ano}` : "";
      const [s, e] = await Promise.all([
        apiFetch<Startup[]>(`/api/startups${params}`),
        apiFetch<Edicao[]>("/api/startups/edicoes"),
      ]);
      setStartups(s);
      setEdicoes(e);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar startups");
    } finally {
      setLoading(false);
    }
  }, [ano]);

  useEffect(() => {
    carregar().catch(console.error);
  }, [carregar]);

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
        <h1 className="text-2xl font-bold">Startups</h1>
        <div className="flex gap-3 text-sm">
          <Link href="/startups/candidaturas" className="text-portic hover:underline">
            Candidaturas
          </Link>
          <Link href="/startups/formularios" className="text-portic hover:underline">
            Formulários
          </Link>
        </div>
      </div>
      <select
        value={ano}
        onChange={(e) => setAno(e.target.value)}
        className="border rounded-lg px-3 py-2 mb-4"
      >
        <option value="">Todas as edições</option>
        {edicoes.map((ed) => (
          <option key={ed.id} value={ed.ano}>
            {ed.nome} ({ed.ano})
          </option>
        ))}
      </select>
      {erro && <p className="text-red-600 mb-4">{erro}</p>}
      {loading ? (
        <p className="text-slate-500">A carregar…</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {startups.map((s) => (
            <div key={s.id} className="bg-white border rounded-xl p-4">
              <h2 className="font-semibold">{s.nome}</h2>
              <p className="text-sm text-slate-600">
                {s.edicao_ano} · {s.estado_display}
              </p>
              {s.email_contacto && (
                <p className="text-sm text-slate-500 mt-1">{s.email_contacto}</p>
              )}
            </div>
          ))}
          {startups.length === 0 && (
            <p className="text-slate-500 col-span-2">
              Nenhuma startup. Crie no{" "}
              <a href="http://localhost:8000/admin/startups/startup/" className="text-portic underline">
                Django Admin
              </a>
              .
            </p>
          )}
        </div>
      )}
    </div>
  );
}
