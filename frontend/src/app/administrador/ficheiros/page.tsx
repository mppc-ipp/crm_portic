"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";

type Ficheiro = {
  modulo: string;
  modelo: string | null;
  object_id: number | null;
  descricao: string;
  caminho_relativo: string;
  caminho_disco: string;
  tamanho: number;
  modificado_em: string | null;
  estado: "referenciado" | "orfao" | "em_falta";
};

type ModuloResumo = {
  modulo: string;
  ficheiros: number;
  tamanho: number;
};

type FicheirosInfo = {
  resumo: {
    modulos: ModuloResumo[];
    total_ficheiros: number;
    total_tamanho: number;
    tamanho_referenciado: number;
    orfaos_ficheiros: number;
    orfaos_tamanho: number;
    em_falta: number;
  };
  ficheiros: Ficheiro[];
  limpeza: {
    dias: number;
    automatica: boolean;
    ultima: string | null;
  };
};

const ESTADO_LABEL: Record<Ficheiro["estado"], string> = {
  referenciado: "Referenciado",
  orfao: "Órfão",
  em_falta: "Em falta",
};

const ESTADO_CLASS: Record<Ficheiro["estado"], string> = {
  referenciado: "bg-green-50 text-green-700",
  orfao: "bg-amber-50 text-amber-700",
  em_falta: "bg-red-50 text-red-700",
};

