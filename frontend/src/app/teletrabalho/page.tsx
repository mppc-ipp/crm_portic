"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import {
  TIPOS_REGISTO,
  type RegistoTeletrabalho,
  type TipoRegistoTeletrabalho,
  formatarDataHoraPortugal,
} from "@/lib/teletrabalho";

export default function TeletrabalhoPage() {
  const [tipo, setTipo] = useState<TipoRegistoTeletrabalho>("ENTRADA_MANHA");
  const [observacao, setObservacao] = useState("");
  const [historico, setHistorico] = useState<RegistoTeletrabalho[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const carregarHistorico = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<RegistoTeletrabalho[]>("/api/teletrabalho/registos/me");
      setHistorico(data);
    } catch {
      setHistorico([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void carregarHistorico();
  }, [carregarHistorico]);

  async function registar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setSucesso("");
    setSubmitting(true);
    try {
      await apiFetch<RegistoTeletrabalho>("/api/teletrabalho/registos", {
        method: "POST",
        body: JSON.stringify({ tipo, observacao }),
      });
      setSucesso("Registo guardado com sucesso.");
      setObservacao("");
      await carregarHistorico();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível guardar o registo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Teletrabalho</h1>
        <p className="text-sm text-slate-600">
          Registe a sua presença em teletrabalho. A hora é registada automaticamente (fuso horário de Portugal).
        </p>
      </div>

      <form onSubmit={registar} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <fieldset>
          <legend className="mb-3 text-sm font-semibold text-slate-800">Tipo de registo</legend>
          <div className="space-y-2">
            {TIPOS_REGISTO.map((opt) => (
              <label
                key={opt.value}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition ${
                  tipo === opt.value
                    ? "border-blue-600 bg-blue-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="tipo"
                  value={opt.value}
                  checked={tipo === opt.value}
                  onChange={() => setTipo(opt.value)}
                  className="h-4 w-4 text-blue-600"
                />
                <span className="text-sm font-medium text-slate-800">{opt.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-5">
          <label htmlFor="observacao" className="mb-1 block text-sm font-semibold text-slate-800">
            Observação
          </label>
          <textarea
            id="observacao"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            rows={3}
            placeholder="Opcional"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {erro && <p className="mt-4 text-sm text-red-600">{erro}</p>}
        {sucesso && <p className="mt-4 text-sm text-green-700">{sucesso}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-5 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60"
        >
          {submitting ? "A guardar…" : "Registar"}
        </button>
      </form>

      <section className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-slate-800">Histórico de registos</h2>
        {loading ? (
          <p className="text-sm text-slate-500">A carregar…</p>
        ) : historico.length === 0 ? (
          <p className="text-sm text-slate-500">Ainda não tem registos.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {historico.map((reg) => (
              <li key={reg.id} className="py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm font-medium text-slate-900">{reg.tipo_label}</span>
                  <span className="text-sm text-slate-500">{formatarDataHoraPortugal(reg.registrado_em)}</span>
                </div>
                {reg.observacao && <p className="mt-1 text-sm text-slate-600">{reg.observacao}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
