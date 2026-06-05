"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ActivityFeed from "@/components/projetos/ActivityFeed";
import BoardView from "@/components/projetos/BoardView";
import CalendarView from "@/components/projetos/CalendarView";
import CreateProjectModal, { type NovoProjetoData } from "@/components/projetos/CreateProjectModal";
import ProjectSettingsModal, { type ProjetoSettingsData } from "@/components/projetos/ProjectSettingsModal";
import CreateSectionModal from "@/components/projetos/CreateSectionModal";
import CreateTaskModal, { type NovaTarefaData } from "@/components/projetos/CreateTaskModal";
import CustomFieldsManager from "@/components/projetos/CustomFieldsManager";
import EmptySectionsState from "@/components/projetos/EmptySectionsState";
import ProjectThemeWrapper from "@/components/projetos/ProjectThemeWrapper";
import { KANBAN_SECOES, T, VISTAS } from "@/components/projetos/constants";
import { normalizarCor } from "@/components/projetos/projectTheme";
import ListView from "@/components/projetos/ListView";
import SavedViewsBar from "@/components/projetos/SavedViewsBar";
import TaskDetailPanel from "@/components/projetos/TaskDetailPanel";
import TimelineView from "@/components/projetos/TimelineView";
import type { Objetivo, Projeto, TimelineData, VistaGuardada, VistaProjeto } from "@/components/projetos/types";
import { atribuiveisDoProjeto, objetivoCorrespondeAtribuicao } from "@/components/projetos/utils";
import { apiFetch } from "@/lib/api";

