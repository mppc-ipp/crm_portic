"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import PlatformBadge from "@/components/marketing/PlatformBadge";
import type { Plataforma, Publicacao } from "@/components/marketing/types";
import {
  cancelarAgendamento,
  eliminarPublicacao,
  listarPublicacoes,
  publicarAgora,
  republicar,
} from "@/lib/marketing-api";

const ESTADOS: Array<{ value: string; label: string }> = [
  { value: "", label: "Todos os estados" },
  { value: "RASCUNHO", label: "Rascunho" },
  { value: "AGENDADO", label: "Agendado" },
  { value: "PUBLICADO", label: "Publicado" },
  { value: "PARCIAL", label: "Parcial" },
  { value: "FALHOU", label: "Falhou" },
  { value: "CANCELADO", label: "Cancelado" },
];

const inputClass = "rounded-lg border px-3 py-2 text-sm";

function formatarData(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MarketingPublicacoesPage() {
  const [publicacoes, setPublicacoes] = useState<Publicacao[]>([]);
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState("");
  const [plataforma, setPlataforma] = useState("");
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro("");
    try {
      const params: Record<string, string> = {};
      if (q) params.q = q;
      if (estado) params.estado = estado;
      if (plataforma) params.plataforma = plataforma;
      setPublicacoes(await listarPublicacoes(params));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }, [q, estado, plataforma]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function accao(
    fn: () => Promise<unknown>,
    recarregar = true
  ) {
    try {
      await fn();
      if (recarregar) carregar();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro");
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-slate-500">Pesquisar</label>
          <input
            className={inputClass}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Título ou texto"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500">Estado</label>
          <select className={inputClass} value={estado} onChange={(e) => setEstado(e.target.value)}>
            {ESTADOS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500">Plataforma</label>
          <select
            className={inputClass}
            value={plataforma}
            onChange={(e) => setPlataforma(e.target.value)}
          >
            <option value="">Todas</option>
            <option value="FACEBOOK">Facebook</option>
            <option value="INSTAGRAM">Instagram</option>
            <option value="LINKEDIN">LinkedIn</option>
          </select>
        </div>
        <button type="button" onClick={carregar} className="rounded-lg bg-portic px-4 py-2 text-sm text-white">
          Filtrar
        </button>
        <Link
          href="/marketing/publicacoes/nova"
          className="ml-auto rounded-lg bg-portic px-4 py-2 text-sm text-white"
        >
          Nova publicação
        </Link>
      </div>

      {erro && <p className="mb-3 text-sm text-red-600">{erro}</p>}
      {loading ? (
        <p className="text-sm text-slate-500">A carregar…</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="min-w-full text-sm">
            <thead className="border-b bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3">Título</th>
                <th className="px-4 py-3">Redes</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Agendado</th>
                <th className="px-4 py-3">Publicado</th>
                <th className="px-4 py-3">Acções</th>
              </tr>
            </thead>
            <tbody>
              {publicacoes.map((pub) => (
                <tr key={pub.id} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/marketing/publicacoes/${pub.id}`}
                      className="font-medium text-portic hover:underline"
                    >
                      {pub.titulo_interno}
                    </Link>
                    <p className="text-xs text-slate-500">{pub.criado_por_nome}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {pub.destinos.map((d) => (
                        <PlatformBadge key={d.id} plataforma={d.plataforma as Plataforma} />
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">{pub.estado}</td>
                  <td className="px-4 py-3">{formatarData(pub.agendado_para)}</td>
                  <td className="px-4 py-3">{formatarData(pub.publicado_em)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(pub.estado === "RASCUNHO" || pub.estado === "FALHOU" || pub.estado === "PARCIAL") && (
                        <button
                          type="button"
                          className="rounded border px-2 py-0.5 text-xs hover:bg-slate-50"
                          onClick={() => accao(() => publicarAgora(pub.id))}
                        >
                          Publicar
                        </button>
                      )}
                      {pub.estado === "AGENDADO" && (
                        <button
                          type="button"
                          className="rounded border px-2 py-0.5 text-xs hover:bg-slate-50"
                          onClick={() => accao(() => cancelarAgendamento(pub.id))}
                        >
                          Cancelar
                        </button>
                      )}
                      {(pub.estado === "FALHOU" || pub.estado === "PARCIAL") && (
                        <button
                          type="button"
                          className="rounded border px-2 py-0.5 text-xs hover:bg-slate-50"
                          onClick={() => accao(() => republicar(pub.id))}
                        >
                          Republicar
                        </button>
                      )}
                      {pub.estado === "RASCUNHO" && (
                        <button
                          type="button"
                          className="rounded border border-red-200 px-2 py-0.5 text-xs text-red-600 hover:bg-red-50"
                          onClick={() => {
                            if (confirm("Eliminar publicação?")) {
                              accao(() => eliminarPublicacao(pub.id));
                            }
                          }}
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {publicacoes.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    Nenhuma publicação encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
