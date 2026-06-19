"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import EmpresasColunasMenu, {
  COLUNAS_EMPRESA,
  COLUNAS_EMPRESA_PADRAO,
  type ColunaEmpresaId,
  lerColunasVisiveis,
} from "@/components/empresas/EmpresasColunasMenu";
import ExportCsvButton from "@/components/reports/ExportCsvButton";
import { apiFetch } from "@/lib/api";

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
  localidade: string;
  ultima_interacao: string;
};

type ContactoForm = {
  nome: string;
  cargo: string;
  email: string;
  telefone: string;
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

const FORM_VAZIO = {
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
};

function formatCodigoPostal(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 7);
  if (digits.length <= 4) return digits;
  return `${digits.slice(0, 4)}-${digits.slice(4)}`;
}

function formatTelefone(value: string) {
  return value.replace(/[^\d+\s()-]/g, "");
}

const inputClass = "mt-1 w-full rounded-lg border px-3 py-2";
const labelClass = "block text-sm text-slate-600";

function formatarDataLista(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-PT");
}

function valorColunaEmpresa(empresa: Empresa, coluna: ColunaEmpresaId): string {
  switch (coluna) {
    case "nif":
      return empresa.nif;
    case "cae":
      return empresa.cae || "—";
    case "tipo":
      return empresa.tipo_display;
    case "estado":
      return empresa.estado_display;
    case "setor":
      return empresa.setor || "—";
    case "email":
      return empresa.email || "—";
    case "telefone":
      return empresa.telefone || "—";
    case "localidade":
      return empresa.localidade || "—";
    case "ultima_interacao":
      return formatarDataLista(empresa.ultima_interacao);
    default:
      return "—";
  }
}

