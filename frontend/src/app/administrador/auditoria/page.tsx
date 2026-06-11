"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { rotuloAcaoAuditoria, TIPOS_AUDITORIA } from "@/lib/auditoriaRotulos";

type AuditoriaItem = {
  id: number;
  tipo: string;
  tipo_label?: string;
  conteudo: string;
  data: string | null;
  criado_em: string;
  registado_por: string | null;
  entidade: string;
  modulo?: string;
};

type AuditoriaResponse = {
  total: number;
  page: number;
  page_size: number;
  items: AuditoriaItem[];
};

const MODULOS = [
  { value: "", label: "Todos os módulos" },
  { value: "auth", label: "Autenticação" },
  { value: "administrador", label: "Administração" },
  { value: "empresas", label: "Empresas" },
  { value: "startups", label: "Startups" },
  { value: "projetos", label: "Projetos" },
];

export default function AuditoriaPage() {
  const [data, setData] = useState<AuditoriaResponse | null>(null);
  const [page, setPage] = useState(1);
  const [tipo, setTipo] = useState("");
  const [modulo, setModulo] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro("");
    try {
      const params = new URLSearchParams({ page: String(page), page_size: "25" });
      if (tipo.trim()) params.set("tipo", tipo.trim());
      if (modulo.trim()) params.set("modulo", modulo.trim());
      if (q.trim()) params.set("q", q.trim());
      const res = await apiFetch<AuditoriaResponse>(`/api/admin/auditoria?${params}`);
      setData(res);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }, [page, tipo, modulo, q]);

  useEffect(() => {
    const t = setTimeout(() => void carregar(), 300);
    return () => clearTimeout(t);
  }, [carregar]);

  const totalPages = data ? Math.ceil(data.total / data.page_size) : 1;

  return (
    <div>
      <h2 className="mb-2 text-lg font-semibold">Auditoria global</h2>
      <p className="mb-4 text-sm text-slate-600">
        Movimentos de administração, empresas, startups, projetos e autenticação.
      </p>
      <div className="mb-4 flex flex-wrap gap-3">
        <select
          value={tipo}
          onChange={(e) => { setTipo(e.target.value); setPage(1); }}
          className="rounded-lg border px-3 py-2 text-sm"
        >
          <option value="">Todos os tipos</option>
          {TIPOS_AUDITORIA.map((t) => (
            <option key={t.codigo} value={t.codigo}>{t.label}</option>
          ))}
        </select>
        <select
          value={modulo}
          onChange={(e) => { setModulo(e.target.value); setPage(1); }}
          className="rounded-lg border px-3 py-2 text-sm"
        >
          {MODULOS.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
          placeholder="Pesquisar no conteúdo…"
          className="min-w-[200px] flex-1 rounded-lg border px-3 py-2 text-sm"
        />
      </div>
      {erro && <p className="mb-3 text-sm text-red-600">{erro}</p>}
      {loading ? (
        <p className="text-sm text-slate-500">A carregar…</p>
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="p-3 text-left">Data</th>
                  <th className="p-3 text-left">Acção</th>
                  <th className="p-3 text-left">Utilizador</th>
                  <th className="p-3 text-left">Entidade</th>
                  <th className="p-3 text-left">Detalhe</th>
                </tr>
              </thead>
              <tbody>
                {data?.items.map((item) => (
                  <tr key={item.id} className="border-t">
                    <td className="p-3 whitespace-nowrap text-xs">
                      {new Date(item.criado_em).toLocaleString("pt-PT")}
                    </td>
                    <td className="p-3">
                      <span className="font-medium">
                        {item.tipo_label ?? rotuloAcaoAuditoria(item.tipo, item.entidade)}
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-400">{item.tipo}</span>
                    </td>
                    <td className="p-3">{item.registado_por ?? "—"}</td>
                    <td className="p-3 text-xs text-slate-500">{item.entidade}</td>
                    <td className="p-3 max-w-md text-slate-700">{item.conteudo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data?.items.length === 0 && (
              <p className="p-4 text-center text-sm text-slate-500">Sem registos para os filtros seleccionados.</p>
            )}
          </div>
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-slate-600">{data?.total ?? 0} registos</span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded border px-3 py-1 disabled:opacity-50"
              >
                Anterior
              </button>
              <span className="px-2 py-1">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded border px-3 py-1 disabled:opacity-50"
              >
                Seguinte
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