export default function ProjetosPage() {
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [ativo, setAtivo] = useState<Projeto | null>(null);
  const [vista, setVista] = useState<VistaProjeto>("lista");
  const [tarefaSelId, setTarefaSelId] = useState<number | null>(null);
  const [timeline, setTimeline] = useState<TimelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroResp, setFiltroResp] = useState("");
  const [aMostrarNovoProjeto, setAMostrarNovoProjeto] = useState(false);
  const [aMostrarDefinicoes, setAMostrarDefinicoes] = useState(false);
  const [aMostrarNovaSecao, setAMostrarNovaSecao] = useState(false);
  const [secaoNovaTarefa, setSecaoNovaTarefa] = useState<number | null>(null);
  const [erroGeral, setErroGeral] = useState("");

  const carregar = useCallback(async () => {
    const data = await apiFetch<Projeto[]>("/api/projetos");
    const lista = Array.isArray(data) ? data : [];
    setProjetos(lista);
    setAtivo((prev) => {
      if (prev) return lista.find((p) => p.id === prev.id) ?? lista[0] ?? null;
      const comPadrao = lista.find((p) => p.vistas_guardadas?.some((v) => v.padrao));
      if (comPadrao) {
        const vp = comPadrao.vistas_guardadas?.find((v) => v.padrao);
        if (vp) {
          setVista(vp.tipo_vista);
          setFiltroEstado(vp.filtros?.estado ?? "");
          setFiltroResp(vp.filtros?.responsavel ?? "");
        }
        return comPadrao;
      }
      return lista[0] ?? null;
    });
    return lista;
  }, []);

  const carregarTimeline = useCallback(async (projetoId: number) => {
    const data = await apiFetch<TimelineData>(`/api/projetos/${projetoId}/timeline`);
    setTimeline(data);
  }, []);

  useEffect(() => {
    carregar().catch(console.error).finally(() => setLoading(false));
  }, [carregar]);

  useEffect(() => {
    if (ativo && vista === "timeline") void carregarTimeline(ativo.id);
  }, [ativo, vista, carregarTimeline]);

  const secoesFiltradas = useMemo(() => {
    if (!ativo) return [];
    return ativo.secoes.map((s) => ({
      ...s,
      objetivos: s.objetivos.filter((o) => {
        if (filtroEstado && o.estado !== filtroEstado) return false;
        if (filtroResp && !objetivoCorrespondeAtribuicao(o, filtroResp)) return false;
        return true;
      }),
    }));
  }, [ativo, filtroEstado, filtroResp]);

  const secoesOrdenadas = useMemo(
    () => [...(ativo?.secoes ?? [])].sort((a, b) => a.ordem - b.ordem),
    [ativo]
  );

  const todasTarefas = useMemo(
    () => (ativo?.secoes.flatMap((s) => s.objetivos.map((o) => ({ id: o.id, titulo: o.titulo }))) ?? []),
    [ativo]
  );

  const atribuiveis = useMemo(() => atribuiveisDoProjeto(ativo), [ativo]);

  async function criarProjeto(data: NovoProjetoData) {
    setErroGeral("");
    const criado = await apiFetch<Projeto>("/api/projetos", {
      method: "POST",
      body: JSON.stringify({
        nome: data.nome,
        resumo: "",
        estado: "ATIVO",
        template_secoes: data.templateSecoes,
        cor: data.cor,
        membros_emails: data.membrosEmails,
      }),
    });
    const lista = await carregar();
    setAtivo(lista.find((p) => p.id === criado.id) ?? criado);
    setAMostrarNovoProjeto(false);
  }

  async function criarSecao(nome: string) {
    if (!ativo) return;
    setErroGeral("");
    await apiFetch("/api/projetos/secoes", {
      method: "POST",
      body: JSON.stringify({ nome, projeto: ativo.id, ordem: ativo.secoes.length }),
    });
    await carregar();
  }

  async function aplicarTemplateKanban() {
    if (!ativo) return;
    setErroGeral("");
    for (const [i, nome] of KANBAN_SECOES.entries()) {
      await apiFetch("/api/projetos/secoes", {
        method: "POST",
        body: JSON.stringify({ nome, projeto: ativo.id, ordem: i }),
      });
    }
    await carregar();
  }

  async function renomearSecao(id: number, nome: string) {
    setErroGeral("");
    await apiFetch(`/api/projetos/secoes/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ nome }),
    });
    await carregar();
  }

  async function apagarSecao(id: number) {
    setErroGeral("");
    try {
      await apiFetch(`/api/projetos/secoes/${id}`, { method: "DELETE" });
      await carregar();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao apagar secção";
      setErroGeral(msg);
      throw e;
    }
  }

  async function reordenarSecao(id: number, direcao: "esquerda" | "direita") {
    if (!ativo) return;
    const sorted = [...ativo.secoes].sort((a, b) => a.ordem - b.ordem);
    const idx = sorted.findIndex((s) => s.id === id);
    const swapIdx = direcao === "esquerda" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const a = sorted[idx];
    const b = sorted[swapIdx];
    await Promise.all([
      apiFetch(`/api/projetos/secoes/${a.id}`, { method: "PATCH", body: JSON.stringify({ ordem: b.ordem }) }),
      apiFetch(`/api/projetos/secoes/${b.id}`, { method: "PATCH", body: JSON.stringify({ ordem: a.ordem }) }),
    ]);
    await carregar();
  }

  function abrirModalNovaTarefa(secaoId: number) {
    setSecaoNovaTarefa(secaoId);
  }

  async function criarTarefa(secaoId: number, data: NovaTarefaData) {
    const secao = ativo?.secoes.find((s) => s.id === secaoId);
    const ordem = secao?.objetivos.length ?? 0;
    await apiFetch("/api/projetos/objetivos", {
      method: "POST",
      body: JSON.stringify({
        secao: secaoId,
        titulo: data.titulo,
        descricao: data.descricao,
        data_limite: data.data_limite,
        responsavel: data.responsavel,
        responsavel_email: data.responsavel_email ?? "",
        estado: "PENDENTE",
        ordem,
      }),
    });
    await carregar();
    if (ativo && vista === "timeline") await carregarTimeline(ativo.id);
  }

  const secaoParaNovaTarefa = secaoNovaTarefa
    ? ativo?.secoes.find((s) => s.id === secaoNovaTarefa)
    : null;

  async function atualizarTarefa(id: number, patch: Partial<Objetivo>) {
    await apiFetch(`/api/projetos/objetivos/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
    await carregar();
    if (ativo && vista === "timeline") await carregarTimeline(ativo.id);
  }

  async function eliminarTarefa(id: number) {
    await apiFetch(`/api/projetos/objetivos/${id}`, { method: "DELETE" });
    setTarefaSelId(null);
    await carregar();
  }

  async function toggleComplete(obj: Objetivo) {
    await atualizarTarefa(obj.id, { estado: obj.estado === "CONCLUIDO" ? "PENDENTE" : "CONCLUIDO" });
  }

  async function moverTarefa(obj: Objetivo, secaoId: number) {
    await apiFetch(`/api/projetos/objetivos/${obj.id}`, {
      method: "PATCH",
      body: JSON.stringify({ secao: secaoId }),
    });
    await carregar();
  }

  async function guardarVista(nome: string) {
    if (!ativo) return;
    await apiFetch(`/api/projetos/${ativo.id}/vistas`, {
      method: "POST",
      body: JSON.stringify({
        nome,
        tipo_vista: vista,
        filtros: { estado: filtroEstado, responsavel: filtroResp },
        padrao: false,
      }),
    });
    await carregar();
  }

  async function apagarVista(id: number) {
    await apiFetch(`/api/projetos/vistas/${id}`, { method: "DELETE" });
    await carregar();
  }

  function aplicarVista(v: VistaGuardada) {
    setVista(v.tipo_vista);
    setFiltroEstado(v.filtros?.estado ?? "");
    setFiltroResp(v.filtros?.responsavel ?? "");
  }

  async function addCampo(nome: string, tipo: string) {
    if (!ativo) return;
    await apiFetch(`/api/projetos/${ativo.id}/campos`, {
      method: "POST",
      body: JSON.stringify({ nome, tipo, opcoes: [], ordem: ativo.campos_personalizados?.length ?? 0 }),
    });
    await carregar();
  }

  async function deleteCampo(id: number) {
    await apiFetch(`/api/projetos/campos/${id}`, { method: "DELETE" });
    await carregar();
  }

  async function guardarDefinicoes(data: ProjetoSettingsData) {
    if (!ativo) return;
    setErroGeral("");
    await apiFetch(`/api/projetos/${ativo.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        nome: data.nome,
        cor: data.cor,
        membros_emails: data.membrosEmails,
      }),
    });
    await carregar();
  }

  const abrirModalNovaSecao = () => setAMostrarNovaSecao(true);
  const propsSecao = {
    onAddSection: abrirModalNovaSecao,
    onRenameSection: renomearSecao,
    onDeleteSection: apagarSecao,
    onMoveSection: (id: number, d: "esquerda" | "direita") => void reordenarSecao(id, d),
  };

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center text-slate-500">A carregar projetos…</div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-120px)] min-h-[600px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <aside className="flex w-56 shrink-0 flex-col border-r border-slate-200 bg-[#FAFAFA]">
        <div className="border-b border-slate-200 px-4 py-3">
          <h1 className="text-sm font-bold uppercase tracking-wide text-slate-500">Projetos</h1>
        </div>
        <nav className="flex-1 overflow-y-auto p-2">
          {projetos.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setAtivo(p);
                setTarefaSelId(null);
                setErroGeral("");
              }}
              className={`mb-0.5 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
                ativo?.id === p.id ? `bg-white shadow-sm ${T.textActive}` : "text-slate-700 hover:bg-white/80"
              }`}
            >
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${ativo?.id === p.id ? "ring-2 ring-offset-1 ring-slate-300" : ""}`}
                style={{ backgroundColor: normalizarCor(p.cor) }}
              />
              <span className="truncate">{p.nome}</span>
            </button>
          ))}
        </nav>
        <div className="border-t border-slate-200 p-2">
          <button type="button" onClick={() => setAMostrarNovoProjeto(true)} className={`w-full px-3 py-2 text-left ${T.btnGhost}`}>
            + Novo projeto
          </button>
        </div>
      </aside>

      <ProjectThemeWrapper cor={ativo?.cor} className="flex min-w-0 flex-1 flex-col">
        {ativo ? (
          <>
            <header className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{ativo.nome}</h2>
                {ativo.resumo && <p className="mt-1 text-sm text-slate-500">{ativo.resumo}</p>}
              </div>
              <div className="flex items-center gap-2">
                <ActivityFeed projetoId={ativo.id} />
                <CustomFieldsManager
                  campos={ativo.campos_personalizados ?? []}
                  onAdd={addCampo}
                  onDelete={deleteCampo}
                />
              </div>
            </header>

            {erroGeral && (
              <div className="border-b border-red-100 bg-red-50 px-6 py-2 text-sm text-red-700">{erroGeral}</div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6">
              <div className="flex items-center gap-1">
                {VISTAS.map((v) => (
                  <span key={v.id} className="flex items-center">
                    <button
                      type="button"
                      onClick={() => setVista(v.id)}
                      className={`flex items-center gap-1.5 border-b-2 px-4 py-3 text-sm font-medium transition ${
                        vista === v.id ? T.tabActive : "border-transparent text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <span>{v.icon}</span>
                      {v.label}
                    </button>
                    {v.id === "timeline" && (
                      <button
                        type="button"
                        onClick={() => setAMostrarDefinicoes(true)}
                        className="ml-1 flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                        title="Definições do projeto"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                          <path
                            fillRule="evenodd"
                            d="M8.34 1.804A1 1 0 0 1 9.32 1h1.36a1 1 0 0 1 .98.804l.295 1.473c.497.144.97.337 1.412.575l1.325-1.054a1 1 0 0 1 1.27.125l.962.962a1 1 0 0 1 .125 1.27l-1.054 1.325c.238.442.431.915.575 1.412l1.473.295a1 1 0 0 1 .804.98V9.32a1 1 0 0 1-.804.98l-1.473.295a6.071 6.071 0 0 1-.575 1.412l1.054 1.325a1 1 0 0 1-.125 1.27l-.962.962a1 1 0 0 1-1.27.125l-1.325-1.054a6.071 6.071 0 0 1-1.412.575l-.295 1.473a1 1 0 0 1-.98.804H9.32a1 1 0 0 1-.98-.804l-.295-1.473a6.071 6.071 0 0 1-1.412-.575l-1.325 1.054a1 1 0 0 1-1.27-.125l-.962-.962a1 1 0 0 1-.125-1.27l1.054-1.325a6.071 6.071 0 0 1-.575-1.412l-1.473-.295A1 1 0 0 1 1 9.32V8.34a1 1 0 0 1 .804-.98l1.473-.295c.144-.497.337-.97.575-1.412L2.798 4.238a1 1 0 0 1 .125-1.27l.962-.962a1 1 0 0 1 1.27-.125l1.325 1.054c.442-.238.915-.431 1.412-.575l.295-1.473ZM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    )}
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2 py-2">
                <select
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value)}
                  className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600"
                >
                  <option value="">Todos os estados</option>
                  <option value="PENDENTE">Pendente</option>
                  <option value="EM_PROGRESSO">Em progresso</option>
                  <option value="CONCLUIDO">Concluído</option>
                  <option value="BLOQUEADO">Bloqueado</option>
                </select>
                <select
                  value={filtroResp}
                  onChange={(e) => setFiltroResp(e.target.value)}
                  className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600"
                >
                  <option value="">Todos os atribuídos</option>
                  {atribuiveis.map((a) => (
                    <option key={a.key} value={a.key}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <SavedViewsBar
              vistas={ativo.vistas_guardadas ?? []}
              vistaAtual={vista}
              filtros={{ estado: filtroEstado, responsavel: filtroResp }}
              onApply={aplicarVista}
              onSave={guardarVista}
              onDelete={apagarVista}
            />

            <div className="flex flex-1 flex-col overflow-hidden">
              {secoesOrdenadas.length === 0 ? (
                <EmptySectionsState
                  onCreateSection={() => setAMostrarNovaSecao(true)}
                  onApplyKanban={aplicarTemplateKanban}
                />
              ) : (
                <>
                  {vista === "lista" && (
                    <ListView
                      secoes={secoesFiltradas}
                      onSelect={(o) => setTarefaSelId(o.id)}
                      onToggleComplete={(o) => void toggleComplete(o)}
                      onAddTask={abrirModalNovaTarefa}
                      {...propsSecao}
                    />
                  )}
                  {vista === "quadro" && (
                    <div className="flex-1 overflow-auto p-4">
                      <BoardView
                        secoes={secoesFiltradas}
                        onSelect={(o) => setTarefaSelId(o.id)}
                        onMove={moverTarefa}
                    onAddTask={abrirModalNovaTarefa}
                    {...propsSecao}
                  />
                </div>
              )}
                  {vista === "calendario" && (
                    <CalendarView secoes={secoesFiltradas} onSelect={(o) => setTarefaSelId(o.id)} />
                  )}
                  {vista === "timeline" && timeline && (
                    <TimelineView
                      data={timeline}
                      onSelect={setTarefaSelId}
                      onUpdateDates={(id, di, df) => atualizarTarefa(id, { data_inicio: di, data_limite: df })}
                    />
                  )}
                </>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center text-slate-500">
            <p className="text-lg font-medium">Nenhum projeto</p>
            <button type="button" onClick={() => setAMostrarNovoProjeto(true)} className={`mt-4 ${T.btnPrimary}`}>
              + Novo projeto
            </button>
          </div>
        )}
      </ProjectThemeWrapper>

      {tarefaSelId && ativo && (
        <ProjectThemeWrapper cor={ativo.cor} inline>
        <TaskDetailPanel
          tarefaId={tarefaSelId}
          atribuiveis={atribuiveis}
          campos={ativo.campos_personalizados ?? []}
          todasTarefas={todasTarefas}
          onClose={() => setTarefaSelId(null)}
          onSave={(patch) => atualizarTarefa(tarefaSelId, patch)}
          onDelete={() => eliminarTarefa(tarefaSelId)}
          onRefresh={async () => {
            await carregar();
          }}
        />
        </ProjectThemeWrapper>
      )}

      {secaoNovaTarefa && secaoParaNovaTarefa && (
        <ProjectThemeWrapper cor={ativo?.cor}>
        <CreateTaskModal
          secaoNome={secaoParaNovaTarefa.nome}
          atribuiveis={atribuiveis}
          onClose={() => setSecaoNovaTarefa(null)}
          onCreate={(data) => criarTarefa(secaoNovaTarefa, data)}
        />
        </ProjectThemeWrapper>
      )}

      {aMostrarNovaSecao && (
        <ProjectThemeWrapper cor={ativo?.cor} inline>
          <CreateSectionModal onClose={() => setAMostrarNovaSecao(false)} onCreate={criarSecao} />
        </ProjectThemeWrapper>
      )}

      {aMostrarNovoProjeto && (
        <CreateProjectModal onClose={() => setAMostrarNovoProjeto(false)} onCreate={criarProjeto} />
      )}

      {aMostrarDefinicoes && ativo && (
        <ProjectThemeWrapper cor={ativo.cor}>
          <ProjectSettingsModal
            nomeInicial={ativo.nome}
            corInicial={ativo.cor ?? "#1e3a5f"}
            membros={ativo.membros ?? []}
            onClose={() => setAMostrarDefinicoes(false)}
            onSave={guardarDefinicoes}
          />
        </ProjectThemeWrapper>
      )}
    </div>
  );
}