export default function EmpresasPage() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [q, setQ] = useState("");
  const [tipo, setTipo] = useState("");
  const [estado, setEstado] = useState("");
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [aMostrarForm, setAMostrarForm] = useState(false);
  const [aGuardar, setAGuardar] = useState(false);
  const [form, setForm] = useState(FORM_VAZIO);
  const [contactos, setContactos] = useState<ContactoForm[]>([{ ...CONTACTO_VAZIO }]);
  const [colunasVisiveis, setColunasVisiveis] = useState<ColunaEmpresaId[]>(COLUNAS_EMPRESA_PADRAO);

  useEffect(() => {
    setColunasVisiveis(lerColunasVisiveis());
  }, []);

  const colunasAtivas = useMemo(
    () => COLUNAS_EMPRESA.filter((coluna) => colunasVisiveis.includes(coluna.id)),
    [colunasVisiveis]
  );

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro("");
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (tipo) params.set("tipo", tipo);
      if (estado) params.set("estado", estado);
      const qs = params.toString();
      const data = await apiFetch<Empresa[]>(`/api/empresas${qs ? `?${qs}` : ""}`);
      setEmpresas(data);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }, [q, tipo, estado]);

  useEffect(() => {
    const t = setTimeout(() => void carregar(), 300);
    return () => clearTimeout(t);
  }, [carregar]);

  function adicionarContacto() {
    setContactos((c) => [...c, { ...CONTACTO_VAZIO }]);
  }

  function removerContacto(index: number) {
    setContactos((c) => (c.length <= 1 ? c : c.filter((_, i) => i !== index)));
  }

  function atualizarContacto(index: number, campo: keyof ContactoForm, valor: string) {
    setContactos((c) => c.map((item, i) => (i === index ? { ...item, [campo]: valor } : item)));
  }

  async function criarEmpresa(e: FormEvent) {
    e.preventDefault();
    if (!form.nome.trim() || !form.nif.trim()) return;
    setAGuardar(true);
    setErro("");
    try {
      const contactosValidos = contactos.filter((c) => c.nome.trim());
      await apiFetch("/api/empresas", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          contactos: contactosValidos,
        }),
      });
      setForm(FORM_VAZIO);
      setContactos([{ ...CONTACTO_VAZIO }]);
      setAMostrarForm(false);
      await carregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao criar empresa");
    } finally {
      setAGuardar(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Empresas</h1>
        <div className="flex flex-wrap items-center gap-2">
          <ExportCsvButton
            filename="empresas.csv"
            apiPath={`/api/empresas${(() => {
              const p = new URLSearchParams();
              if (q) p.set("q", q);
              if (tipo) p.set("tipo", tipo);
              if (estado) p.set("estado", estado);
              const qs = p.toString();
              return qs ? `?${qs}` : "";
            })()}`}
          />
          <button
            type="button"
            onClick={() => setAMostrarForm((v) => !v)}
            className="rounded-lg bg-portic px-4 py-2 text-sm font-medium text-white hover:bg-portic-light"
          >
            {aMostrarForm ? "Cancelar" : "+ Nova empresa"}
          </button>
        </div>
      </div>

      {aMostrarForm && (
        <form onSubmit={criarEmpresa} className="mb-6 space-y-6 rounded-xl border bg-white p-4">
          <section>
            <h2 className="mb-3 text-sm font-semibold text-slate-800">Dados gerais</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={`${labelClass} sm:col-span-2`}>
                Nome *
                <input
                  required
                  value={form.nome}
                  onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                NIF *
                <input
                  required
                  value={form.nif}
                  onChange={(e) => setForm((f) => ({ ...f, nif: e.target.value }))}
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                CAE (Código de Atividade Económica)
                <input
                  value={form.cae}
                  onChange={(e) => setForm((f) => ({ ...f, cae: e.target.value }))}
                  placeholder="Ex.: 62010"
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                Tipo *
                <select
                  value={form.tipo}
                  onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}
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
                  value={form.estado}
                  onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value }))}
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
                  value={form.setor}
                  onChange={(e) => setForm((f) => ({ ...f, setor: e.target.value }))}
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                Email (empresa)
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                Telefone (empresa)
                <input
                  type="tel"
                  value={form.telefone}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, telefone: formatTelefone(e.target.value) }))
                  }
                  placeholder="+351 912 345 678"
                  className={inputClass}
                />
              </label>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold text-slate-800">Morada</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={`${labelClass} sm:col-span-2`}>
                Morada (rua, número)
                <input
                  value={form.morada}
                  onChange={(e) => setForm((f) => ({ ...f, morada: e.target.value }))}
                  placeholder="Rua Exemplo, 123"
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                Código postal
                <input
                  value={form.codigo_postal}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, codigo_postal: formatCodigoPostal(e.target.value) }))
                  }
                  placeholder="XXXX-XXX"
                  maxLength={8}
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                Localidade
                <input
                  value={form.localidade}
                  onChange={(e) => setForm((f) => ({ ...f, localidade: e.target.value }))}
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                Concelho
                <input
                  value={form.concelho}
                  onChange={(e) => setForm((f) => ({ ...f, concelho: e.target.value }))}
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                Distrito
                <input
                  value={form.distrito}
                  onChange={(e) => setForm((f) => ({ ...f, distrito: e.target.value }))}
                  className={inputClass}
                />
              </label>
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-slate-800">Pessoas de contacto</h2>
              <button
                type="button"
                onClick={adicionarContacto}
                className="rounded-lg border border-portic px-3 py-1.5 text-sm font-medium text-portic hover:bg-portic/5"
              >
                + Adicionar pessoa
              </button>
            </div>
            <div className="space-y-4">
              {contactos.map((contacto, index) => (
                <div key={index} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500">Pessoa {index + 1}</span>
                    {contactos.length > 1 && (
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
                        placeholder="+351 912 345 678"
                        className={inputClass}
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <button
            type="submit"
            disabled={aGuardar}
            className="rounded-lg bg-portic px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {aGuardar ? "A guardar…" : "Criar empresa"}
          </button>
        </form>
      )}

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Pesquisar nome, NIF, CAE, setor…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="min-w-[200px] flex-1 rounded-lg border px-3 py-2"
        />
        <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="rounded-lg border px-3 py-2">
          <option value="">Todos os tipos</option>
          {TIPOS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <select value={estado} onChange={(e) => setEstado(e.target.value)} className="rounded-lg border px-3 py-2">
          <option value="">Todos os estados</option>
          {ESTADOS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      {erro && <p className="mb-4 text-red-600">{erro}</p>}
      {loading ? (
        <p className="text-slate-500">A carregar…</p>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-3 text-left">Nome</th>
                {colunasAtivas.map((coluna) => (
                  <th key={coluna.id} className="p-3 text-left">
                    {coluna.label}
                  </th>
                ))}
                <th className="p-3 text-right">
                  <EmpresasColunasMenu visiveis={colunasVisiveis} onChange={setColunasVisiveis} />
                </th>
              </tr>
            </thead>
            <tbody>
              {empresas.map((e) => (
                <tr key={e.id} className="border-t hover:bg-slate-50">
                  <td className="p-3 font-medium">{e.nome}</td>
                  {colunasAtivas.map((coluna) => (
                    <td key={coluna.id} className="p-3">
                      {valorColunaEmpresa(e, coluna.id)}
                    </td>
                  ))}
                  <td className="p-3 text-right">
                    <Link href={`/empresas/${e.id}`} className="text-portic hover:underline">
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {empresas.length === 0 && <p className="p-6 text-center text-slate-500">Nenhuma empresa encontrada.</p>}
        </div>
      )}
    </div>
  );
}
