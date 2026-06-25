"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import Avatar from "./Avatar";
import { ESTADOS_OBJ } from "./constants";
import EmpresaPicker from "./EmpresaPicker";
import type { Atribuivel, CampoPersonalizado, Objetivo } from "./types";
import { atribuicaoKeyFromObjetivo, formatarData, formatarTamanho, parseAtribuicaoKey } from "./utils";

type Props = {
  tarefaId: number;
  atribuiveis: Atribuivel[];
  campos: CampoPersonalizado[];
  todasTarefas: Array<{ id: number; titulo: string }>;
  onClose: () => void;
  onSave: (patch: Partial<Objetivo>) => Promise<void>;
  onDelete: () => Promise<void>;
  onRefresh: () => Promise<void>;
};

export default function TaskDetailPanel({
  tarefaId,
  atribuiveis,
  campos,
  todasTarefas,
  onClose,
  onSave,
  onDelete,
  onRefresh,
}: Props) {
  const [tarefa, setTarefa] = useState<Objetivo | null>(null);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [estado, setEstado] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataLimite, setDataLimite] = useState("");
  const [atribuicao, setAtribuicao] = useState("");
  const [empresaId, setEmpresaId] = useState<number | null>(null);
  const [empresaNome, setEmpresaNome] = useState<string | null>(null);
  const [urgente, setUrgente] = useState(false);
  const [novaSubtarefa, setNovaSubtarefa] = useState("");
  const [novoComentario, setNovoComentario] = useState("");
  const [novaDep, setNovaDep] = useState<number | "">("");
  const [aGuardar, setAGuardar] = useState(false);
  const [aEnviarAnexo, setAEnviarAnexo] = useState(false);
  const [erroAnexo, setErroAnexo] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const carregar = useCallback(async () => {
    const data = await apiFetch<Objetivo>(`/api/projetos/objetivos/${tarefaId}/detalhe`);
    setTarefa(data);
    setTitulo(data.titulo);
    setDescricao(data.descricao);
    setEstado(data.estado);
    setDataInicio(data.data_inicio ?? "");
    setDataLimite(data.data_limite ?? "");
    setAtribuicao(atribuicaoKeyFromObjetivo(data));
    setEmpresaId(data.empresa ?? null);
    setEmpresaNome(data.empresa_nome ?? null);
    setUrgente(data.urgente ?? false);
  }, [tarefaId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function guardar() {
    setAGuardar(true);
    try {
      const { responsavel, responsavel_email } = parseAtribuicaoKey(atribuicao);
      await onSave({
        titulo,
        descricao,
        estado,
        data_inicio: dataInicio || null,
        data_limite: dataLimite || null,
        responsavel,
        responsavel_email,
        empresa: empresaId,
        urgente,
      });
      onClose();
    } finally {
      setAGuardar(false);
    }
  }

  async function addSubtarefa() {
    if (!novaSubtarefa.trim()) return;
    await apiFetch(`/api/projetos/objetivos/${tarefaId}/subtarefas`, {
      method: "POST",
      body: JSON.stringify({ titulo: novaSubtarefa.trim(), ordem: tarefa?.subtarefas?.length ?? 0 }),
    });
    setNovaSubtarefa("");
    await carregar();
    await onRefresh();
  }

  async function toggleSub(id: number, concluida: boolean) {
    await apiFetch(`/api/projetos/subtarefas/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ concluida: !concluida }),
    });
    await carregar();
    await onRefresh();
  }

  async function addComentario() {
    if (!novoComentario.trim()) return;
    await apiFetch(`/api/projetos/objetivos/${tarefaId}/comentarios`, {
      method: "POST",
      body: JSON.stringify({ texto: novoComentario.trim() }),
    });
    setNovoComentario("");
    await carregar();
  }

  async function addDependencia() {
    if (!novaDep) return;
    await apiFetch(`/api/projetos/objetivos/${tarefaId}/dependencias`, {
      method: "POST",
      body: JSON.stringify({ predecessora: novaDep, sucessora: tarefaId }),
    });
    setNovaDep("");
    await carregar();
    await onRefresh();
  }

  async function removeDep(id: number) {
    await apiFetch(`/api/projetos/dependencias/${id}`, { method: "DELETE" });
    await carregar();
    await onRefresh();
  }

  async function uploadAnexo(file: File) {
    setErroAnexo("");
    setAEnviarAnexo(true);
    try {
      const fd = new FormData();
      fd.append("ficheiro", file);
      await apiFetch(`/api/projetos/objetivos/${tarefaId}/anexos`, {
        method: "POST",
        body: fd,
      });
      await carregar();
      await onRefresh();
    } catch (e) {
      setErroAnexo(e instanceof Error ? e.message : "Falha ao carregar o ficheiro.");
    } finally {
      setAEnviarAnexo(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function removeAnexo(id: number) {
    await apiFetch(`/api/projetos/anexos/${id}`, { method: "DELETE" });
    await carregar();
    await onRefresh();
  }

  async function setValorCampo(campoId: number, valor: string) {
    const campo = campos.find((c) => c.id === campoId);
    if (!campo) return;
    const body: Record<string, unknown> = { campo: campoId };
    if (campo.tipo === "NUMERO") body.valor_numero = valor ? Number(valor) : null;
    else if (campo.tipo === "DATA") body.valor_data = valor || null;
    else body.valor_texto = valor;
    await apiFetch(`/api/projetos/objetivos/${tarefaId}/valores-campos`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    await carregar();
  }

  if (!tarefa) {
    return (
      <div className="fixed inset-0 z-50 flex justify-end bg-black/20">
        <div className="flex h-full w-full max-w-lg items-center justify-center bg-white">
          <p className="text-slate-500">A carregar…</p>
        </div>
      </div>
    );
  }

  const respNome =
    atribuiveis.find((a) => a.key === atribuicao)?.label ?? tarefa.responsavel_nome;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/20" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-lg flex-col bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-5 py-3">
          <button type="button" onClick={onClose} className="text-sm text-slate-500 hover:text-slate-800">
            ✕ Fechar
          </button>
          <div className="flex gap-2">
            <button type="button" onClick={() => void onDelete()} className="text-sm text-rose-600 hover:underline">
              Eliminar
            </button>
            <button
              type="button"
              disabled={aGuardar}
              onClick={() => void guardar()}
              className="rounded-lg bg-proj px-4 py-1.5 text-sm font-semibold text-white hover:bg-proj-hover disabled:opacity-50"
            >
              {aGuardar ? "A guardar…" : "Guardar"}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => setEstado(estado === "CONCLUIDO" ? "PENDENTE" : "CONCLUIDO")}
              className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                estado === "CONCLUIDO" ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300"
              }`}
            >
              {estado === "CONCLUIDO" && "✓"}
            </button>
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="flex-1 text-xl font-semibold text-slate-900 outline-none"
            />
          </div>

          <div className="mt-6 grid gap-3 text-sm">
            <div className="grid grid-cols-[100px_1fr] items-center gap-2">
              <span className="text-slate-500">Atribuído a</span>
              <div className="flex items-center gap-2">
                <Avatar nome={respNome} tamanho="md" />
                <select
                  value={atribuicao}
                  onChange={(e) => setAtribuicao(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                >
                  <option value="">Ninguém</option>
                  {atribuiveis.map((a) => (
                    <option key={a.key} value={a.key}>{a.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-[100px_1fr] items-center gap-2">
              <span className="text-slate-500">Início</span>
              <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="rounded-lg border border-slate-200 px-2 py-1.5" />
            </div>
            <div className="grid grid-cols-[100px_1fr] items-center gap-2">
              <span className="text-slate-500">Data limite</span>
              <input type="date" value={dataLimite} onChange={(e) => setDataLimite(e.target.value)} className="rounded-lg border border-slate-200 px-2 py-1.5" />
            </div>
            <div className="grid grid-cols-[100px_1fr] items-center gap-2">
              <span className="text-slate-500">Empresa</span>
              <EmpresaPicker
                value={empresaId}
                label={empresaNome}
                onChange={(id, nome) => {
                  setEmpresaId(id);
                  setEmpresaNome(nome);
                }}
                inputClassName="rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-proj w-full"
              />
            </div>
            <div className="grid grid-cols-[100px_1fr] items-center gap-2">
              <span className="text-slate-500">Estado</span>
              <select value={estado} onChange={(e) => setEstado(e.target.value)} className="rounded-lg border border-slate-200 px-2 py-1.5">
                {ESTADOS_OBJ.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-[100px_1fr] items-center gap-2">
              <span className="text-slate-500">Prioridade</span>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={urgente}
                  onChange={(e) => setUrgente(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
                />
                <span className="text-sm text-slate-700">Urgente</span>
              </label>
            </div>
          </div>

          {/* Subtarefas */}
          <div className="mt-6">
            <h4 className="mb-2 text-sm font-semibold text-slate-700">
              Subtarefas
              {tarefa.subtarefas?.length ? (
                <span className="ml-2 text-xs font-normal text-slate-400">
                  {tarefa.subtarefas.filter((s) => s.concluida).length}/{tarefa.subtarefas.length}
                </span>
              ) : null}
            </h4>
            <div className="space-y-1">
              {tarefa.subtarefas?.map((s) => (
                <label key={s.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={s.concluida} onChange={() => void toggleSub(s.id, s.concluida)} />
                  <span className={s.concluida ? "text-slate-400 line-through" : "text-slate-700"}>{s.titulo}</span>
                </label>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <input
                value={novaSubtarefa}
                onChange={(e) => setNovaSubtarefa(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void addSubtarefa()}
                placeholder="Adicionar subtarefa"
                className="flex-1 rounded border border-slate-200 px-2 py-1 text-sm"
              />
            </div>
          </div>

          {/* Dependências */}
          <div className="mt-6">
            <h4 className="mb-2 text-sm font-semibold text-slate-700">Dependências</h4>
            <p className="mb-2 text-xs text-slate-400">Esta tarefa depende de:</p>
            <ul className="space-y-1">
              {tarefa.dependencias_entrada?.length ? (
                tarefa.dependencias_entrada.map((d) => (
                  <li key={d.id} className="flex items-center justify-between text-sm text-slate-600">
                    <span className="rounded bg-amber-50 px-2 py-0.5 text-amber-800">← {d.predecessora_titulo}</span>
                    <button type="button" onClick={() => void removeDep(d.id)} className="text-xs text-rose-500">✕</button>
                  </li>
                ))
              ) : (
                <li className="text-xs text-slate-400">Nenhuma dependência.</li>
              )}
            </ul>
            <div className="mt-2 flex gap-2">
              <select
                value={novaDep}
                onChange={(e) => setNovaDep(e.target.value ? Number(e.target.value) : "")}
                className="flex-1 rounded border border-slate-200 px-2 py-1 text-sm"
              >
                <option value="">Depende de…</option>
                {todasTarefas.filter((t) => t.id !== tarefaId).map((t) => (
                  <option key={t.id} value={t.id}>{t.titulo}</option>
                ))}
              </select>
              <button type="button" onClick={() => void addDependencia()} className="rounded bg-slate-100 px-3 text-sm">+</button>
            </div>

            {(tarefa.dependencias_saida?.length ?? 0) > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-xs text-slate-400">Tarefas que dependem desta:</p>
                <ul className="space-y-1">
                  {tarefa.dependencias_saida?.map((d) => (
                    <li key={d.id} className="text-sm text-slate-600">
                      <span className="rounded bg-sky-50 px-2 py-0.5 text-sky-800">→ {d.sucessora_titulo}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Campos personalizados */}
          {campos.length > 0 && (
            <div className="mt-6">
              <h4 className="mb-2 text-sm font-semibold text-slate-700">Campos personalizados</h4>
              <div className="space-y-2">
                {campos.map((c) => {
                  const val = tarefa.valores_campos?.find((v) => v.campo === c.id);
                  const valorAtual =
                    c.tipo === "NUMERO" ? String(val?.valor_numero ?? "") :
                    c.tipo === "DATA" ? (val?.valor_data ?? "") :
                    (val?.valor_texto ?? "");
                  return (
                    <div key={c.id} className="grid grid-cols-[100px_1fr] items-center gap-2 text-sm">
                      <span className="text-slate-500">{c.nome}</span>
                      <input
                        type={c.tipo === "DATA" ? "date" : c.tipo === "NUMERO" ? "number" : "text"}
                        defaultValue={valorAtual}
                        onBlur={(e) => void setValorCampo(c.id, e.target.value)}
                        className="rounded border border-slate-200 px-2 py-1"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Anexos */}
          <div className="mt-6">
            <h4 className="mb-2 text-sm font-semibold text-slate-700">
              Anexos
              {tarefa.anexos?.length ? (
                <span className="ml-2 text-xs font-normal text-slate-400">{tarefa.anexos.length}</span>
              ) : null}
            </h4>
            <div className="space-y-1">
              {tarefa.anexos?.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  <a
                    href={a.url ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={a.nome_original}
                    className="min-w-0 flex-1 truncate text-slate-700 hover:text-proj hover:underline"
                    title={a.nome_original}
                  >
                    {a.nome_original}
                  </a>
                  <span className="shrink-0 text-xs text-slate-400">{formatarTamanho(a.tamanho)}</span>
                  <a
                    href={a.url ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={a.nome_original}
                    className="shrink-0 text-xs text-slate-500 hover:text-proj"
                    title="Descarregar"
                  >
                    ↓
                  </a>
                  <button
                    type="button"
                    onClick={() => void removeAnexo(a.id)}
                    className="shrink-0 text-xs text-rose-500 hover:text-rose-700"
                    title="Eliminar"
                  >
                    ✕
                  </button>
                </div>
              )) ?? null}
              {!tarefa.anexos?.length && (
                <p className="text-xs text-slate-400">Nenhum anexo.</p>
              )}
            </div>
            <div className="mt-2">
              <input
                ref={fileInputRef}
                type="file"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadAnexo(file);
                }}
                disabled={aEnviarAnexo}
                className="block w-full text-xs text-slate-500 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-slate-700 hover:file:bg-slate-200 disabled:opacity-50"
              />
              {aEnviarAnexo && <p className="mt-1 text-xs text-slate-400">A carregar…</p>}
              {erroAnexo && <p className="mt-1 text-xs text-rose-600">{erroAnexo}</p>}
            </div>
          </div>

          {/* Descrição */}
          <div className="mt-6">
            <h4 className="mb-2 text-sm font-semibold text-slate-700">Descrição</h4>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-proj"
            />
          </div>

          {/* Comentários */}
          <div className="mt-6 border-t pt-4">
            <h4 className="mb-3 text-sm font-semibold text-slate-700">Comentários</h4>
            <div className="space-y-3">
              {tarefa.comentarios?.map((c) => (
                <div key={c.id} className="rounded-lg bg-slate-50 p-3">
                  <p className="text-sm text-slate-800">{c.texto}</p>
                  <p className="mt-1 text-[10px] text-slate-400">
                    {c.autor_nome} · {new Date(c.created_at).toLocaleString("pt-PT")}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                value={novoComentario}
                onChange={(e) => setNovoComentario(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void addComentario()}
                placeholder="Escrever comentário…"
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <button type="button" onClick={() => void addComentario()} className="rounded-lg bg-slate-800 px-3 text-sm text-white">
                Enviar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
