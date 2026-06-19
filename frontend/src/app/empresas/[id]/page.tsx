"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import ExportCsvButton from "@/components/reports/ExportCsvButton";
import { apiFetch, getStoredUser } from "@/lib/api";

type Contacto = { id: number; nome: string; cargo: string; email: string; telefone: string };
type ContactoForm = { nome: string; cargo: string; email: string; telefone: string };

type Empresa = {
  id: number;
  nome: string;
  nif: string;
  cae: string;
  setor: string;
  tipo: string;
  tipo_display: string;
  estado: string;
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
  evento_id: number | null;
  created_at: string;
};

type TipoInteracao = {
  id: number;
  codigo: string;
  nome: string;
  ordem: number;
  ativo: boolean;
};

const TIPOS = [
  { value: "CLIENTE", label: "Cliente" },
  { value: "PARCEIRO", label: "Parceiro" },
  { value: "FORNECEDOR", label: "Fornecedor" },
  { value: "ASSOCIADO", label: "Associado" },
] as const;

const ESTADOS = [
  { value: "ATIVO", label: "Ativo" },
  { value: "INATIVO", label: "Inativo" },
  { value: "PROSPETO", label: "Prospeto / Lead" },
  { value: "SUSPENSO", label: "Suspenso" },
  { value: "STARTUP", label: "StartUp" },
  { value: "PARCEIRA", label: "Parceira" },
] as const;

const CONTACTO_VAZIO: ContactoForm = { nome: "", cargo: "", email: "", telefone: "" };

type OrdenacaoDataInteracao = "desc" | "asc";

const inputClass = "mt-1 w-full rounded-lg border px-3 py-2";
const labelClass = "block text-sm text-slate-600";
const filtroLabelClass = "block text-xs font-medium text-slate-600";
const filtroInputClass = "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";

function formatCodigoPostal(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 7);
  if (digits.length <= 4) return digits;
  return `${digits.slice(0, 4)}-${digits.slice(4)}`;
}

function formatTelefone(value: string) {
  return value.replace(/[^\d+\s()-]/g, "");
}

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

