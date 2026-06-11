"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import ExportCsvButton from "@/components/reports/ExportCsvButton";
import { apiFetch } from "@/lib/api";

type LinhaRelatorio = {
  ano: number;
  nome: string;
  ativa: string;
  startups: number;
  candidaturas: number;
  formularios: number;
  contratos_ativos: number;
};

export default function EdicoesRelatorioPage() {
  const [rows, setRows] = useState<LinhaRelatorio[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro("");
    try {
      const data = await apiFetch<LinhaRelatorio[]>("/api/startups/edicoes/relatorio");
      setRows(data);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/startups" className="text-sm text-portic hover:underline">
            ← Startups
          </Link>
          <h1 className="mt-1 text-2xl font-bold">Relatório por edições</h1>
        </div>
        <ExportCsvButton filename="edicoes_relatorio.csv" apiPath="/api/startups/edicoes/relatorio" />
      </div>

      {erro && <p className="mb-3 text-sm text-red-600">{erro}</p>}

      {loading ? (
        <p className="text-slate-500">A carregar…</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Ano</th>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Ativa</th>
                <th className="px-4 py-3 font-medium">Startups</th>
                <th className="px-4 py-3 font-medium">Candidaturas</th>
                <th className="px-4 py-3 font-medium">Formulários</th>
                <th className="px-4 py-3 font-medium">Contratos</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.ano} className="border-b last:border-0 hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-medium">{r.ano}</td>
                  <td className="px-4 py-3">{r.nome}</td>
                  <td className="px-4 py-3">{r.ativa}</td>
                  <td className="px-4 py-3">{r.startups}</td>
                  <td className="px-4 py-3">{r.candidaturas}</td>
                  <td className="px-4 py-3">{r.formularios}</td>
                  <td className="px-4 py-3">{r.contratos_ativos}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
