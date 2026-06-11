"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import ExportCsvButton from "@/components/reports/ExportCsvButton";
import { apiFetch } from "@/lib/api";

type Campo = {
  id?: number;
  ordem: number;
  nome: string;
  tipo: string;
  obrigatorio: boolean;
  opcoes: string[];
};

type Formulario = {
  id: number;
  titulo: string;
  ativo: boolean;
  link_publico: string;
  num_candidaturas: number;
  campos: Campo[];
};

type Candidatura = {
  id: number;
  rotulo: string;
  estado: string;
  estado_nome: string;
  estado_cor: string;
  submetida_em: string;
};

const TIPOS_CAMPO = [
  { value: "TEXT", label: "Texto" },
  { value: "TEXTAREA", label: "Texto longo" },
  { value: "EMAIL", label: "Email" },
  { value: "NUMBER", label: "Número" },
  { value: "CHOICE", label: "Escolha" },
] as const;

const CAMPO_VAZIO: Campo = {
  ordem: 0,
  nome: "",
  tipo: "TEXT",
  obrigatorio: true,
  opcoes: [],
};

const inputClass = "mt-1 w-full rounded-lg border px-3 py-2 text-sm";
const labelClass = "block text-sm text-slate-600";

function formatarDataHora(value: string) {
  return new Date(value).toLocaleString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function tagStyle(cor: string) {
  return {
    backgroundColor: `${cor}22`,
    color: cor,
    borderColor: `${cor}55`,
  };
}

export default function StartupsPage() {
  const [formularios, setFormularios] = useState<Formulario[]>([]);
  const [candidaturas, setCandidaturas] = useState<Candidatura[]>([]);
  const [filtroFormulario, setFiltroFormulario] = useState("");
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [modalForm, setModalForm] = useState(false);
  const [aGuardar, setAGuardar] = useState(false);
  const [editandoForm, setEditandoForm] = useState<Formulario | null>(null);
  const [form, setForm] = useState({
    titulo: "",
    ativo: true,
    campos: [{ ...CAMPO_VAZIO }] as Campo[],
  });
  const carregar = useCallback(async () => {
    setLoading(true);
    setErro("");
    try {
      const params = filtroFormulario ? `?formulario=${filtroFormulario}` : "";
      const [forms, cands] = await Promise.all([
        apiFetch<Formulario[]>("/api/startups/formularios"),
        apiFetch<Candidatura[]>(`/api/startups/candidaturas${params}`),
      ]);
      setFormularios(forms);
      setCandidaturas(cands);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }, [filtroFormulario]);

  useEffect(() => {
    carregar().catch(console.error);
  }, [carregar]);

  function abrirNovoForm() {
    setEditandoForm(null);
    setForm({ titulo: "", ativo: true, campos: [{ ...CAMPO_VAZIO }] });
    setErro("");
    setModalForm(true);
  }

  function abrirEditarForm(f: Formulario) {
    setEditandoForm(f);
    setForm({
      titulo: f.titulo,
      ativo: f.ativo,
      campos: f.campos.length
        ? f.campos.map((c, i) => ({ ...c, ordem: c.ordem ?? i }))
        : [{ ...CAMPO_VAZIO }],
    });
    setErro("");
    setModalForm(true);
  }

  function adicionarCampo() {
    setForm((f) => ({
      ...f,
      campos: [...f.campos, { ...CAMPO_VAZIO, ordem: f.campos.length }],
    }));
  }

  function removerCampo(index: number) {
    setForm((f) => ({
      ...f,
      campos: f.campos.length <= 1 ? f.campos : f.campos.filter((_, i) => i !== index),
    }));
  }

  function atualizarCampo(index: number, patch: Partial<Campo>) {
    setForm((f) => ({
      ...f,
      campos: f.campos.map((c, i) => (i === index ? { ...c, ...patch } : c)),
    }));
  }

  async function guardarForm(e: FormEvent) {
    e.preventDefault();
    if (!form.titulo.trim()) return;
    const camposValidos = form.campos
      .filter((c) => c.nome.trim())
      .map((c, i) => ({
        nome: c.nome.trim(),
        tipo: c.tipo,
        obrigatorio: c.obrigatorio,
        ordem: i,
        opcoes: c.tipo === "CHOICE" ? c.opcoes.filter((o) => o.trim()) : [],
      }));
    if (camposValidos.some((c) => c.tipo === "CHOICE" && c.opcoes.length === 0)) {
      setErro("Campos de escolha precisam de pelo menos uma opção.");
      return;
    }
    setAGuardar(true);
    setErro("");
    try {
      const body = { titulo: form.titulo.trim(), ativo: form.ativo, campos: camposValidos };
      if (editandoForm) {
        await apiFetch(`/api/startups/formularios/${editandoForm.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
      } else {
        await apiFetch("/api/startups/formularios", {
          method: "POST",
          body: JSON.stringify(body),
        });
      }
      setModalForm(false);
      await carregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao guardar");
    } finally {
      setAGuardar(false);
    }
  }

  async function copiarLink(link: string) {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      /* ignore */
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Startups</h1>
          <Link href="/startups/edicoes" className="text-sm text-portic hover:underline">
            Relatório por edições
          </Link>
        </div>
        <button
          type="button"
          onClick={abrirNovoForm}
          className="rounded-lg bg-portic px-4 py-2 text-sm font-medium text-white"
        >
          Novo formulário
        </button>
      </div>

      {formularios.length > 0 && (
        <section className="mb-6 space-y-2">
          <h2 className="text-sm font-semibold text-slate-700">Formulários</h2>
          {formularios.map((f) => (
            <div key={f.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {f.titulo}
                  {!f.ativo && <span className="ml-2 text-xs text-red-500">inativo</span>}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {f.num_candidaturas} resposta{f.num_candidaturas !== 1 ? "s" : ""}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <a
                    href={f.link_publico}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all text-sm text-portic hover:underline"
                  >
                    {f.link_publico}
                  </a>
                  <button
                    type="button"
                    onClick={() => copiarLink(f.link_publico)}
                    className="text-xs text-slate-500 hover:text-portic"
                  >
                    Copiar link
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={() => abrirEditarForm(f)}
                className="rounded-lg border px-3 py-1.5 text-sm hover:bg-slate-50"
              >
                Editar
              </button>
            </div>
          ))}
        </section>
      )}

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Candidaturas recebidas</h2>
          <ExportCsvButton
            filename="candidaturas.csv"
            apiPath={`/api/startups/candidaturas${filtroFormulario ? `?formulario=${filtroFormulario}` : ""}`}
          />
          {formularios.length > 1 && (
            <select
              value={filtroFormulario}
              onChange={(e) => setFiltroFormulario(e.target.value)}
              className="rounded-lg border px-3 py-2 text-sm"
            >
              <option value="">Todos os formulários</option>
              {formularios.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.titulo}
                </option>
              ))}
            </select>
          )}
        </div>

        {erro && !modalForm && <p className="mb-3 text-sm text-red-600">{erro}</p>}

        {loading ? (
          <p className="text-slate-500">A carregar…</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border bg-white">
            <table className="w-full min-w-[400px] text-sm">
              <thead className="border-b bg-slate-50 text-left text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Candidatura</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Submetida</th>
                </tr>
              </thead>
              <tbody>
                {candidaturas.map((c) => (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/startups/candidaturas/${c.id}`}
                        className="font-medium text-portic hover:underline"
                      >
                        {c.rotulo}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium"
                        style={tagStyle(c.estado_cor)}
                      >
                        {c.estado_nome}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {formatarDataHora(c.submetida_em)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {candidaturas.length === 0 && (
              <p className="p-8 text-center text-slate-500">
                Ainda não há candidaturas. Crie um formulário e partilhe o link público.
              </p>
            )}
          </div>
        )}
      </section>

      {modalForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setModalForm(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="sticky top-0 z-10 border-b bg-white px-6 py-4">
              <h2 className="text-lg font-bold">
                {editandoForm ? "Editar formulário" : "Novo formulário"}
              </h2>
            </div>
            <form onSubmit={guardarForm} className="space-y-5 px-6 py-5">
              <label className={labelClass}>
                Título *
                <input
                  required
                  value={form.titulo}
                  onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
                  className={inputClass}
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.ativo}
                  onChange={(e) => setForm((f) => ({ ...f, ativo: e.target.checked }))}
                />
                Formulário ativo
              </label>

              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-800">Campos do formulário</h3>
                  <button
                    type="button"
                    onClick={adicionarCampo}
                    className="text-sm font-medium text-portic hover:underline"
                  >
                    + Adicionar campo
                  </button>
                </div>
                <div className="space-y-4">
                  {form.campos.map((campo, index) => (
                    <div key={index} className="rounded-lg border bg-slate-50 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500">Campo {index + 1}</span>
                        {form.campos.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removerCampo(index)}
                            className="text-xs text-red-600 hover:underline"
                          >
                            Remover
                          </button>
                        )}
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <label className={labelClass}>
                          Nome *
                          <input
                            value={campo.nome}
                            onChange={(e) => atualizarCampo(index, { nome: e.target.value })}
                            className={inputClass}
                          />
                        </label>
                        <label className={labelClass}>
                          Tipo
                          <select
                            value={campo.tipo}
                            onChange={(e) => atualizarCampo(index, { tipo: e.target.value })}
                            className={inputClass}
                          >
                            {TIPOS_CAMPO.map((t) => (
                              <option key={t.value} value={t.value}>
                                {t.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className={`${labelClass} flex items-center gap-2 pt-6`}>
                          <input
                            type="checkbox"
                            checked={campo.obrigatorio}
                            onChange={(e) =>
                              atualizarCampo(index, { obrigatorio: e.target.checked })
                            }
                          />
                          Obrigatório
                        </label>
                      </div>
                      {campo.tipo === "CHOICE" && (
                        <label className={`${labelClass} mt-2`}>
                          Opções (uma por linha)
                          <textarea
                            rows={3}
                            value={campo.opcoes.join("\n")}
                            onChange={(e) =>
                              atualizarCampo(index, {
                                opcoes: e.target.value.split("\n").map((s) => s.trim()),
                              })
                            }
                            className={inputClass}
                          />
                        </label>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              {erro && <p className="text-sm text-red-600">{erro}</p>}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalForm(false)}
                  className="rounded-lg border px-4 py-2 text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={aGuardar}
                  className="rounded-lg bg-portic px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {aGuardar ? "A guardar…" : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
