"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";

type Resposta = {
  id: number;
  campo_nome: string;
  campo_tipo: string;
  valor: string;
};

type Candidatura = {
  id: number;
  rotulo: string;
  estado: string;
  estado_nome: string;
  estado_cor: string;
  submetida_em: string;
  formulario_titulo: string;
  respostas: Resposta[];
};

type StatusCandidatura = {
  id: number;
  codigo: string;
  nome: string;
  cor: string;
};

type Historico = {
  id: number;
  tipo: string;
  tipo_display: string;
  data: string | null;
  conteudo: string;
  registado_por_nome: string | null;
  created_at: string;
};

type TipoHistorico = {
  id: number;
  codigo: string;
  nome: string;
};

const inputClass = "mt-1 w-full rounded-lg border px-3 py-2 text-sm";
const labelClass = "block text-sm text-slate-600";

function formatarData(value: string | null) {
  if (!value) return null;
  const [ano, mes, dia] = value.split("-");
  if (!ano || !mes || !dia) return value;
  return `${dia}/${mes}/${ano}`;
}

function formatarDataHora(value: string) {
  return new Date(value).toLocaleString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CandidaturaDetailPage() {
  const params = useParams<{ id: string }>();
  const [candidatura, setCandidatura] = useState<Candidatura | null>(null);
  const [historicos, setHistoricos] = useState<Historico[]>([]);
  const [tipos, setTipos] = useState<TipoHistorico[]>([]);
  const [estados, setEstados] = useState<StatusCandidatura[]>([]);
  const [aGuardar, setAGuardar] = useState(false);
  const [erro, setErro] = useState("");
  const [formHistorico, setFormHistorico] = useState({ tipo: "", data: "", conteudo: "" });
  const [historicoAEditar, setHistoricoAEditar] = useState<Historico | null>(null);
  const [formEditar, setFormEditar] = useState({ tipo: "", data: "", conteudo: "" });

  const carregarCandidatura = useCallback(async () => {
    if (!params.id) return;
    const data = await apiFetch<Candidatura>(`/api/startups/candidaturas/${params.id}`);
    setCandidatura(data);
  }, [params.id]);

  const carregarHistoricos = useCallback(async () => {
    if (!params.id) return;
    const data = await apiFetch<Historico[]>(
      `/api/startups/candidaturas/${params.id}/historico`
    );
    setHistoricos(data);
  }, [params.id]);

  const carregarTipos = useCallback(async () => {
    const data = await apiFetch<TipoHistorico[]>("/api/startups/tipos-historico?ativos=1");
    setTipos(data);
    if (data.length > 0) {
      setFormHistorico((f) => (f.tipo ? f : { ...f, tipo: data[0].codigo }));
    }
  }, []);

  const carregarEstados = useCallback(async () => {
    const data = await apiFetch<StatusCandidatura[]>("/api/startups/estados-candidatura?ativos=1");
    setEstados(data);
  }, []);

  useEffect(() => {
    carregarCandidatura().catch(console.error);
    carregarHistoricos().catch(console.error);
    carregarTipos().catch(console.error);
    carregarEstados().catch(console.error);
  }, [carregarCandidatura, carregarHistoricos, carregarTipos, carregarEstados]);

  async function alterarEstado(novoEstado: string) {
    if (!candidatura) return;
    setAGuardar(true);
    try {
      const data = await apiFetch<Candidatura>(`/api/startups/candidaturas/${candidatura.id}`, {
        method: "PATCH",
        body: JSON.stringify({ estado: novoEstado }),
      });
      setCandidatura(data);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao atualizar estado");
    } finally {
      setAGuardar(false);
    }
  }

  async function registarHistorico(e: FormEvent) {
    e.preventDefault();
    if (!params.id || !formHistorico.conteudo.trim()) return;
    setAGuardar(true);
    setErro("");
    try {
      await apiFetch(`/api/startups/candidaturas/${params.id}/historico`, {
        method: "POST",
        body: JSON.stringify({
          tipo: formHistorico.tipo,
          conteudo: formHistorico.conteudo,
          data: formHistorico.data || null,
        }),
      });
      setFormHistorico({
        tipo: tipos[0]?.codigo ?? "",
        data: "",
        conteudo: "",
      });
      await carregarHistoricos();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao registar histórico");
    } finally {
      setAGuardar(false);
    }
  }

  function abrirEditarHistorico(h: Historico) {
    setHistoricoAEditar(h);
    setFormEditar({ tipo: h.tipo, data: h.data ?? "", conteudo: h.conteudo });
    setErro("");
  }

  async function guardarEditarHistorico(e: FormEvent) {
    e.preventDefault();
    if (!params.id || !historicoAEditar) return;
    setAGuardar(true);
    try {
      await apiFetch(
        `/api/startups/candidaturas/${params.id}/historico/${historicoAEditar.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            tipo: formEditar.tipo,
            conteudo: formEditar.conteudo,
            data: formEditar.data || null,
          }),
        }
      );
      setHistoricoAEditar(null);
      await carregarHistoricos();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao editar");
    } finally {
      setAGuardar(false);
    }
  }

  async function excluirHistorico(h: Historico) {
    if (!params.id || !confirm("Excluir esta entrada do histórico?")) return;
    try {
      await apiFetch(`/api/startups/candidaturas/${params.id}/historico/${h.id}`, {
        method: "DELETE",
      });
      await carregarHistoricos();
    } catch (e) {
      console.error(e);
    }
  }

  if (!candidatura) {
    return (
      <div>
        <Link href="/startups" className="text-sm text-portic hover:underline">
          ← Startups
        </Link>
        <p className="mt-4 text-slate-500">A carregar…</p>
      </div>
    );
  }

  return (
    <div>
      <Link href="/startups" className="text-sm text-portic hover:underline">
        ← Startups
      </Link>

      <div className="mt-2 mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{candidatura.rotulo}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {candidatura.formulario_titulo} · Submetida {formatarDataHora(candidatura.submetida_em)}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label className="text-sm text-slate-600">
              Estado
              <select
                value={candidatura.estado}
                onChange={(e) => alterarEstado(e.target.value)}
                disabled={aGuardar}
                className="ml-2 rounded-lg border px-3 py-1.5 text-sm"
              >
                {estados.map((s) => (
                  <option key={s.codigo} value={s.codigo}>
                    {s.nome}
                  </option>
                ))}
              </select>
            </label>
            <span
              className="rounded-full border px-2.5 py-0.5 text-xs font-medium"
              style={{
                backgroundColor: `${candidatura.estado_cor}22`,
                color: candidatura.estado_cor,
                borderColor: `${candidatura.estado_cor}55`,
              }}
            >
              {candidatura.estado_nome}
            </span>
          </div>
        </div>
      </div>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">Respostas do formulário</h2>
        <div className="overflow-hidden rounded-xl border bg-white">
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-600 w-1/3">Submetida em</td>
                <td className="px-4 py-3">{formatarDataHora(candidatura.submetida_em)}</td>
              </tr>
              {candidatura.respostas.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium text-slate-600">{r.campo_nome}</td>
                  <td className="px-4 py-3 whitespace-pre-wrap">{r.valor || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Histórico de contacto</h2>
        <form onSubmit={registarHistorico} className="mb-6 space-y-3 rounded-xl border bg-white p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              Tipo
              <select
                value={formHistorico.tipo}
                onChange={(e) => setFormHistorico((f) => ({ ...f, tipo: e.target.value }))}
                className={inputClass}
              >
                {tipos.map((t) => (
                  <option key={t.codigo} value={t.codigo}>
                    {t.nome}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              Data (opcional)
              <input
                type="date"
                value={formHistorico.data}
                onChange={(e) => setFormHistorico((f) => ({ ...f, data: e.target.value }))}
                className={inputClass}
              />
            </label>
          </div>
          <label className={labelClass}>
            Texto
            <textarea
              required
              rows={4}
              value={formHistorico.conteudo}
              onChange={(e) => setFormHistorico((f) => ({ ...f, conteudo: e.target.value }))}
              placeholder="Registe o contacto, notas da conversa, próximos passos…"
              className={inputClass}
            />
          </label>
          {erro && <p className="text-sm text-red-600">{erro}</p>}
          <button
            type="submit"
            disabled={aGuardar}
            className="rounded-lg bg-portic px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {aGuardar ? "A guardar…" : "Adicionar ao histórico"}
          </button>
        </form>

        <div className="space-y-3">
          {historicos.map((h) => (
            <article key={h.id} className="rounded-lg border bg-white p-4 text-sm">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="rounded-full bg-portic/10 px-2 py-0.5 font-medium text-portic">
                    {h.tipo_display}
                  </span>
                  {h.data && <span>Data: {formatarData(h.data)}</span>}
                  <span>Registado: {formatarDataHora(h.created_at)}</span>
                  {h.registado_por_nome && <span>por {h.registado_por_nome}</span>}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => abrirEditarHistorico(h)}
                    className="text-xs font-medium text-portic hover:underline"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => excluirHistorico(h)}
                    className="text-xs font-medium text-red-600 hover:underline"
                  >
                    Excluir
                  </button>
                </div>
              </div>
              <p className="whitespace-pre-wrap text-slate-800">{h.conteudo}</p>
            </article>
          ))}
          {historicos.length === 0 && (
            <p className="text-sm text-slate-500">Ainda não há entradas no histórico.</p>
          )}
        </div>
      </section>

      {historicoAEditar && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setHistoricoAEditar(null)}
        >
          <div
            className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-4 text-lg font-bold">Editar entrada</h3>
            <form onSubmit={guardarEditarHistorico} className="space-y-3">
              <label className={labelClass}>
                Tipo
                <select
                  value={formEditar.tipo}
                  onChange={(e) => setFormEditar((f) => ({ ...f, tipo: e.target.value }))}
                  className={inputClass}
                >
                  {tipos.map((t) => (
                    <option key={t.codigo} value={t.codigo}>
                      {t.nome}
                    </option>
                  ))}
                </select>
              </label>
              <label className={labelClass}>
                Data
                <input
                  type="date"
                  value={formEditar.data}
                  onChange={(e) => setFormEditar((f) => ({ ...f, data: e.target.value }))}
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                Texto
                <textarea
                  required
                  rows={4}
                  value={formEditar.conteudo}
                  onChange={(e) => setFormEditar((f) => ({ ...f, conteudo: e.target.value }))}
                  className={inputClass}
                />
              </label>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setHistoricoAEditar(null)}
                  className="rounded-lg border px-4 py-2 text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={aGuardar}
                  className="rounded-lg bg-portic px-4 py-2 text-sm font-medium text-white"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
