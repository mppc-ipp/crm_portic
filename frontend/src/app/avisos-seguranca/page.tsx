"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch, getStoredUser } from "@/lib/api";
import { agruparPorDia } from "@/lib/agrupar";
import ExportCsvButton from "@/components/reports/ExportCsvButton";
import {
  ESTADOS_OCORRENCIA,
  NIVEIS_AVISO,
  estiloTipoOcorrencia,
  formatarDataHoraSeguranca,
  formatarDiaSeguranca,
  fromDatetimeLocal,
  nivelAvisoClasse,
  toDatetimeLocal,
  type AgendaSeguranca,
  type AvisoSeguranca,
  type EstadoOcorrencia,
  type NivelAviso,
  type OcorrenciaSeguranca,
  type TipoOcorrencia,
} from "@/lib/avisos-seguranca";

type Tab = "avisos" | "ocorrencias";

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <button type="button" onClick={onClose} className="text-slate-500 hover:text-slate-800">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function AvisosSegurancaPage() {
  const user = getStoredUser();
  const podeGerirAvisos = Boolean(user?.admin_geral || user?.permissoes?.gerir_avisos);
  const podeGerirOcorrencias = Boolean(user?.admin_geral || user?.permissoes?.gerir_ocorrencias);

  const [tab, setTab] = useState<Tab>("avisos");
  const [agenda, setAgenda] = useState<AgendaSeguranca>({});
  const [avisos, setAvisos] = useState<AvisoSeguranca[]>([]);
  const [ocorrencias, setOcorrencias] = useState<OcorrenciaSeguranca[]>([]);
  const [tiposOcorrencia, setTiposOcorrencia] = useState<TipoOcorrencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [aGuardar, setAGuardar] = useState(false);

  const [modalAviso, setModalAviso] = useState<"criar" | AvisoSeguranca | null>(null);
  const [modalOcorrencia, setModalOcorrencia] = useState<"criar" | OcorrenciaSeguranca | null>(null);

  const [formAviso, setFormAviso] = useState({
    titulo: "",
    conteudo: "",
    nivel: "INFO" as NivelAviso,
    dataInicio: new Date().toISOString().slice(0, 10),
    dataFim: "",
  });
  const [formOcorrencia, setFormOcorrencia] = useState({
    titulo: "",
    descricao: "",
    tipoId: "" as string,
    dataHora: toDatetimeLocal(new Date().toISOString()),
    local: "",
    estado: "ABERTA" as EstadoOcorrencia,
    observacoesResolucao: "",
  });

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro("");
    try {
      const [agendaData, avisosData, ocorrenciasData, tiposData] = await Promise.all([
        apiFetch<AgendaSeguranca>("/api/avisos-seguranca/agenda"),
        apiFetch<AvisoSeguranca[]>("/api/avisos-seguranca/avisos?ativos=0"),
        apiFetch<OcorrenciaSeguranca[]>("/api/avisos-seguranca/ocorrencias"),
        apiFetch<TipoOcorrencia[]>("/api/avisos-seguranca/ocorrencias/tipos?ativos=1"),
      ]);
      setAgenda(agendaData);
      setAvisos(avisosData);
      setOcorrencias(ocorrenciasData);
      setTiposOcorrencia(tiposData);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const diasAgenda = useMemo(() => Object.keys(agenda).sort(), [agenda]);
  const ocorrenciasPorDia = useMemo(() => agruparPorDia(ocorrencias), [ocorrencias]);
  const diasOcorrencias = useMemo(
    () => Object.keys(ocorrenciasPorDia).sort((a, b) => b.localeCompare(a)),
    [ocorrenciasPorDia]
  );

  function abrirCriarAviso() {
    setFormAviso({
      titulo: "",
      conteudo: "",
      nivel: "INFO",
      dataInicio: new Date().toISOString().slice(0, 10),
      dataFim: "",
    });
    setModalAviso("criar");
  }

  function abrirEditarAviso(a: AvisoSeguranca) {
    setFormAviso({
      titulo: a.titulo,
      conteudo: a.conteudo,
      nivel: a.nivel,
      dataInicio: a.dataInicio,
      dataFim: a.dataFim ?? "",
    });
    setModalAviso(a);
  }

  async function guardarAviso(e: FormEvent) {
    e.preventDefault();
    if (!podeGerirAvisos) return;
    setAGuardar(true);
    try {
      const body = {
        titulo: formAviso.titulo.trim(),
        conteudo: formAviso.conteudo.trim(),
        nivel: formAviso.nivel,
        data_inicio: formAviso.dataInicio,
        data_fim: formAviso.dataFim || null,
        ativo: true,
      };
      if (modalAviso === "criar") {
        await apiFetch("/api/avisos-seguranca/avisos", { method: "POST", body: JSON.stringify(body) });
      } else if (modalAviso) {
        await apiFetch(`/api/avisos-seguranca/avisos/${modalAviso.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
      }
      setModalAviso(null);
      await carregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao guardar aviso.");
    } finally {
      setAGuardar(false);
    }
  }

  async function removerAviso(a: AvisoSeguranca) {
    if (!podeGerirAvisos || !window.confirm(`Remover aviso «${a.titulo}»?`)) return;
    try {
      await apiFetch(`/api/avisos-seguranca/avisos/${a.id}`, { method: "DELETE" });
      await carregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao remover aviso.");
    }
  }

  function abrirCriarOcorrencia() {
    setFormOcorrencia({
      titulo: "",
      descricao: "",
      tipoId: tiposOcorrencia[0] ? String(tiposOcorrencia[0].id) : "",
      dataHora: toDatetimeLocal(new Date().toISOString()),
      local: "",
      estado: "ABERTA",
      observacoesResolucao: "",
    });
    setModalOcorrencia("criar");
  }

  function abrirEditarOcorrencia(o: OcorrenciaSeguranca) {
    setFormOcorrencia({
      titulo: o.titulo,
      descricao: o.descricao,
      tipoId: o.tipoId ? String(o.tipoId) : "",
      dataHora: toDatetimeLocal(o.dataHora),
      local: o.local,
      estado: o.estado,
      observacoesResolucao: o.observacoesResolucao,
    });
    setModalOcorrencia(o);
  }

  async function guardarOcorrencia(e: FormEvent) {
    e.preventDefault();
    if (!podeGerirOcorrencias) return;
    setAGuardar(true);
    try {
      const body = {
        titulo: formOcorrencia.titulo.trim(),
        descricao: formOcorrencia.descricao.trim(),
        tipo: formOcorrencia.tipoId ? Number(formOcorrencia.tipoId) : null,
        data_hora: fromDatetimeLocal(formOcorrencia.dataHora),
        local: formOcorrencia.local.trim(),
        estado: formOcorrencia.estado,
        observacoes_resolucao: formOcorrencia.observacoesResolucao.trim(),
      };
      if (modalOcorrencia === "criar") {
        await apiFetch("/api/avisos-seguranca/ocorrencias", { method: "POST", body: JSON.stringify(body) });
      } else if (modalOcorrencia) {
        await apiFetch(`/api/avisos-seguranca/ocorrencias/${modalOcorrencia.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
      }
      setModalOcorrencia(null);
      await carregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao guardar ocorrência.");
    } finally {
      setAGuardar(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Avisos Segurança</h1>
        <p className="text-sm text-slate-500">Avisos, ocorrências e eventos do calendário geral</p>
      </div>

      {erro && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>
      )}

      <section className="mb-8 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Próximos eventos</h2>
        {loading ? (
          <p className="text-sm text-slate-500">A carregar agenda…</p>
        ) : diasAgenda.length === 0 ? (
          <p className="text-sm text-slate-500">Sem eventos agendados.</p>
        ) : (
          <div className="space-y-6">
            {diasAgenda.map((dia) => (
              <div key={dia}>
                <h3 className="mb-2 text-sm font-semibold capitalize text-slate-700">{formatarDiaSeguranca(dia)}</h3>
                <ul className="space-y-2">
                  {agenda[dia].map((ev) => (
                    <li
                      key={ev.id}
                      className="flex flex-wrap items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                    >
                      <span
                        className="mt-1 h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: ev.tipoCor }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-slate-900">{ev.titulo}</p>
                        <p className="text-xs text-slate-500">
                          {formatarDataHoraSeguranca(ev.dataInicio)} – {formatarDataHoraSeguranca(ev.dataFim)}
                        </p>
                        {ev.descricao && <p className="mt-1 text-sm text-slate-600">{ev.descricao}</p>}
                      </div>
                      <span className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-600">{ev.tipo}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="mb-4 flex flex-wrap gap-2 border-b border-slate-200">
        {(
          [
            ["avisos", "Avisos"],
            ["ocorrencias", "Ocorrências"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`border-b-2 px-4 py-2 text-sm font-medium ${
              tab === id
                ? "border-[#1e3a5f] text-[#1e3a5f]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "avisos" && (
        <section>
          <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
            <ExportCsvButton
              apiPath="/api/avisos-seguranca/avisos?ativos=0"
              filename="avisos_seguranca.csv"
            />
            {podeGerirAvisos && (
              <button
                type="button"
                onClick={abrirCriarAviso}
                className="rounded-lg bg-[#1e3a5f] px-4 py-2 text-sm font-medium text-white"
              >
                Novo aviso
              </button>
            )}
          </div>
          <div className="space-y-3">
            {avisos.length === 0 ? (
              <p className="text-sm text-slate-500">Sem avisos registados.</p>
            ) : (
              avisos.map((a) => (
                <article key={a.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${nivelAvisoClasse(a.nivel)}`}>
                      {a.nivelDisplay}
                    </span>
                    {!a.ativo && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">Inactivo</span>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">{a.titulo}</h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{a.conteudo}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    Vigência: {a.dataInicio}
                    {a.dataFim ? ` – ${a.dataFim}` : " (sem fim)"}
                    {a.criadoPorNome ? ` · ${a.criadoPorNome}` : ""}
                  </p>
                  {podeGerirAvisos && (
                    <div className="mt-3 flex gap-3">
                      <button type="button" onClick={() => abrirEditarAviso(a)} className="text-sm text-[#1e3a5f] hover:underline">
                        Editar
                      </button>
                      <button type="button" onClick={() => void removerAviso(a)} className="text-sm text-red-600 hover:underline">
                        Remover
                      </button>
                    </div>
                  )}
                </article>
              ))
            )}
          </div>
        </section>
      )}

      {tab === "ocorrencias" && (
        <section>
          <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
            <ExportCsvButton
              apiPath="/api/avisos-seguranca/ocorrencias"
              filename="ocorrencias_seguranca.csv"
            />
            {podeGerirOcorrencias && (
              <button
                type="button"
                onClick={abrirCriarOcorrencia}
                className="rounded-lg bg-[#1e3a5f] px-4 py-2 text-sm font-medium text-white"
              >
                Registar ocorrência
              </button>
            )}
          </div>
          {diasOcorrencias.length === 0 ? (
            <p className="text-sm text-slate-500">Sem ocorrências registadas.</p>
          ) : (
            <div className="space-y-8">
              {diasOcorrencias.map((dia) => (
                <section key={dia}>
                  <h3 className="mb-3 text-sm font-semibold capitalize text-slate-700">{formatarDiaSeguranca(dia)}</h3>
                  <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                    <table className="min-w-full text-left text-sm">
                      <thead className="border-b bg-slate-50 text-slate-600">
                        <tr>
                          <th className="px-4 py-3">Hora</th>
                          <th className="px-4 py-3">Título</th>
                          <th className="px-4 py-3">Tipo</th>
                          <th className="px-4 py-3">Local</th>
                          <th className="px-4 py-3">Estado</th>
                          <th className="px-4 py-3">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ocorrenciasPorDia[dia].map((o) => (
                          <tr key={o.id} className="border-b last:border-0">
                            <td className="px-4 py-3 text-slate-600">{formatarDataHoraSeguranca(o.dataHora)}</td>
                            <td className="px-4 py-3">
                              <p className="font-medium text-slate-900">{o.titulo}</p>
                              <p className="text-xs text-slate-500 line-clamp-2">{o.descricao}</p>
                            </td>
                            <td className="px-4 py-3">
                              {o.tipo ? (
                                <span
                                  className="rounded-full border px-2 py-0.5 text-xs font-medium"
                                  style={estiloTipoOcorrencia(o.tipoCor)}
                                >
                                  {o.tipo}
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-slate-600">{o.local || "—"}</td>
                            <td className="px-4 py-3">
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{o.estadoDisplay}</span>
                            </td>
                            <td className="px-4 py-3">
                              {podeGerirOcorrencias && (
                                <button
                                  type="button"
                                  onClick={() => abrirEditarOcorrencia(o)}
                                  className="text-sm text-[#1e3a5f] hover:underline"
                                >
                                  Editar
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ))}
            </div>
          )}
        </section>
      )}

      {modalAviso && (
        <Modal title={modalAviso === "criar" ? "Novo aviso" : "Editar aviso"} onClose={() => setModalAviso(null)}>
          <form onSubmit={guardarAviso} className="space-y-3">
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Título</span>
              <input
                required
                value={formAviso.titulo}
                onChange={(e) => setFormAviso((f) => ({ ...f, titulo: e.target.value }))}
                className="w-full rounded-lg border px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Conteúdo</span>
              <textarea
                required
                rows={4}
                value={formAviso.conteudo}
                onChange={(e) => setFormAviso((f) => ({ ...f, conteudo: e.target.value }))}
                className="w-full rounded-lg border px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Nível</span>
              <select
                value={formAviso.nivel}
                onChange={(e) => setFormAviso((f) => ({ ...f, nivel: e.target.value as NivelAviso }))}
                className="w-full rounded-lg border px-3 py-2"
              >
                {NIVEIS_AVISO.map((n) => (
                  <option key={n.value} value={n.value}>
                    {n.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">Início</span>
                <input
                  type="date"
                  required
                  value={formAviso.dataInicio}
                  onChange={(e) => setFormAviso((f) => ({ ...f, dataInicio: e.target.value }))}
                  className="w-full rounded-lg border px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">Fim (opcional)</span>
                <input
                  type="date"
                  value={formAviso.dataFim}
                  onChange={(e) => setFormAviso((f) => ({ ...f, dataFim: e.target.value }))}
                  className="w-full rounded-lg border px-3 py-2"
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={aGuardar}
              className="w-full rounded-lg bg-[#1e3a5f] py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Guardar
            </button>
          </form>
        </Modal>
      )}

      {modalOcorrencia && (
        <Modal
          title={modalOcorrencia === "criar" ? "Registar ocorrência" : "Editar ocorrência"}
          onClose={() => setModalOcorrencia(null)}
        >
          <form onSubmit={guardarOcorrencia} className="space-y-3">
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Título</span>
              <input
                required
                value={formOcorrencia.titulo}
                onChange={(e) => setFormOcorrencia((f) => ({ ...f, titulo: e.target.value }))}
                className="w-full rounded-lg border px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Descrição</span>
              <textarea
                required
                rows={3}
                value={formOcorrencia.descricao}
                onChange={(e) => setFormOcorrencia((f) => ({ ...f, descricao: e.target.value }))}
                className="w-full rounded-lg border px-3 py-2"
              />
            </label>
            {tiposOcorrencia.length > 0 && (
              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">Tipo</span>
                <select
                  value={formOcorrencia.tipoId}
                  onChange={(e) => setFormOcorrencia((f) => ({ ...f, tipoId: e.target.value }))}
                  className="w-full rounded-lg border px-3 py-2"
                >
                  <option value="">Sem tipo</option>
                  {tiposOcorrencia.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nome}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Data e hora</span>
              <input
                type="datetime-local"
                required
                value={formOcorrencia.dataHora}
                onChange={(e) => setFormOcorrencia((f) => ({ ...f, dataHora: e.target.value }))}
                className="w-full rounded-lg border px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Local</span>
              <input
                value={formOcorrencia.local}
                onChange={(e) => setFormOcorrencia((f) => ({ ...f, local: e.target.value }))}
                className="w-full rounded-lg border px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Estado</span>
              <select
                value={formOcorrencia.estado}
                onChange={(e) =>
                  setFormOcorrencia((f) => ({ ...f, estado: e.target.value as EstadoOcorrencia }))
                }
                className="w-full rounded-lg border px-3 py-2"
              >
                {ESTADOS_OCORRENCIA.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Observações de resolução</span>
              <textarea
                rows={2}
                value={formOcorrencia.observacoesResolucao}
                onChange={(e) => setFormOcorrencia((f) => ({ ...f, observacoesResolucao: e.target.value }))}
                className="w-full rounded-lg border px-3 py-2"
              />
            </label>
            <button
              type="submit"
              disabled={aGuardar}
              className="w-full rounded-lg bg-[#1e3a5f] py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Guardar
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