function formatarTamanho(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const unidades = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(unidades.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${unidades[i]}`;
}

export default function FicheirosPage() {
  const [info, setInfo] = useState<FicheirosInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState("");
  const [a_processar, setProcessar] = useState(false);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [limpezaForm, setLimpezaForm] = useState({ dias: 0, automatica: false });

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<FicheirosInfo>("/api/admin/ficheiros");
      setInfo(data);
      setLimpezaForm({ dias: data.limpeza.dias, automatica: data.limpeza.automatica });
      setSelecionados(new Set());
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const orfaos = useMemo(
    () => (info?.ficheiros ?? []).filter((f) => f.estado === "orfao"),
    [info],
  );

  function alternarSelecao(caminho: string) {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (novo.has(caminho)) novo.delete(caminho);
      else novo.add(caminho);
      return novo;
    });
  }

  async function limpar(paths: string[], confirmacao: string) {
    if (paths.length === 0) return;
    if (!window.confirm(confirmacao)) return;
    setProcessar(true);
    setErro("");
    setOk("");
    try {
      const res = await apiFetch<{ total_apagados: number; bytes_libertados: number; estado: FicheirosInfo }>(
        "/api/admin/ficheiros",
        { method: "POST", body: JSON.stringify({ paths }) },
      );
      setInfo(res.estado);
      setLimpezaForm({
        dias: res.estado.limpeza.dias,
        automatica: res.estado.limpeza.automatica,
      });
      setSelecionados(new Set());
      setOk(
        `${res.total_apagados} ficheiro(s) removido(s) — ${formatarTamanho(res.bytes_libertados)} libertados.`,
      );
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao remover ficheiros");
    } finally {
      setProcessar(false);
    }
  }

  async function limparTodosOrfaos() {
    if (orfaos.length === 0) return;
    if (
      !window.confirm(
        `Remover todos os ${orfaos.length} ficheiros órfãos? Esta ação é irreversível.`,
      )
    )
      return;
    setProcessar(true);
    setErro("");
    setOk("");
    try {
      const res = await apiFetch<{ total_apagados: number; bytes_libertados: number; estado: FicheirosInfo }>(
        "/api/admin/ficheiros",
        { method: "POST", body: JSON.stringify({ todos_orfaos: true }) },
      );
      setInfo(res.estado);
      setLimpezaForm({
        dias: res.estado.limpeza.dias,
        automatica: res.estado.limpeza.automatica,
      });
      setSelecionados(new Set());
      setOk(
        `${res.total_apagados} ficheiro(s) órfão(s) removido(s) — ${formatarTamanho(res.bytes_libertados)} libertados.`,
      );
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao remover ficheiros");
    } finally {
      setProcessar(false);
    }
  }

  async function guardarLimpeza(e: FormEvent) {
    e.preventDefault();
    setProcessar(true);
    setErro("");
    setOk("");
    try {
      const data = await apiFetch<FicheirosInfo>("/api/admin/ficheiros", {
        method: "PATCH",
        body: JSON.stringify(limpezaForm),
      });
      setInfo(data);
      setLimpezaForm({ dias: data.limpeza.dias, automatica: data.limpeza.automatica });
      setOk("Política de limpeza guardada.");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao guardar");
    } finally {
      setProcessar(false);
    }
  }

  if (loading) return <p className="text-sm text-slate-500">A carregar…</p>;
  if (!info) return <p className="text-sm text-red-600">{erro || "Sem dados"}</p>;

  const { resumo } = info;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Gestão de ficheiros</h2>
        <p className="mt-1 text-sm text-slate-600">
          Inventário do armazenamento em disco. Os ficheiros órfãos (sem registo na base de
          dados) podem ser removidos para libertar espaço.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="Espaço total" value={formatarTamanho(resumo.total_tamanho)} />
        <Card title="Ficheiros (com registo)" value={String(resumo.total_ficheiros)} />
        <Card
          title="Órfãos"
          value={`${resumo.orfaos_ficheiros} · ${formatarTamanho(resumo.orfaos_tamanho)}`}
          warn={resumo.orfaos_ficheiros > 0}
        />
        <Card
          title="Em falta no disco"
          value={String(resumo.em_falta)}
          warn={resumo.em_falta > 0}
        />
      </section>

      {resumo.modulos.length > 0 && (
        <section className="rounded-xl border bg-white p-5">
          <h3 className="mb-3 font-semibold">Uso por módulo</h3>
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            {resumo.modulos.map((m) => (
              <div key={m.modulo} className="flex justify-between rounded-lg bg-slate-50 px-3 py-2">
                <span className="text-slate-700">{m.modulo}</span>
                <span className="font-medium">
                  {m.ficheiros} · {formatarTamanho(m.tamanho)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-xl border bg-white p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold">Ficheiros ({info.ficheiros.length})</h3>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                void limpar(
                  Array.from(selecionados),
                  `Remover ${selecionados.size} ficheiro(s) selecionado(s)? Esta ação é irreversível.`,
                )
              }
              disabled={a_processar || selecionados.size === 0}
              className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-slate-50 disabled:opacity-50"
            >
              Limpar selecionados ({selecionados.size})
            </button>
            <button
              type="button"
              onClick={() => void limparTodosOrfaos()}
              disabled={a_processar || orfaos.length === 0}
              className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50"
            >
              Limpar todos os órfãos ({orfaos.length})
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-xs uppercase text-slate-500">
                <th className="w-8 px-2 py-2"></th>
                <th className="px-2 py-2">Módulo</th>
                <th className="px-2 py-2">Descrição</th>
                <th className="px-2 py-2">Caminho em disco</th>
                <th className="px-2 py-2 text-right">Tamanho</th>
                <th className="px-2 py-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {info.ficheiros.map((f) => {
                const selecionavel = f.estado !== "em_falta";
                return (
                  <tr key={f.caminho_disco} className="border-b last:border-0">
                    <td className="px-2 py-2">
                      <input
                        type="checkbox"
                        disabled={!selecionavel}
                        checked={selecionados.has(f.caminho_disco)}
                        onChange={() => alternarSelecao(f.caminho_disco)}
                      />
                    </td>
                    <td className="px-2 py-2 text-slate-700">{f.modulo}</td>
                    <td className="px-2 py-2 text-slate-600">{f.descricao}</td>
                    <td className="px-2 py-2">
                      <code className="break-all text-xs text-slate-500">{f.caminho_disco}</code>
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">
                      {formatarTamanho(f.tamanho)}
                    </td>
                    <td className="px-2 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${ESTADO_CLASS[f.estado]}`}
                      >
                        {ESTADO_LABEL[f.estado]}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {info.ficheiros.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-2 py-6 text-center text-slate-500">
                    Nenhum ficheiro encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <form onSubmit={guardarLimpeza} className="rounded-xl border bg-white p-5">
        <h3 className="mb-1 font-semibold">Limpeza automática</h3>
        <p className="mb-4 text-sm text-slate-600">
          Quando ativa, uma rotina diária remove automaticamente os ficheiros órfãos mais antigos
          do que o número de dias indicado. Ficheiros com registo na base de dados nunca são
          apagados.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm text-slate-600">
            Apagar órfãos com mais de (dias)
            <input
              type="number"
              min={0}
              value={limpezaForm.dias}
              onChange={(e) =>
                setLimpezaForm((f) => ({ ...f, dias: parseInt(e.target.value, 10) || 0 }))
              }
              className="mt-1 w-full rounded-lg border px-3 py-2"
            />
            <span className="mt-1 block text-xs text-slate-400">0 = desativado</span>
          </label>
          <label className="flex items-center gap-2 text-sm sm:items-end sm:pb-6">
            <input
              type="checkbox"
              checked={limpezaForm.automatica}
              onChange={(e) => setLimpezaForm((f) => ({ ...f, automatica: e.target.checked }))}
            />
            Ativar limpeza automática diária
          </label>
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Última limpeza automática:{" "}
          {info.limpeza.ultima
            ? new Date(info.limpeza.ultima).toLocaleString("pt-PT")
            : "nunca"}
        </p>
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm">
            {erro && <span className="text-red-600">{erro}</span>}
            {ok && <span className="text-green-700">{ok}</span>}
          </div>
          <button
            type="submit"
            disabled={a_processar}
            className="rounded-lg bg-portic px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {a_processar ? "A guardar…" : "Guardar política"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Card({ title, value, warn }: { title: string; value: string; warn?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${warn ? "border-amber-300 bg-amber-50" : "bg-white"}`}>
      <p className="text-xs uppercase text-slate-500">{title}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}