function normalizarPesquisa(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function dataEfetivaInteracao(interacao: Interacao) {
  return interacao.data ?? interacao.created_at.slice(0, 10);
}

function interacaoCorrespondeData(interacao: Interacao, dataFiltro: string) {
  return dataEfetivaInteracao(interacao) === dataFiltro;
}

function interacaoCorrespondePesquisa(interacao: Interacao, pesquisa: string) {
  const termo = normalizarPesquisa(pesquisa);
  if (!termo) return true;

  const valores = [
    interacao.conteudo,
    interacao.tipo_display,
    interacao.registado_por_nome ?? "",
  ];

  return valores.some((valor) => normalizarPesquisa(valor).includes(termo));
}

function filtrarEOrdenarInteracoes(
  interacoes: Interacao[],
  pesquisa: string,
  tipo: string,
  data: string,
  ordenacao: OrdenacaoDataInteracao
) {
  const filtradas = interacoes.filter((interacao) => {
    if (tipo && interacao.tipo !== tipo) return false;
    if (data && !interacaoCorrespondeData(interacao, data)) return false;
    if (!interacaoCorrespondePesquisa(interacao, pesquisa)) return false;
    return true;
  });

  return [...filtradas].sort((a, b) => {
    const cmpData = dataEfetivaInteracao(a).localeCompare(dataEfetivaInteracao(b));
    if (cmpData !== 0) return ordenacao === "asc" ? cmpData : -cmpData;
    const cmpCriacao = a.created_at.localeCompare(b.created_at);
    return ordenacao === "asc" ? cmpCriacao : -cmpCriacao;
  });
}

function empresaParaForm(empresa: Empresa) {
  return {
    nome: empresa.nome,
    nif: empresa.nif,
    cae: empresa.cae || "",
    setor: empresa.setor || "",
    tipo: empresa.tipo,
    estado: empresa.estado,
    email: empresa.email || "",
    telefone: empresa.telefone || "",
    morada: empresa.morada || "",
    codigo_postal: empresa.codigo_postal || "",
    localidade: empresa.localidade || "",
    concelho: empresa.concelho || "",
    distrito: empresa.distrito || "",
  };
}

function contactosParaForm(contactos: Contacto[]): ContactoForm[] {
  if (!contactos.length) return [{ ...CONTACTO_VAZIO }];
  return contactos.map((c) => ({
    nome: c.nome,
    cargo: c.cargo || "",
    email: c.email || "",
    telefone: c.telefone || "",
  }));
}

export default function EmpresaDetailPage() {
  const params = useParams<{ id: string }>();
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [interacoes, setInteracoes] = useState<Interacao[]>([]);
  const [tiposInteracao, setTiposInteracao] = useState<TipoInteracao[]>([]);
  const [aGuardar, setAGuardar] = useState(false);
  const [erro, setErro] = useState("");
  const [formInteracao, setFormInteracao] = useState({
    tipo: "",
    data: "",
    conteudo: "",
  });

  const [modalEmpresa, setModalEmpresa] = useState(false);
  const [formEmpresa, setFormEmpresa] = useState({
    nome: "",
    nif: "",
    cae: "",
    setor: "",
    tipo: "CLIENTE",
    estado: "ATIVO",
    email: "",
    telefone: "",
    morada: "",
    codigo_postal: "",
    localidade: "",
    concelho: "",
    distrito: "",
  });
  const [contactosForm, setContactosForm] = useState<ContactoForm[]>([{ ...CONTACTO_VAZIO }]);
  const [erroEmpresa, setErroEmpresa] = useState("");

  const [interacaoAEditar, setInteracaoAEditar] = useState<Interacao | null>(null);
  const [formEditarInteracao, setFormEditarInteracao] = useState({
    tipo: "",
    data: "",
    conteudo: "",
  });
  const [erroInteracao, setErroInteracao] = useState("");
  const [pesquisaInteracao, setPesquisaInteracao] = useState("");
  const [filtroTipoInteracao, setFiltroTipoInteracao] = useState("");
  const [filtroDataInteracao, setFiltroDataInteracao] = useState("");
  const [ordenacaoDataInteracao, setOrdenacaoDataInteracao] =
    useState<OrdenacaoDataInteracao>("desc");

  const interacoesFiltradas = useMemo(
    () =>
      filtrarEOrdenarInteracoes(
        interacoes,
        pesquisaInteracao,
        filtroTipoInteracao,
        filtroDataInteracao,
        ordenacaoDataInteracao
      ),
    [
      interacoes,
      pesquisaInteracao,
      filtroTipoInteracao,
      filtroDataInteracao,
      ordenacaoDataInteracao,
    ]
  );

  const filtrosInteracaoAtivos = Boolean(
    pesquisaInteracao ||
      filtroTipoInteracao ||
      filtroDataInteracao ||
      ordenacaoDataInteracao !== "desc"
  );

  const carregarEmpresa = useCallback(async () => {
    if (!params.id) return;
    const data = await apiFetch<Empresa>(`/api/empresas/${params.id}`);
    setEmpresa(data);
  }, [params.id]);

  const carregarInteracoes = useCallback(async () => {
    if (!params.id) return;
    const data = await apiFetch<Interacao[]>(`/api/empresas/${params.id}/interacoes`);
    setInteracoes(data);
  }, [params.id]);

  const carregarTiposInteracao = useCallback(async () => {
    const data = await apiFetch<TipoInteracao[]>("/api/empresas/tipos-interacao?ativos=1");
    setTiposInteracao(data);
    if (data.length > 0) {
      setFormInteracao((f) => (f.tipo ? f : { ...f, tipo: data[0].codigo }));
    }
  }, []);

  useEffect(() => {
    carregarEmpresa().catch(console.error);
    carregarInteracoes().catch(console.error);
    carregarTiposInteracao().catch(console.error);
  }, [carregarEmpresa, carregarInteracoes, carregarTiposInteracao]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setModalEmpresa(false);
        setInteracaoAEditar(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function abrirEditarEmpresa() {
    if (!empresa) return;
    setFormEmpresa(empresaParaForm(empresa));
    setContactosForm(contactosParaForm(empresa.contactos));
    setErroEmpresa("");
    setModalEmpresa(true);
  }

  function adicionarContacto() {
    setContactosForm((c) => [...c, { ...CONTACTO_VAZIO }]);
  }

  function removerContacto(index: number) {
    setContactosForm((c) => (c.length <= 1 ? c : c.filter((_, i) => i !== index)));
  }

  function atualizarContacto(index: number, campo: keyof ContactoForm, valor: string) {
    setContactosForm((c) => c.map((item, i) => (i === index ? { ...item, [campo]: valor } : item)));
  }

  async function guardarEmpresa(e: FormEvent) {
    e.preventDefault();
    if (!params.id || !formEmpresa.nome.trim() || !formEmpresa.nif.trim()) return;
    setAGuardar(true);
    setErroEmpresa("");
    try {
      const contactosValidos = contactosForm.filter((c) => c.nome.trim());
      const data = await apiFetch<Empresa>(`/api/empresas/${params.id}`, {
        method: "PATCH",
        body: JSON.stringify({ ...formEmpresa, contactos: contactosValidos }),
      });
      setEmpresa(data);
      setModalEmpresa(false);
    } catch (err) {
      setErroEmpresa(err instanceof Error ? err.message : "Erro ao guardar empresa");
    } finally {
      setAGuardar(false);
    }
  }

  async function registarInteracao(e: FormEvent) {
    e.preventDefault();
    if (!params.id || !formInteracao.conteudo.trim()) return;
    setAGuardar(true);
    setErro("");
    try {
      await apiFetch(`/api/empresas/${params.id}/interacoes`, {
        method: "POST",
        body: JSON.stringify({
          tipo: formInteracao.tipo,
          conteudo: formInteracao.conteudo,
          data: formInteracao.data || null,
        }),
      });
      setFormInteracao({
        tipo: tiposInteracao[0]?.codigo ?? "",
        data: "",
        conteudo: "",
      });
      await carregarInteracoes();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao registar interação");
    } finally {
      setAGuardar(false);
    }
  }

  function abrirEditarInteracao(interacao: Interacao) {
    setInteracaoAEditar(interacao);
    setFormEditarInteracao({
      tipo: interacao.tipo,
      data: interacao.data || "",
      conteudo: interacao.conteudo,
    });
    setErroInteracao("");
  }

  async function guardarInteracao(e: FormEvent) {
    e.preventDefault();
    if (!params.id || !interacaoAEditar || !formEditarInteracao.conteudo.trim()) return;
    setAGuardar(true);
    setErroInteracao("");
    try {
      await apiFetch(`/api/empresas/${params.id}/interacoes/${interacaoAEditar.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          tipo: formEditarInteracao.tipo,
          conteudo: formEditarInteracao.conteudo,
          data: formEditarInteracao.data || null,
        }),
      });
      setInteracaoAEditar(null);
      await carregarInteracoes();
    } catch (err) {
      setErroInteracao(err instanceof Error ? err.message : "Erro ao editar interação");
    } finally {
      setAGuardar(false);
    }
  }

  async function excluirInteracao(interacao: Interacao) {
    if (!params.id) return;
    if (!window.confirm("Tem a certeza que deseja excluir esta interação?")) return;
    setAGuardar(true);
    setErro("");
    try {
      await apiFetch(`/api/empresas/${params.id}/interacoes/${interacao.id}`, {
        method: "DELETE",
      });
      await carregarInteracoes();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao excluir interação");
    } finally {
      setAGuardar(false);
    }
  }

  if (!empresa) return <p>A carregar…</p>;

  const user = getStoredUser();
  const podeGerirEventos = Boolean(user?.admin_geral || user?.permissoes?.gerir_eventos);

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

      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{empresa.nome}</h1>
          <p className="mt-1 text-slate-600">
            NIF {empresa.nif}
            {empresa.cae && ` · CAE ${empresa.cae}`}
            {` · ${empresa.tipo_display}`}
            {` · ${empresa.estado_display}`}
            {empresa.setor && ` · ${empresa.setor}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={abrirEditarEmpresa}
            className="rounded-lg border border-portic px-4 py-2 text-sm font-medium text-portic hover:bg-portic/5"
          >
            Editar empresa
          </button>
          {podeGerirEventos && (
            <Link
              href={`/dashboard/eventos?empresa=${empresa.id}`}
              className="rounded-lg bg-portic px-4 py-2 text-sm font-medium text-white hover:bg-portic/90"
            >
              Adicionar evento
            </Link>
          )}
        </div>
      </div>

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

      <div className="mb-3 mt-8 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold">Interações</h2>
          {interacoes.length > 0 && (
            <p className="mt-0.5 text-xs text-slate-500">
              {filtrosInteracaoAtivos
                ? `${interacoesFiltradas.length} de ${interacoes.length} interações`
                : `${interacoes.length} interação${interacoes.length === 1 ? "" : "ões"}`}
            </p>
          )}
        </div>
        <ExportCsvButton
          filename={`empresa_${params.id}_interacoes.csv`}
          rows={interacoesFiltradas}
          columns={[
            {
              key: "data",
              header: "Data",
              format: (row) => formatarData(row.data) ?? formatarData(row.created_at.slice(0, 10)) ?? "",
            },
            { key: "tipo_display", header: "Tipo" },
            { key: "conteudo", header: "Conteúdo" },
            { key: "registado_por_nome", header: "Registado por" },
          ]}
        />
      </div>

      <form onSubmit={registarInteracao} className="mb-6 space-y-3 rounded-xl border bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={labelClass}>
            Tipo
            <select
              value={formInteracao.tipo}
              onChange={(e) => setFormInteracao((f) => ({ ...f, tipo: e.target.value }))}
              className={inputClass}
            >
              {tiposInteracao.map((t) => (
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
              value={formInteracao.data}
              onChange={(e) => setFormInteracao((f) => ({ ...f, data: e.target.value }))}
              className={inputClass}
            />
          </label>
        </div>
        <label className={labelClass}>
          Texto
          <textarea
            required
            rows={4}
            value={formInteracao.conteudo}
            onChange={(e) => setFormInteracao((f) => ({ ...f, conteudo: e.target.value }))}
            placeholder="Escreva a interação, pedido ou nota…"
            className={inputClass}
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

      <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-slate-700">Filtrar interações</p>
          {filtrosInteracaoAtivos && (
            <button
              type="button"
              onClick={() => {
                setPesquisaInteracao("");
                setFiltroTipoInteracao("");
                setFiltroDataInteracao("");
                setOrdenacaoDataInteracao("desc");
              }}
              className="text-xs font-medium text-portic hover:underline"
            >
              Limpar filtros
            </button>
          )}
        </div>
        <div className="grid gap-3">
          <label className={filtroLabelClass}>
            Pesquisar
            <input
              type="search"
              value={pesquisaInteracao}
              onChange={(e) => setPesquisaInteracao(e.target.value)}
              placeholder="Texto, tipo ou registado por…"
              className={filtroInputClass}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className={filtroLabelClass}>
              Tipo
              <select
                value={filtroTipoInteracao}
                onChange={(e) => setFiltroTipoInteracao(e.target.value)}
                className={filtroInputClass}
              >
                <option value="">Todos</option>
                {tiposInteracao.map((t) => (
                  <option key={t.codigo} value={t.codigo}>
                    {t.nome}
                  </option>
                ))}
              </select>
            </label>
            <label className={filtroLabelClass}>
              Data
              <input
                type="date"
                value={filtroDataInteracao}
                onChange={(e) => setFiltroDataInteracao(e.target.value)}
                className={filtroInputClass}
              />
            </label>
            <label className={filtroLabelClass}>
              Ordenar por data
              <select
                value={ordenacaoDataInteracao}
                onChange={(e) =>
                  setOrdenacaoDataInteracao(e.target.value as OrdenacaoDataInteracao)
                }
                className={filtroInputClass}
              >
                <option value="desc">Mais recente primeiro</option>
                <option value="asc">Mais antiga primeiro</option>
              </select>
            </label>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {interacoesFiltradas.map((i) => (
          <article key={i.id} className="rounded-lg border bg-white p-4 text-sm">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="rounded-full bg-portic/10 px-2 py-0.5 font-medium text-portic">
                  {i.tipo_display}
                </span>
                {i.data && <span>Data: {formatarData(i.data)}</span>}
                <span>Registado: {formatarDataHora(i.created_at)}</span>
                {i.registado_por_nome && <span>por {i.registado_por_nome}</span>}
              </div>
              <div className="flex gap-2">
                {i.evento_id ? (
                  <Link
                    href={`/dashboard/eventos?evento=${i.evento_id}`}
                    className="text-xs font-medium text-portic hover:underline"
                  >
                    Ver evento
                  </Link>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => abrirEditarInteracao(i)}
                      className="text-xs font-medium text-portic hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => excluirInteracao(i)}
                      className="text-xs font-medium text-red-600 hover:underline"
                    >
                      Excluir
                    </button>
                  </>
                )}
              </div>
            </div>
            <p className="whitespace-pre-wrap text-slate-800">{i.conteudo}</p>
          </article>
        ))}
        {interacoes.length === 0 && (
          <p className="text-sm text-slate-500">Ainda não há interações registadas.</p>
        )}
        {interacoes.length > 0 && interacoesFiltradas.length === 0 && (
          <p className="text-sm text-slate-500">Nenhuma interação corresponde aos filtros aplicados.</p>
        )}
      </div>

      {modalEmpresa && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setModalEmpresa(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="sticky top-0 z-10 border-b bg-white px-6 py-4">
              <h2 className="text-lg font-bold">Editar empresa</h2>
            </div>
            <form onSubmit={guardarEmpresa} className="space-y-6 px-6 py-5">
              <section>
                <h3 className="mb-3 text-sm font-semibold text-slate-800">Dados gerais</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className={`${labelClass} sm:col-span-2`}>
                    Nome *
                    <input
                      required
                      value={formEmpresa.nome}
                      onChange={(e) => setFormEmpresa((f) => ({ ...f, nome: e.target.value }))}
                      className={inputClass}
                    />
                  </label>
                  <label className={labelClass}>
                    NIF *
                    <input
                      required
                      value={formEmpresa.nif}
                      onChange={(e) => setFormEmpresa((f) => ({ ...f, nif: e.target.value }))}
                      className={inputClass}
                    />
                  </label>
                  <label className={labelClass}>
                    CAE
                    <input
                      value={formEmpresa.cae}
                      onChange={(e) => setFormEmpresa((f) => ({ ...f, cae: e.target.value }))}
                      className={inputClass}
                    />
                  </label>
                  <label className={labelClass}>
                    Tipo *
                    <select
                      value={formEmpresa.tipo}
                      onChange={(e) => setFormEmpresa((f) => ({ ...f, tipo: e.target.value }))}
                      className={inputClass}
                    >
                      {TIPOS.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={labelClass}>
                    Estado *
                    <select
                      value={formEmpresa.estado}
                      onChange={(e) => setFormEmpresa((f) => ({ ...f, estado: e.target.value }))}
                      className={inputClass}
                    >
                      {ESTADOS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={labelClass}>
                    Setor
                    <input
                      value={formEmpresa.setor}
                      onChange={(e) => setFormEmpresa((f) => ({ ...f, setor: e.target.value }))}
                      className={inputClass}
                    />
                  </label>
                  <label className={labelClass}>
                    Email
                    <input
                      type="email"
                      value={formEmpresa.email}
                      onChange={(e) => setFormEmpresa((f) => ({ ...f, email: e.target.value }))}
                      className={inputClass}
                    />
                  </label>
                  <label className={labelClass}>
                    Telefone
                    <input
                      type="tel"
                      value={formEmpresa.telefone}
                      onChange={(e) =>
                        setFormEmpresa((f) => ({ ...f, telefone: formatTelefone(e.target.value) }))
                      }
                      className={inputClass}
                    />
                  </label>
                </div>
              </section>

              <section>
                <h3 className="mb-3 text-sm font-semibold text-slate-800">Morada</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className={`${labelClass} sm:col-span-2`}>
                    Morada (rua, número)
                    <input
                      value={formEmpresa.morada}
                      onChange={(e) => setFormEmpresa((f) => ({ ...f, morada: e.target.value }))}
                      className={inputClass}
                    />
                  </label>
                  <label className={labelClass}>
                    Código postal
                    <input
                      value={formEmpresa.codigo_postal}
                      onChange={(e) =>
                        setFormEmpresa((f) => ({
                          ...f,
                          codigo_postal: formatCodigoPostal(e.target.value),
                        }))
                      }
                      placeholder="XXXX-XXX"
                      maxLength={8}
                      className={inputClass}
                    />
                  </label>
                  <label className={labelClass}>
                    Localidade
                    <input
                      value={formEmpresa.localidade}
                      onChange={(e) => setFormEmpresa((f) => ({ ...f, localidade: e.target.value }))}
                      className={inputClass}
                    />
                  </label>
                  <label className={labelClass}>
                    Concelho
                    <input
                      value={formEmpresa.concelho}
                      onChange={(e) => setFormEmpresa((f) => ({ ...f, concelho: e.target.value }))}
                      className={inputClass}
                    />
                  </label>
                  <label className={labelClass}>
                    Distrito
                    <input
                      value={formEmpresa.distrito}
                      onChange={(e) => setFormEmpresa((f) => ({ ...f, distrito: e.target.value }))}
                      className={inputClass}
                    />
                  </label>
                </div>
              </section>

              <section>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-slate-800">Pessoas de contacto</h3>
                  <button
                    type="button"
                    onClick={adicionarContacto}
                    className="rounded-lg border border-portic px-3 py-1.5 text-sm font-medium text-portic hover:bg-portic/5"
                  >
                    + Adicionar pessoa
                  </button>
                </div>
                <div className="space-y-4">
                  {contactosForm.map((contacto, index) => (
                    <div key={index} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500">Pessoa {index + 1}</span>
                        {contactosForm.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removerContacto(index)}
                            className="text-xs text-red-600 hover:underline"
                          >
                            Remover
                          </button>
                        )}
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className={labelClass}>
                          Nome
                          <input
                            value={contacto.nome}
                            onChange={(e) => atualizarContacto(index, "nome", e.target.value)}
                            className={inputClass}
                          />
                        </label>
                        <label className={labelClass}>
                          Cargo
                          <input
                            value={contacto.cargo}
                            onChange={(e) => atualizarContacto(index, "cargo", e.target.value)}
                            className={inputClass}
                          />
                        </label>
                        <label className={labelClass}>
                          Email
                          <input
                            type="email"
                            value={contacto.email}
                            onChange={(e) => atualizarContacto(index, "email", e.target.value)}
                            className={inputClass}
                          />
                        </label>
                        <label className={labelClass}>
                          Telefone
                          <input
                            type="tel"
                            value={contacto.telefone}
                            onChange={(e) =>
                              atualizarContacto(index, "telefone", formatTelefone(e.target.value))
                            }
                            className={inputClass}
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {erroEmpresa && <p className="text-sm text-red-600">{erroEmpresa}</p>}
              <div className="flex justify-end gap-3 border-t pt-4">
                <button
                  type="button"
                  onClick={() => setModalEmpresa(false)}
                  className="rounded-lg border px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
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

      {interacaoAEditar && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setInteracaoAEditar(null)}
        >
          <div
            className="w-full max-w-lg rounded-xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="border-b px-6 py-4">
              <h2 className="text-lg font-bold">Editar interação</h2>
            </div>
            <form onSubmit={guardarInteracao} className="space-y-4 px-6 py-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className={labelClass}>
                  Tipo
                  <select
                    value={formEditarInteracao.tipo}
                    onChange={(e) =>
                      setFormEditarInteracao((f) => ({ ...f, tipo: e.target.value }))
                    }
                    className={inputClass}
                  >
                    {(interacaoAEditar &&
                    !tiposInteracao.some((t) => t.codigo === formEditarInteracao.tipo)
                      ? [
                          {
                            codigo: formEditarInteracao.tipo,
                            nome: interacaoAEditar.tipo_display,
                          },
                          ...tiposInteracao,
                        ]
                      : tiposInteracao
                    ).map((t) => (
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
                    value={formEditarInteracao.data}
                    onChange={(e) =>
                      setFormEditarInteracao((f) => ({ ...f, data: e.target.value }))
                    }
                    className={inputClass}
                  />
                </label>
              </div>
              <label className={labelClass}>
                Texto
                <textarea
                  required
                  rows={4}
                  value={formEditarInteracao.conteudo}
                  onChange={(e) =>
                    setFormEditarInteracao((f) => ({ ...f, conteudo: e.target.value }))
                  }
                  className={inputClass}
                />
              </label>
              {erroInteracao && <p className="text-sm text-red-600">{erroInteracao}</p>}
              <div className="flex justify-end gap-3 border-t pt-4">
                <button
                  type="button"
                  onClick={() => setInteracaoAEditar(null)}
                  className="rounded-lg border px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
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
