"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { rotuloAcaoAuditoria } from "@/lib/auditoriaRotulos";
import { Card } from "@/components/ui/ui";

type AuditoriaLog = {
  id: string;
  usuarioId?: string | null;
  unidadeId?: string | null;
  acao: string;
  entidade: string;
  entidadeId?: string | null;
  descricao: string;
  metadata?: unknown;
  criadoEm: string;
  usuario?: {
    id: string;
    nome: string;
    email: string;
  } | null;
  unidade?: { id: string; nome: string } | null;
};

type ReservaMetadata = {
  tituloReserva?: string;
  pedidoCriadoEm?: string;
  salas?: string[];
  ocorrencias?: Array<{
    sala?: string;
    dataInicio?: string;
    dataFim?: string;
  }>;
  usuarioCriador?: {
    id?: string;
    nome?: string;
    email?: string;
  };
};

type AuditoriaResponse = {
  logs: AuditoriaLog[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export default function AdminAuditoriaPage() {
  const [logs, setLogs] = useState<AuditoriaLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtroAcao, setFiltroAcao] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [pagina, setPagina] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const opcoesAcao = useMemo(() => {
    const unicas = Array.from(new Set(logs.map((log) => log.acao))).sort((a, b) =>
      rotuloAcaoAuditoria(a).localeCompare(rotuloAcaoAuditoria(b), "pt")
    );
    return unicas;
  }, [logs]);

  const metadataReserva = (metadata: unknown): ReservaMetadata | null => {
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
    return metadata as ReservaMetadata;
  };
  const formatarDataHora = (valor?: string) => {
    if (!valor) return "Não informado";
    const data = new Date(valor);
    if (Number.isNaN(data.getTime())) return "Não informado";
    return new Intl.DateTimeFormat("pt-PT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).format(data);
  };

  const carregarLogs = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filtroAcao) params.set("acao", filtroAcao);
    if (dataInicio) params.set("dataInicio", dataInicio);
    if (dataFim) params.set("dataFim", dataFim);
    params.set("page", String(pagina));
    params.set("pageSize", String(pageSize));

    await apiFetch<AuditoriaResponse>(`/api/admin/auditoria?${params.toString()}`)
      .then((response) => {
        setLogs(response.logs);
        setTotal(response.pagination.total);
        setTotalPaginas(response.pagination.totalPages);
      })
      .catch(() => {
        setLogs([]);
        setTotal(0);
        setTotalPaginas(1);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    carregarLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroAcao, dataInicio, dataFim, pagina, pageSize]);

  return (
    <main className="mx-auto max-w-6xl p-4 md:p-8">
      <h1 className="text-3xl font-bold">Auditoria da unidade</h1>
      <div className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-4">
        <label className="text-sm">
          Ocorrência
          <select
            value={filtroAcao}
            onChange={(event) => {
              setFiltroAcao(event.target.value);
              setPagina(1);
            }}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
          >
            <option value="">Todas</option>
            {opcoesAcao.map((acao) => (
              <option key={acao} value={acao}>
                {rotuloAcaoAuditoria(acao)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Data de início
          <input
            type="date"
            value={dataInicio}
            onChange={(event) => {
              setDataInicio(event.target.value);
              setPagina(1);
            }}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="text-sm">
          Data de fim
          <input
            type="date"
            value={dataFim}
            onChange={(event) => {
              setDataFim(event.target.value);
              setPagina(1);
            }}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <div className="flex items-end">
          <button
            type="button"
            onClick={() => {
              setFiltroAcao("");
              setDataInicio("");
              setDataFim("");
              setPagina(1);
            }}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Limpar filtros
          </button>
        </div>
      </div>

      <div className="mt-3 flex justify-end">
        <label className="text-sm text-slate-700">
          Itens por página
          <select
            value={pageSize}
            onChange={(event) => {
              setPageSize(Number(event.target.value));
              setPagina(1);
            }}
            className="ml-2 rounded-lg border border-slate-300 bg-white px-3 py-2"
          >
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </label>
      </div>

      <div className="mt-4 grid gap-3">
        {loading && <p className="text-sm text-slate-500">A carregar auditoria...</p>}
        {!loading && logs.length === 0 && (
          <Card>
            <p className="text-sm text-slate-600">Nenhum registo encontrado para os filtros aplicados.</p>
          </Card>
        )}
        {logs.map((log) => (
          <Card key={log.id}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">{log.descricao || rotuloAcaoAuditoria(log.acao)}</p>
              <p className="text-xs text-slate-500">{formatarDataHora(log.criadoEm)}</p>
            </div>
            <div className="mt-2 grid gap-1 text-sm text-slate-700">
              <p>
                <span className="font-medium">Utilizador:</span>{" "}
                {log.usuario?.nome ?? "Sistema"}
                {log.usuario?.email ? ` (${log.usuario.email})` : ""}
              </p>
              <p>
                <span className="font-medium">Unidade:</span> {log.unidade?.nome ?? "—"}
              </p>
              <p>
                <span className="font-medium">Entidade:</span> {log.entidade ?? "-"}
              </p>
            </div>
            {log.entidade === "RESERVA" && (() => {
              const metadata = metadataReserva(log.metadata);
              const tituloReserva = metadata?.tituloReserva ?? "Não informado";
              const salas = metadata?.salas?.length ? metadata.salas.join(", ") : "Não informada";
              const criador = metadata?.usuarioCriador?.nome
                ? `${metadata.usuarioCriador.nome}${metadata.usuarioCriador.email ? ` (${metadata.usuarioCriador.email})` : ""}`
                : "Não informado";
              const ocorrencias = metadata?.ocorrencias ?? [];
              const diaReserva = ocorrencias.length
                ? ocorrencias
                    .map((ocorrencia) => formatarDataHora(ocorrencia.dataInicio))
                    .join(" | ")
                : "Não informado";
              const diaReservaFeita = formatarDataHora(metadata?.pedidoCriadoEm);

              return (
                <div className="mt-3 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-slate-700">
                  <p className="font-semibold text-sky-900">Informações da reserva</p>
                  <p className="mt-1">
                    <span className="font-medium">Título da reserva:</span> {tituloReserva}
                  </p>
                  <p>
                    <span className="font-medium">Sala:</span> {salas}
                  </p>
                  <p>
                    <span className="font-medium">Dia(s) da reserva:</span> {diaReserva}
                  </p>
                  <p>
                    <span className="font-medium">Data em que a reserva foi feita:</span> {diaReservaFeita}
                  </p>
                  <p>
                    <span className="font-medium">Utilizador que criou:</span> {criador}
                  </p>
                  <div className="mt-2">
                    <p className="font-medium">Ocorrências da reserva:</p>
                    {ocorrencias.length ? (
                      <ul className="mt-1 list-disc pl-5">
                        {ocorrencias.map((ocorrencia, index) => (
                          <li key={`${ocorrencia.sala ?? "sala"}-${ocorrencia.dataInicio ?? "inicio"}-${index}`}>
                            {ocorrencia.sala ?? "Sala não informada"} -{" "}
                            {formatarDataHora(ocorrencia.dataInicio)} até {formatarDataHora(ocorrencia.dataFim)}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-1">Sem ocorrências registradas.</p>
                    )}
                  </div>
                </div>
              );
            })()}
          </Card>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 text-sm md:flex-row md:items-center md:justify-between">
        <p className="text-slate-600">
          {total > 0
            ? `A mostrar ${(pagina - 1) * pageSize + 1}-${Math.min(pagina * pageSize, total)} de ${total} registos`
            : "Sem registos"}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPagina((prev) => Math.max(1, prev - 1))}
            disabled={pagina <= 1 || loading}
            className="rounded-lg border border-slate-300 px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Anterior
          </button>
          <span className="text-slate-700">
            Página {pagina} de {totalPaginas}
          </span>
          <button
            type="button"
            onClick={() => setPagina((prev) => Math.min(totalPaginas, prev + 1))}
            disabled={pagina >= totalPaginas || loading}
            className="rounded-lg border border-slate-300 px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Próxima
          </button>
        </div>
      </div>
    </main>
  );
}
