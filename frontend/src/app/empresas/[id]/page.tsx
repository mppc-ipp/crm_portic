"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";

type Contacto = { id: number; nome: string; cargo: string; email: string; telefone: string };
type Empresa = {
  id: number;
  nome: string;
  nif: string;
  cae: string;
  setor: string;
  tipo_display: string;
  estado_display: string;
  email: string;
  telefone: string;
  morada: string;
  codigo_postal: string;
  localidade: string;
  concelho: string;
  distrito: string;
  contactos: Contacto[];
};

type Interacao = {
  id: number;
  tipo: string;
  tipo_display: string;
  data: string | null;
  conteudo: string;
  registado_por_nome: string | null;
  created_at: string;
};

const TIPOS_INTERACAO = [
  { value: "EVENTO", label: "Evento" },
  { value: "PEDIDO_PORTIC", label: "Pedido Portic" },
  { value: "PEDIDO_EMPRESA", label: "Pedido Empresa" },
] as const;

function formatarData(value: string | null) {
  if (!value) return null;
  const [ano, mes, dia] = value.split("-");
  if (!ano || !mes || !dia) return value;
  return `${dia}/${mes}/${ano}`;
}

function formatarDataHora(value: string) {
  const d = new Date(value);
  return d.toLocaleString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function EmpresaDetailPage() {
  const params = useParams<{ id: string }>();
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [interacoes, setInteracoes] = useState<Interacao[]>([]);
  const [aGuardar, setAGuardar] = useState(false);
  const [erro, setErro] = useState("");
  const [form, setForm] = useState({
    tipo: "EVENTO",
    data: "",
    conteudo: "",
  });

  const carregarInteracoes = useCallback(async () => {
    if (!params.id) return;
    const data = await apiFetch<Interacao[]>(`/api/empresas/${params.id}/interacoes`);
    setInteracoes(data);
  }, [params.id]);

  useEffect(() => {
    if (!params.id) return;
    apiFetch<Empresa>(`/api/empresas/${params.id}`)
      .then(setEmpresa)
      .catch(console.error);
    carregarInteracoes().catch(console.error);
  }, [params.id, carregarInteracoes]);

  async function registarInteracao(e: FormEvent) {
    e.preventDefault();
    if (!params.id || !form.conteudo.trim()) return;
    setAGuardar(true);
    setErro("");
    try {
      await apiFetch(`/api/empresas/${params.id}/interacoes`, {
        method: "POST",
        body: JSON.stringify({
          tipo: form.tipo,
          conteudo: form.conteudo,
          data: form.data || null,
        }),
      });
      setForm({ tipo: "EVENTO", data: "", conteudo: "" });
      await carregarInteracoes();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao registar interação");
    } finally {
      setAGuardar(false);
    }
  }

  if (!empresa) return <p>A carregar…</p>;

  const moradaCompleta = [
    empresa.morada,
    empresa.codigo_postal,
    empresa.localidade,
    empresa.concelho,
    empresa.distrito,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div>
      <Link href="/empresas" className="text-sm text-portic hover:underline">
        ← Empresas
      </Link>
      <h1 className="mt-2 text-2xl font-bold">{empresa.nome}</h1>
      <p className="mt-1 text-slate-600">
        NIF {empresa.nif}
        {empresa.cae && ` · CAE ${empresa.cae}`}
        {` · ${empresa.tipo_display}`}
        {` · ${empresa.estado_display}`}
        {empresa.setor && ` · ${empresa.setor}`}
      </p>
      {(empresa.email || empresa.telefone) && (
        <p className="mt-2 text-sm">
          {empresa.email && <span>{empresa.email}</span>}
          {empresa.telefone && <span> · {empresa.telefone}</span>}
        </p>
      )}
      {moradaCompleta && (
        <p className="mt-2 text-sm text-slate-600">
          <span className="font-medium text-slate-700">Morada: </span>
          {moradaCompleta}
        </p>
      )}

      <h2 className="mb-2 mt-6 font-semibold">Contactos</h2>
      <ul className="space-y-2">
        {empresa.contactos?.map((c) => (
          <li key={c.id} className="rounded-lg border bg-white p-3 text-sm">
            <strong>{c.nome}</strong>
            {c.cargo && ` — ${c.cargo}`}
            {c.email && <div className="text-slate-600">{c.email}</div>}
            {c.telefone && <div className="text-slate-600">{c.telefone}</div>}
          </li>
        ))}
        {!empresa.contactos?.length && (
          <li className="text-sm text-slate-500">Sem contactos registados.</li>
        )}
      </ul>

      <h2 className="mb-3 mt-8 font-semibold">Interações</h2>
      <form onSubmit={registarInteracao} className="mb-6 space-y-3 rounded-xl border bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm text-slate-600">
            Tipo
            <select
              value={form.tipo}
              onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}
              className="mt-1 w-full rounded-lg border px-3 py-2"
            >
              {TIPOS_INTERACAO.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-slate-600">
            Data (opcional)
            <input
              type="date"
              value={form.data}
              onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))}
              className="mt-1 w-full rounded-lg border px-3 py-2"
            />
          </label>
        </div>
        <label className="block text-sm text-slate-600">
          Texto
          <textarea
            required
            rows={4}
            value={form.conteudo}
            onChange={(e) => setForm((f) => ({ ...f, conteudo: e.target.value }))}
            placeholder="Escreva a interação, pedido ou nota…"
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
        </label>
        {erro && <p className="text-sm text-red-600">{erro}</p>}
        <button
          type="submit"
          disabled={aGuardar}
          className="rounded-lg bg-portic px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {aGuardar ? "A guardar…" : "Adicionar interação"}
        </button>
      </form>

      <div className="space-y-3">
        {interacoes.map((i) => (
          <article key={i.id} className="rounded-lg border bg-white p-4 text-sm">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="rounded-full bg-portic/10 px-2 py-0.5 font-medium text-portic">
                {i.tipo_display}
              </span>
              {i.data && <span>Data: {formatarData(i.data)}</span>}
              <span>Registado: {formatarDataHora(i.created_at)}</span>
              {i.registado_por_nome && <span>por {i.registado_por_nome}</span>}
            </div>
            <p className="whitespace-pre-wrap text-slate-800">{i.conteudo}</p>
          </article>
        ))}
        {interacoes.length === 0 && (
          <p className="text-sm text-slate-500">Ainda não há interações registadas.</p>
        )}
      </div>
    </div>
  );
}
