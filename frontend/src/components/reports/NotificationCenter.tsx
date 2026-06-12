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

function BotaoMarcarLida({ onClick, lida }: { onClick: () => void; lida: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={lida}
      title={lida ? "Já lida" : "Marcar como lida"}
      aria-label={lida ? "Notificação já lida" : "Marcar como lida"}
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition ${
        lida
          ? "cursor-default border-emerald-200 bg-emerald-50 text-emerald-600"
          : "border-slate-300 text-slate-500 hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700"
      }`}
    >
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
        <path
          fillRule="evenodd"
          d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.25 7.25a1 1 0 0 1-1.414 0l-3.25-3.25a1 1 0 1 1 1.414-1.414l2.543 2.543 6.543-6.543a1 1 0 0 1 1.408 0Z"
          clipRule="evenodd"
        />
      </svg>
    </button>
  );
}

function NotificacaoEvento({ n, onMarcarLida }: { n: Notificacao; onMarcarLida: (id: number) => void }) {
  const texto = <span className="font-medium">{n.titulo}</span>;

  return (
    <li className={`flex items-center gap-2 py-1.5 ${n.lida ? "opacity-60" : ""}`}>
      <BotaoMarcarLida lida={n.lida} onClick={() => onMarcarLida(n.id)} />
      <div className="min-w-0 flex-1 truncate text-sm text-slate-800">
        {n.url ? (
          <Link href={n.url} onClick={() => onMarcarLida(n.id)} className="hover:text-portic">
            {texto}
          </Link>
        ) : (
          <button type="button" onClick={() => onMarcarLida(n.id)} className="truncate text-left">
            {texto}
          </button>
        )}
      </div>
      <span className="shrink-0 text-[11px] text-slate-400">{formatarData(n.criado_em)}</span>
    </li>
  );
}

function NotificacaoPadrao({ n, onMarcarLida }: { n: Notificacao; onMarcarLida: (id: number) => void }) {
  return (
    <li className={`flex items-start gap-2 py-3 ${n.lida ? "opacity-70" : ""}`}>
      <BotaoMarcarLida lida={n.lida} onClick={() => onMarcarLida(n.id)} />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-500">{n.tipo_display}</p>
        {n.url ? (
          <Link
            href={n.url}
            onClick={() => onMarcarLida(n.id)}
            className="font-medium text-portic hover:underline"
          >
            {n.titulo}
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => onMarcarLida(n.id)}
            className="text-left font-medium text-slate-900"
          >
            {n.titulo}
          </button>
        )}
        {n.mensagem && <p className="mt-0.5 text-sm text-slate-600">{n.mensagem}</p>}
      </div>
      <span className="shrink-0 whitespace-nowrap text-xs text-slate-400">{formatarData(n.criado_em)}</span>
    </li>
  );
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
    if (filtro === "nao_lidas") {
      setData((prev) =>
        prev
          ? {
              nao_lidas: Math.max(0, prev.nao_lidas - 1),
              items: prev.items.filter((n) => n.id !== id),
            }
          : prev
      );
    } else {
      setData((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.map((n) => (n.id === id ? { ...n, lida: true } : n)),
            }
          : prev
      );
    }
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
          {items.map((n) =>
            n.tipo === "EVENTO_PROXIMO" ? (
              <NotificacaoEvento key={n.id} n={n} onMarcarLida={marcarLida} />
            ) : (
              <NotificacaoPadrao key={n.id} n={n} onMarcarLida={marcarLida} />
            )
          )}
        </ul>
      )}
    </section>
  );
}
