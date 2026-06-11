"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import ExportCsvButton from "./ExportCsvButton";

type Notificacao = {
  id: number;
  tipo: string;
  tipo_display: string;
  titulo: string;
  mensagem: string;
  url: string;
  lida: boolean;
  criado_em: string;
};

type Payload = {
  nao_lidas: number;
  items: Notificacao[];
};

function formatarData(iso: string) {
  return new Date(iso).toLocaleString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function NotificationCenter() {
  const [data, setData] = useState<Payload | null>(null);
  const [filtro, setFiltro] = useState<"todas" | "nao_lidas">("nao_lidas");
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const q = filtro === "nao_lidas" ? "?nao_lidas=1&limit=30" : "?limit=30";
      const res = await apiFetch<Payload>(`/api/notificacoes${q}`);
      setData(res);
    } catch {
      setData({ nao_lidas: 0, items: [] });
    } finally {
      setLoading(false);
    }
  }, [filtro]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function marcarLida(id: number) {
    await apiFetch(`/api/notificacoes/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ lida: true }),
    });
    void carregar();
  }

  async function marcarTodas() {
    await apiFetch("/api/notificacoes/marcar-todas-lidas", { method: "POST" });
    void carregar();
  }

  const items = data?.items ?? [];

  return (
    <section className="mb-6 rounded-xl border bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-slate-900">Centro de notificações</h2>
          {(data?.nao_lidas ?? 0) > 0 && (
            <span className="rounded-full bg-portic px-2 py-0.5 text-xs font-medium text-white">
              {data?.nao_lidas} não lidas
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filtro}
            onChange={(e) => setFiltro(e.target.value as "todas" | "nao_lidas")}
            className="rounded-lg border px-2 py-1 text-sm"
          >
            <option value="nao_lidas">Não lidas</option>
            <option value="todas">Todas</option>
          </select>
          <button
            type="button"
            onClick={() => void marcarTodas()}
            className="text-sm text-portic hover:underline"
          >
            Marcar todas como lidas
          </button>
          <ExportCsvButton filename="notificacoes.csv" apiPath="/api/notificacoes" />
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">A carregar notificações…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-500">Sem notificações.</p>
      ) : (
        <ul className="divide-y">
          {items.map((n) => (
            <li key={n.id} className={`py-3 ${n.lida ? "opacity-70" : ""}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-slate-500">{n.tipo_display}</p>
                  {n.url ? (
                    <Link
                      href={n.url}
                      onClick={() => void marcarLida(n.id)}
                      className="font-medium text-portic hover:underline"
                    >
                      {n.titulo}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void marcarLida(n.id)}
                      className="text-left font-medium text-slate-900"
                    >
                      {n.titulo}
                    </button>
                  )}
                  {n.mensagem && <p className="mt-0.5 text-sm text-slate-600">{n.mensagem}</p>}
                </div>
                <span className="whitespace-nowrap text-xs text-slate-400">{formatarData(n.criado_em)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
