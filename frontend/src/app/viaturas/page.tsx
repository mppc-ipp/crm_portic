"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import ExportCsvButton from "@/components/reports/ExportCsvButton";
import { apiFetch, getStoredUser } from "@/lib/api";
import {
  ESTADOS_VIATURA,
  identificacaoViatura,
  viaturaFormData,
  type EstadoViatura,
  type ViaturaCrm,
} from "@/lib/viaturas-crm";

const FORM_VAZIO = {
  matricula: "",
  marca: "",
  modelo: "",
  cor: "",
  ano: "",
  dono: "",
  telemovel: "",
  sala: "",
  descricao: "",
  observacoes: "",
  estado: "ATIVO" as EstadoViatura,
};

export default function ViaturasPage() {
  const user = getStoredUser();
  const podeCriar = Boolean(user?.admin_geral || user?.permissoes?.add_viatura);
  const podeEditar = Boolean(user?.admin_geral || user?.permissoes?.change_viatura);
  const podeEliminar = Boolean(user?.admin_geral || user?.permissoes?.delete_viatura);

  const [viaturas, setViaturas] = useState<ViaturaCrm[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState("");
  const [aMostrarForm, setAMostrarForm] = useState(false);
  const [aGuardar, setAGuardar] = useState(false);
  const [form, setForm] = useState(FORM_VAZIO);
  const [foto, setFoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [editando, setEditando] = useState<ViaturaCrm | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro("");
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (estado) params.set("estado", estado);
      const qs = params.toString();
      const data = await apiFetch<ViaturaCrm[]>(`/api/viaturas${qs ? `?${qs}` : ""}`);
      setViaturas(data);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar viaturas.");
      setViaturas([]);
    } finally {
      setLoading(false);
    }
  }, [q, estado]);

  useEffect(() => {
    const t = setTimeout(() => void carregar(), 300);
    return () => clearTimeout(t);
  }, [carregar]);

  function limparForm() {
    setForm(FORM_VAZIO);
    setFoto(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setEditando(null);
    setAMostrarForm(false);
  }

  function iniciarEdicao(v: ViaturaCrm) {
    setEditando(v);
    setForm({
      matricula: v.matricula,
      marca: v.marca,
      modelo: v.modelo,
      cor: v.cor,
      ano: v.ano ? String(v.ano) : "",
      dono: v.dono,
      telemovel: v.telemovel,
      sala: v.sala,
      descricao: v.descricao,
      observacoes: v.observacoes,
      estado: v.estado,
    });
    setFoto(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(v.fotoUrl);
    setAMostrarForm(true);
  }

  function handleFotoChange(file: File | null) {
    setFoto(file);
    if (previewUrl && previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(file ? URL.createObjectURL(file) : editando?.fotoUrl ?? null);
  }

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!form.matricula.trim()) return;
    if (editando && !podeEditar) return;
    if (!editando && !podeCriar) return;
    setAGuardar(true);
    setErro("");
    try {
      const body = viaturaFormData(form, foto);
      if (editando) {
        await apiFetch(`/api/viaturas/${editando.id}`, { method: "PATCH", body });
      } else {
        await apiFetch("/api/viaturas", { method: "POST", body });
      }
      limparForm();
      await carregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível guardar.");
    } finally {
      setAGuardar(false);
    }
  }

  async function eliminar(v: ViaturaCrm) {
    if (!podeEliminar) return;
    if (!window.confirm(`Desactivar a viatura ${v.matricula}?`)) return;
    try {
      await apiFetch(`/api/viaturas/${v.id}`, { method: "DELETE" });
      await carregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível eliminar.");
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Viaturas</h1>
          <p className="text-sm text-slate-500">Registo de frota com fotografias</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportCsvButton apiPath="/api/viaturas" filename="viaturas.csv" />
          {podeCriar && (
            <button
              type="button"
              onClick={() => {
                limparForm();
                setAMostrarForm((v) => !v);
              }}
              className="rounded-lg bg-[#1e3a5f] px-4 py-2 text-sm font-medium text-white hover:bg-[#2a4f7a]"
            >
              {aMostrarForm && !editando ? "Cancelar" : "Nova viatura"}
            </button>
          )}
        </div>
      </div>

      {erro && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>
      )}

      {aMostrarForm && (podeCriar || (editando && podeEditar)) && (
        <form onSubmit={guardar} className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            {editando ? `Editar ${editando.matricula}` : "Nova viatura"}
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Matrícula *</span>
              <input
                required
                value={form.matricula}
                onChange={(e) => setForm((f) => ({ ...f, matricula: e.target.value.toUpperCase() }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Marca</span>
              <input
                value={form.marca}
                onChange={(e) => setForm((f) => ({ ...f, marca: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Modelo</span>
              <input
                value={form.modelo}
                onChange={(e) => setForm((f) => ({ ...f, modelo: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Cor</span>
              <input
                value={form.cor}
                onChange={(e) => setForm((f) => ({ ...f, cor: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Ano</span>
              <input
                type="number"
                min={1900}
                max={2100}
                value={form.ano}
                onChange={(e) => setForm((f) => ({ ...f, ano: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Dono</span>
              <input
                value={form.dono}
                onChange={(e) => setForm((f) => ({ ...f, dono: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Telemóvel</span>
              <input
                type="tel"
                value={form.telemovel}
                onChange={(e) => setForm((f) => ({ ...f, telemovel: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Sala</span>
              <input
                value={form.sala}
                onChange={(e) => setForm((f) => ({ ...f, sala: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Estado</span>
              <select
                value={form.estado}
                onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value as EstadoViatura }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              >
                {ESTADOS_VIATURA.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm md:col-span-2">
              <span className="mb-1 block text-slate-600">Descrição</span>
              <textarea
                rows={2}
                value={form.descricao}
                onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="block text-sm md:col-span-2">
              <span className="mb-1 block text-slate-600">Observações</span>
              <textarea
                rows={2}
                value={form.observacoes}
                onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <div className="text-sm">
              <span className="mb-1 block text-slate-600">Fotografia</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => handleFotoChange(e.target.files?.[0] ?? null)}
                className="w-full text-sm"
              />
              {previewUrl && (
                <img src={previewUrl} alt="Pré-visualização" className="mt-2 h-24 w-auto rounded-lg border object-cover" />
              )}
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              disabled={aGuardar}
              className="rounded-lg bg-[#1e3a5f] px-4 py-2 text-sm font-medium text-white hover:bg-[#2a4f7a] disabled:opacity-50"
            >
              {aGuardar ? "A guardar…" : editando ? "Guardar alterações" : "Criar viatura"}
            </button>
            <button type="button" onClick={limparForm} className="rounded-lg border px-4 py-2 text-sm text-slate-700">
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Pesquisar matrícula, marca, dono, sala…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="min-w-[220px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <select
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Todos os estados</option>
          {ESTADOS_VIATURA.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">Foto</th>
              <th className="px-4 py-3 font-medium">Matrícula</th>
              <th className="px-4 py-3 font-medium">Identificação</th>
              <th className="px-4 py-3 font-medium">Dono</th>
              <th className="px-4 py-3 font-medium">Telemóvel</th>
              <th className="px-4 py-3 font-medium">Sala</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Ano</th>
              <th className="px-4 py-3 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                  A carregar…
                </td>
              </tr>
            ) : viaturas.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                  Nenhuma viatura encontrada.
                </td>
              </tr>
            ) : (
              viaturas.map((v) => (
                <tr key={v.id} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    {v.fotoUrl ? (
                      <img src={v.fotoUrl} alt={v.matricula} className="h-10 w-14 rounded object-cover" />
                    ) : (
                      <span className="inline-flex h-10 w-14 items-center justify-center rounded bg-slate-100 text-xs text-slate-400">
                        —
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">{v.matricula}</td>
                  <td className="px-4 py-3 text-slate-700">{identificacaoViatura(v)}</td>
                  <td className="px-4 py-3 text-slate-700">{v.dono || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{v.telemovel || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{v.sala || "—"}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                      {v.estadoDisplay}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{v.ano ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {podeEditar && (
                        <button
                          type="button"
                          onClick={() => iniciarEdicao(v)}
                          className="text-sm text-[#1e3a5f] hover:underline"
                        >
                          Editar
                        </button>
                      )}
                      {podeEliminar && (
                        <button
                          type="button"
                          onClick={() => void eliminar(v)}
                          className="text-sm text-red-600 hover:underline"
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
