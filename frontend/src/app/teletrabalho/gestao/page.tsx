"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import ExportCsvButton from "@/components/reports/ExportCsvButton";
import { apiFetch, getStoredUser, type UserSession } from "@/lib/api";
import {
  agruparPorDia,
  COLUNAS_CSV_GESTAO,
  formatarDataHoraPortugal,
  formatarDiaPortugal,
  nomeFicheiroCsvGestao,
  type RegistoTeletrabalho,
} from "@/lib/teletrabalho";

export default function GestaoTeletrabalhoPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserSession | null>(null);
  const [registos, setRegistos] = useState<RegistoTeletrabalho[]>([]);
  const [loading, setLoading] = useState(true);
  const [dia, setDia] = useState("");
  const [nome, setNome] = useState("");
  const [periodo, setPeriodo] = useState("");

  useEffect(() => {
    const stored = getStoredUser();
    setUser(stored);
    apiFetch<UserSession>("/api/auth/me", { redirectOnUnauthorized: false })
      .then((me) => setUser(me))
      .catch(() => undefined);
  }, []);

  const podeGestao = Boolean(user?.admin_geral || user?.permissoes?.gerir_teletrabalho);

  const carregar = useCallback(async () => {
    if (!podeGestao) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dia) params.set("dia", dia);
      if (nome.trim()) params.set("nome", nome.trim());
      if (periodo) params.set("periodo", periodo);
      const qs = params.toString();
      const data = await apiFetch<RegistoTeletrabalho[]>(
        `/api/teletrabalho/gestao/registos${qs ? `?${qs}` : ""}`
      );
      setRegistos(data);
    } catch {
      setRegistos([]);
    } finally {
      setLoading(false);
    }
  }, [dia, nome, periodo, podeGestao]);

  useEffect(() => {
    if (user && !podeGestao) {
      router.replace("/teletrabalho");
      return;
    }
    if (podeGestao) void carregar();
  }, [user, podeGestao, router, carregar]);

  const porDia = useMemo(() => agruparPorDia(registos), [registos]);
  const diasOrdenados = useMemo(
    () => Object.keys(porDia).sort((a, b) => b.localeCompare(a)),
    [porDia]
  );

  if (!user) {
    return <p className="text-sm text-slate-500">A verificar permissões…</p>;
  }

  if (!podeGestao) {
    return null;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Gestão Teletrabalho</h1>
        <p className="text-sm text-slate-600">Consulta de registos de todos os utilizadores.</p>
      </div>

      <div className="mb-6 flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div>
          <label htmlFor="filtro-dia" className="mb-1 block text-xs font-medium text-slate-600">
            Dia
          </label>
          <input
            id="filtro-dia"
            type="date"
            value={dia}
            onChange={(e) => setDia(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="filtro-nome" className="mb-1 block text-xs font-medium text-slate-600">
            Nome
          </label>
          <input
            id="filtro-nome"
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Pesquisar utilizador"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="filtro-periodo" className="mb-1 block text-xs font-medium text-slate-600">
            Período
          </label>
          <select
            id="filtro-periodo"
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Todos</option>
            <option value="manha">Manhã</option>
            <option value="tarde">Tarde</option>
          </select>
        </div>
        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={() => void carregar()}
            className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
          >
            Pesquisar
          </button>
          <ExportCsvButton
            label="Descarregar CSV"
            filename={nomeFicheiroCsvGestao({ dia, periodo })}
            rows={registos.length > 0 ? registos : undefined}
            columns={COLUNAS_CSV_GESTAO}
            className="border-slate-300 text-sm text-slate-700 disabled:opacity-50"
          />
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">A carregar registos…</p>
      ) : registos.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhum registo encontrado.</p>
      ) : (
        <div className="space-y-6">
          {diasOrdenados.map((diaKey) => (
            <section key={diaKey} className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <h2 className="border-b border-slate-100 px-4 py-3 text-sm font-semibold capitalize text-slate-800">
                {formatarDiaPortugal(`${diaKey}T12:00:00`)}
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                      <th className="px-4 py-2 font-medium">Utilizador</th>
                      <th className="px-4 py-2 font-medium">Tipo</th>
                      <th className="px-4 py-2 font-medium">Hora</th>
                      <th className="px-4 py-2 font-medium">Observação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {porDia[diaKey].map((reg) => (
                      <tr key={reg.id} className="border-b border-slate-50 last:border-0">
                        <td className="px-4 py-2 text-slate-800">{reg.utilizador_nome}</td>
                        <td className="px-4 py-2 text-slate-700">{reg.tipo_label}</td>
                        <td className="px-4 py-2 text-slate-600">
                          {formatarDataHoraPortugal(reg.registrado_em)}
                        </td>
                        <td className="px-4 py-2 text-slate-600">{reg.observacao || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
