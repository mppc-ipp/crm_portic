"use client";

import { FormEvent, ReactNode, useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type TipoConfig = {
  id: number;
  codigo: string;
  nome: string;
  ordem: number;
  ativo: boolean;
};

type StatusCandidatura = TipoConfig & { cor: string };
type TipoEvento = TipoConfig & { cor: string };
type CorEstadoPublicacao = TipoConfig & { cor: string; codigo: string };

export default function ConfiguracaoCRM() {
  const [tipos, setTipos] = useState<TipoConfig[]>([]);
  const [tiposHistorico, setTiposHistorico] = useState<TipoConfig[]>([]);
  const [estadosCandidatura, setEstadosCandidatura] = useState<StatusCandidatura[]>([]);
  const [tiposEvento, setTiposEvento] = useState<TipoEvento[]>([]);
  const [coresMarketing, setCoresMarketing] = useState<CorEstadoPublicacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [erroTipos, setErroTipos] = useState("");
  const [erroHistorico, setErroHistorico] = useState("");
  const [erroEstados, setErroEstados] = useState("");
  const [erroTiposEvento, setErroTiposEvento] = useState("");
  const [erroCoresMarketing, setErroCoresMarketing] = useState("");
  const [aGuardar, setAGuardar] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novoNomeHistorico, setNovoNomeHistorico] = useState("");
  const [novoNomeEstado, setNovoNomeEstado] = useState("");
  const [novaCorEstado, setNovaCorEstado] = useState("#3B82F6");
  const [novoNomeTipoEvento, setNovoNomeTipoEvento] = useState("");
  const [novaCorTipoEvento, setNovaCorTipoEvento] = useState("#3B82F6");
  const [editando, setEditando] = useState<TipoConfig | null>(null);
  const [editandoHistorico, setEditandoHistorico] = useState<TipoConfig | null>(null);
  const [editandoEstado, setEditandoEstado] = useState<StatusCandidatura | null>(null);
  const [editandoTipoEvento, setEditandoTipoEvento] = useState<TipoEvento | null>(null);
  const [editandoCorMarketing, setEditandoCorMarketing] = useState<CorEstadoPublicacao | null>(null);
  const [formEditar, setFormEditar] = useState({ nome: "", ordem: 0, ativo: true });
  const [formEditarHistorico, setFormEditarHistorico] = useState({ nome: "", ordem: 0, ativo: true });
  const [formEditarEstado, setFormEditarEstado] = useState({
    nome: "",
    ordem: 0,
    ativo: true,
    cor: "#3B82F6",
  });
  const [formEditarTipoEvento, setFormEditarTipoEvento] = useState({
    nome: "",
    ordem: 0,
    ativo: true,
    cor: "#3B82F6",
  });
  const [formEditarCorMarketing, setFormEditarCorMarketing] = useState({
    nome: "",
    cor: "#3B82F6",
  });

  const carregarTipos = useCallback(async () => {
    setLoading(true);
    setErroTipos("");
    setErroHistorico("");
    setErroEstados("");
    setErroTiposEvento("");
    setErroCoresMarketing("");
    try {
      const [empresas, historico, estados, eventos, marketingCores] = await Promise.all([
        apiFetch<TipoConfig[]>("/api/empresas/tipos-interacao"),
        apiFetch<TipoConfig[]>("/api/startups/tipos-historico"),
        apiFetch<StatusCandidatura[]>("/api/startups/estados-candidatura"),
        apiFetch<TipoEvento[]>("/api/eventos/tipos"),
        apiFetch<CorEstadoPublicacao[]>("/api/marketing/estados-publicacao"),
      ]);
      setTipos(empresas);
      setTiposHistorico(historico);
      setEstadosCandidatura(estados);
      setTiposEvento(eventos);
      setCoresMarketing(marketingCores);
    } catch (e) {
      setErroTipos(e instanceof Error ? e.message : "Erro ao carregar configurações");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void carregarTipos();
  }, [carregarTipos]);

  async function adicionarTipo(e: FormEvent) {
    e.preventDefault();
    if (!novoNome.trim()) return;
    setAGuardar(true);
    try {
      await apiFetch("/api/empresas/tipos-interacao", {
        method: "POST",
        body: JSON.stringify({ nome: novoNome.trim(), ordem: tipos.length + 1 }),
      });
      setNovoNome("");
      await carregarTipos();
    } catch (err) {
      setErroTipos(err instanceof Error ? err.message : "Erro ao adicionar");
    } finally {
      setAGuardar(false);
    }
  }

  async function adicionarTipoHistorico(e: FormEvent) {
    e.preventDefault();
    if (!novoNomeHistorico.trim()) return;
    setAGuardar(true);
    try {
      await apiFetch("/api/startups/tipos-historico", {
        method: "POST",
        body: JSON.stringify({ nome: novoNomeHistorico.trim(), ordem: tiposHistorico.length + 1 }),
      });
      setNovoNomeHistorico("");
      await carregarTipos();
    } catch (err) {
      setErroHistorico(err instanceof Error ? err.message : "Erro ao adicionar");
    } finally {
      setAGuardar(false);
    }
  }

  async function adicionarTipoEvento(e: FormEvent) {
    e.preventDefault();
    if (!novoNomeTipoEvento.trim()) return;
    setAGuardar(true);
    try {
      await apiFetch("/api/eventos/tipos", {
        method: "POST",
        body: JSON.stringify({
          nome: novoNomeTipoEvento.trim(),
          cor: novaCorTipoEvento,
          ordem: tiposEvento.length + 1,
        }),
      });
      setNovoNomeTipoEvento("");
      await carregarTipos();
    } catch (err) {
      setErroTiposEvento(err instanceof Error ? err.message : "Erro ao adicionar");
    } finally {
      setAGuardar(false);
    }
  }

  async function adicionarEstado(e: FormEvent) {
    e.preventDefault();
    if (!novoNomeEstado.trim()) return;
    setAGuardar(true);
    try {
      await apiFetch("/api/startups/estados-candidatura", {
        method: "POST",
        body: JSON.stringify({
          nome: novoNomeEstado.trim(),
          cor: novaCorEstado,
          ordem: estadosCandidatura.length + 1,
        }),
      });
      setNovoNomeEstado("");
      await carregarTipos();
    } catch (err) {
      setErroEstados(err instanceof Error ? err.message : "Erro ao adicionar");
    } finally {
      setAGuardar(false);
    }
  }

  function TabelaTipos({
    items,
    onEditar,
    onAlternar,
    onExcluir,
  }: {
    items: TipoConfig[];
    onEditar: (t: TipoConfig) => void;
    onAlternar: (t: TipoConfig) => void;
    onExcluir: (t: TipoConfig) => void;
  }) {
    return (
      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-3 text-left">Nome</th>
              <th className="p-3 text-left">Ordem</th>
              <th className="p-3 text-left">Estado</th>
              <th className="p-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.map((t) => (
              <tr key={t.id} className="border-t">
                <td className="p-3 font-medium">{t.nome}</td>
                <td className="p-3">{t.ordem}</td>
                <td className="p-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      t.ativo ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {t.ativo ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => onEditar(t)} className="text-xs text-portic hover:underline">Editar</button>
                    <button type="button" onClick={() => onAlternar(t)} className="text-xs text-slate-600 hover:underline">{t.ativo ? "Desativar" : "Ativar"}</button>
                    <button type="button" onClick={() => onExcluir(t)} className="text-xs text-red-600 hover:underline">Excluir</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="rounded-xl border bg-white p-5">
        <h3 className="mb-1 font-semibold">Tipos de interação (Empresas)</h3>
        <p className="mb-4 text-sm text-slate-600">Opções do campo Tipo ao registar interações numa empresa.</p>
        <form onSubmit={adicionarTipo} className="mb-4 flex flex-wrap items-end gap-3">
          <label className="block min-w-[200px] flex-1 text-sm text-slate-600">
            Novo tipo
            <input value={novoNome} onChange={(e) => setNovoNome(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" />
          </label>
          <button type="submit" disabled={aGuardar || !novoNome.trim()} className="rounded-lg bg-portic px-4 py-2 text-sm text-white disabled:opacity-50">Adicionar</button>
        </form>
        {erroTipos && <p className="mb-3 text-sm text-red-600">{erroTipos}</p>}
        {loading ? <p className="text-sm text-slate-500">A carregar…</p> : (
          <TabelaTipos
            items={tipos}
            onEditar={(t) => { setEditando(t); setFormEditar({ nome: t.nome, ordem: t.ordem, ativo: t.ativo }); }}
            onAlternar={async (t) => {
              setAGuardar(true);
              await apiFetch(`/api/empresas/tipos-interacao/${t.id}`, { method: "PATCH", body: JSON.stringify({ ativo: !t.ativo }) });
              await carregarTipos();
              setAGuardar(false);
            }}
            onExcluir={async (t) => {
              if (!window.confirm(`Excluir "${t.nome}"?`)) return;
              await apiFetch(`/api/empresas/tipos-interacao/${t.id}`, { method: "DELETE" });
              await carregarTipos();
            }}
          />
        )}
      </section>

      <section className="rounded-xl border bg-white p-5">
        <h3 className="mb-1 font-semibold">Tipos de histórico (Startups)</h3>
        <p className="mb-4 text-sm text-slate-600">Opções do campo Tipo no histórico de contacto de candidaturas.</p>
        <form onSubmit={adicionarTipoHistorico} className="mb-4 flex flex-wrap items-end gap-3">
          <label className="block min-w-[200px] flex-1 text-sm text-slate-600">
            Novo tipo
            <input value={novoNomeHistorico} onChange={(e) => setNovoNomeHistorico(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" />
          </label>
          <button type="submit" disabled={aGuardar || !novoNomeHistorico.trim()} className="rounded-lg bg-portic px-4 py-2 text-sm text-white disabled:opacity-50">Adicionar</button>
        </form>
        {erroHistorico && <p className="mb-3 text-sm text-red-600">{erroHistorico}</p>}
        {!loading && (
          <TabelaTipos
            items={tiposHistorico}
            onEditar={(t) => { setEditandoHistorico(t); setFormEditarHistorico({ nome: t.nome, ordem: t.ordem, ativo: t.ativo }); }}
            onAlternar={async (t) => {
              await apiFetch(`/api/startups/tipos-historico/${t.id}`, { method: "PATCH", body: JSON.stringify({ ativo: !t.ativo }) });
              await carregarTipos();
            }}
            onExcluir={async (t) => {
              if (!window.confirm(`Excluir "${t.nome}"?`)) return;
              await apiFetch(`/api/startups/tipos-historico/${t.id}`, { method: "DELETE" });
              await carregarTipos();
            }}
          />
        )}
      </section>

      <section className="rounded-xl border bg-white p-5">
        <h3 className="mb-1 font-semibold">Tipos de evento (Dashboard)</h3>
        <p className="mb-4 text-sm text-slate-600">Opções do campo Tipo ao criar eventos no calendário.</p>
        <form onSubmit={adicionarTipoEvento} className="mb-4 flex flex-wrap items-end gap-3">
          <label className="block min-w-[160px] flex-1 text-sm text-slate-600">
            Novo tipo
            <input
              value={novoNomeTipoEvento}
              onChange={(e) => setNovoNomeTipoEvento(e.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2"
            />
          </label>
          <label className="text-sm text-slate-600">
            Cor
            <input
              type="color"
              value={novaCorTipoEvento}
              onChange={(e) => setNovaCorTipoEvento(e.target.value)}
              className="mt-1 block h-10 w-14 rounded border"
            />
          </label>
          <button
            type="submit"
            disabled={aGuardar || !novoNomeTipoEvento.trim()}
            className="rounded-lg bg-portic px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            Adicionar
          </button>
        </form>
        {erroTiposEvento && <p className="mb-3 text-sm text-red-600">{erroTiposEvento}</p>}
        {!loading && (
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="p-3 text-left">Nome</th>
                  <th className="p-3 text-left">Cor</th>
                  <th className="p-3 text-left">Ordem</th>
                  <th className="p-3 text-left">Estado</th>
                  <th className="p-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {tiposEvento.map((t) => (
                  <tr key={t.id} className="border-t">
                    <td className="p-3">
                      <span
                        className="rounded-full border px-2.5 py-0.5 text-xs font-medium"
                        style={{ backgroundColor: `${t.cor}22`, color: t.cor, borderColor: `${t.cor}55` }}
                      >
                        {t.nome}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-xs">{t.cor}</td>
                    <td className="p-3">{t.ordem}</td>
                    <td className="p-3">{t.ativo ? "Ativo" : "Inativo"}</td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditandoTipoEvento(t);
                            setFormEditarTipoEvento({
                              nome: t.nome,
                              ordem: t.ordem,
                              ativo: t.ativo,
                              cor: t.cor,
                            });
                          }}
                          className="text-xs text-portic hover:underline"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await apiFetch(`/api/eventos/tipos/${t.id}`, {
                              method: "PATCH",
                              body: JSON.stringify({ ativo: !t.ativo }),
                            });
                            await carregarTipos();
                          }}
                          className="text-xs text-slate-600 hover:underline"
                        >
                          {t.ativo ? "Desativar" : "Ativar"}
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (!window.confirm(`Excluir "${t.nome}"?`)) return;
                            await apiFetch(`/api/eventos/tipos/${t.id}`, { method: "DELETE" });
                            await carregarTipos();
                          }}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl border bg-white p-5">
        <h3 className="mb-1 font-semibold">Estados de candidatura (Startups)</h3>
        <form onSubmit={adicionarEstado} className="mb-4 flex flex-wrap items-end gap-3">
          <label className="block min-w-[160px] flex-1 text-sm text-slate-600">
            Novo estado
            <input value={novoNomeEstado} onChange={(e) => setNovoNomeEstado(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" />
          </label>
          <label className="text-sm text-slate-600">
            Cor
            <input type="color" value={novaCorEstado} onChange={(e) => setNovaCorEstado(e.target.value)} className="mt-1 block h-10 w-14 rounded border" />
          </label>
          <button type="submit" disabled={aGuardar || !novoNomeEstado.trim()} className="rounded-lg bg-portic px-4 py-2 text-sm text-white disabled:opacity-50">Adicionar</button>
        </form>
        {erroEstados && <p className="mb-3 text-sm text-red-600">{erroEstados}</p>}
        {!loading && (
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="p-3 text-left">Nome</th>
                  <th className="p-3 text-left">Cor</th>
                  <th className="p-3 text-left">Ordem</th>
                  <th className="p-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {estadosCandidatura.map((s) => (
                  <tr key={s.id} className="border-t">
                    <td className="p-3">
                      <span className="rounded-full border px-2.5 py-0.5 text-xs font-medium" style={{ backgroundColor: `${s.cor}22`, color: s.cor, borderColor: `${s.cor}55` }}>{s.nome}</span>
                    </td>
                    <td className="p-3 font-mono text-xs">{s.cor}</td>
                    <td className="p-3">{s.ordem}</td>
                    <td className="p-3 text-right">
                      <button type="button" onClick={() => { setEditandoEstado(s); setFormEditarEstado({ nome: s.nome, ordem: s.ordem, ativo: s.ativo, cor: s.cor }); }} className="text-xs text-portic hover:underline">Editar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl border bg-white p-5">
        <h3 className="mb-1 font-semibold">Cores do calendário de marketing</h3>
        <p className="mb-4 text-sm text-slate-500">
          Cores dos estados das publicações no calendário (Marketing → Calendário).
        </p>
        {erroCoresMarketing && <p className="mb-3 text-sm text-red-600">{erroCoresMarketing}</p>}
        {!loading && (
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="p-3 text-left">Estado</th>
                  <th className="p-3 text-left">Cor</th>
                  <th className="p-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {coresMarketing.map((s) => (
                  <tr key={s.id} className="border-t">
                    <td className="p-3">
                      <span
                        className="rounded-full border px-2.5 py-0.5 text-xs font-medium"
                        style={{
                          backgroundColor: `${s.cor}22`,
                          color: s.cor,
                          borderColor: `${s.cor}55`,
                        }}
                      >
                        {s.nome}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-xs">{s.cor}</td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setEditandoCorMarketing(s);
                          setFormEditarCorMarketing({ nome: s.nome, cor: s.cor });
                        }}
                        className="text-xs text-portic hover:underline"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editando && (
        <Modal title="Editar tipo de interação" onClose={() => setEditando(null)}>
          <form onSubmit={async (e) => {
            e.preventDefault();
            if (!editando) return;
            await apiFetch(`/api/empresas/tipos-interacao/${editando.id}`, { method: "PATCH", body: JSON.stringify(formEditar) });
            setEditando(null);
            await carregarTipos();
          }} className="space-y-4">
            <input required value={formEditar.nome} onChange={(e) => setFormEditar((f) => ({ ...f, nome: e.target.value }))} className="w-full rounded-lg border px-3 py-2" />
            <input type="number" value={formEditar.ordem} onChange={(e) => setFormEditar((f) => ({ ...f, ordem: parseInt(e.target.value, 10) || 0 }))} className="w-full rounded-lg border px-3 py-2" />
            <button type="submit" className="rounded-lg bg-portic px-4 py-2 text-sm text-white">Guardar</button>
          </form>
        </Modal>
      )}
      {editandoHistorico && (
        <Modal title="Editar tipo de histórico" onClose={() => setEditandoHistorico(null)}>
          <form onSubmit={async (e) => {
            e.preventDefault();
            if (!editandoHistorico) return;
            await apiFetch(`/api/startups/tipos-historico/${editandoHistorico.id}`, { method: "PATCH", body: JSON.stringify(formEditarHistorico) });
            setEditandoHistorico(null);
            await carregarTipos();
          }} className="space-y-4">
            <input required value={formEditarHistorico.nome} onChange={(e) => setFormEditarHistorico((f) => ({ ...f, nome: e.target.value }))} className="w-full rounded-lg border px-3 py-2" />
            <button type="submit" className="rounded-lg bg-portic px-4 py-2 text-sm text-white">Guardar</button>
          </form>
        </Modal>
      )}
      {editandoTipoEvento && (
        <Modal title="Editar tipo de evento" onClose={() => setEditandoTipoEvento(null)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!editandoTipoEvento) return;
              await apiFetch(`/api/eventos/tipos/${editandoTipoEvento.id}`, {
                method: "PATCH",
                body: JSON.stringify(formEditarTipoEvento),
              });
              setEditandoTipoEvento(null);
              await carregarTipos();
            }}
            className="space-y-4"
          >
            <input
              required
              value={formEditarTipoEvento.nome}
              onChange={(e) => setFormEditarTipoEvento((f) => ({ ...f, nome: e.target.value }))}
              className="w-full rounded-lg border px-3 py-2"
            />
            <input
              type="number"
              value={formEditarTipoEvento.ordem}
              onChange={(e) =>
                setFormEditarTipoEvento((f) => ({ ...f, ordem: parseInt(e.target.value, 10) || 0 }))
              }
              className="w-full rounded-lg border px-3 py-2"
            />
            <input
              type="color"
              value={formEditarTipoEvento.cor}
              onChange={(e) => setFormEditarTipoEvento((f) => ({ ...f, cor: e.target.value }))}
            />
            <button type="submit" className="rounded-lg bg-portic px-4 py-2 text-sm text-white">
              Guardar
            </button>
          </form>
        </Modal>
      )}
      {editandoEstado && (
        <Modal title="Editar estado" onClose={() => setEditandoEstado(null)}>
          <form onSubmit={async (e) => {
            e.preventDefault();
            if (!editandoEstado) return;
            await apiFetch(`/api/startups/estados-candidatura/${editandoEstado.id}`, { method: "PATCH", body: JSON.stringify(formEditarEstado) });
            setEditandoEstado(null);
            await carregarTipos();
          }} className="space-y-4">
            <input required value={formEditarEstado.nome} onChange={(e) => setFormEditarEstado((f) => ({ ...f, nome: e.target.value }))} className="w-full rounded-lg border px-3 py-2" />
            <input type="color" value={formEditarEstado.cor} onChange={(e) => setFormEditarEstado((f) => ({ ...f, cor: e.target.value }))} />
            <button type="submit" className="rounded-lg bg-portic px-4 py-2 text-sm text-white">Guardar</button>
          </form>
        </Modal>
      )}
      {editandoCorMarketing && (
        <Modal title="Editar cor de estado (marketing)" onClose={() => setEditandoCorMarketing(null)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!editandoCorMarketing) return;
              setAGuardar(true);
              setErroCoresMarketing("");
              try {
                await apiFetch(`/api/marketing/estados-publicacao/${editandoCorMarketing.id}`, {
                  method: "PATCH",
                  body: JSON.stringify(formEditarCorMarketing),
                });
                setEditandoCorMarketing(null);
                await carregarTipos();
              } catch (err) {
                setErroCoresMarketing(err instanceof Error ? err.message : "Erro ao guardar");
              } finally {
                setAGuardar(false);
              }
            }}
            className="space-y-4"
          >
            <label className="block text-sm text-slate-600">
              Nome exibido
              <input
                required
                value={formEditarCorMarketing.nome}
                onChange={(e) =>
                  setFormEditarCorMarketing((f) => ({ ...f, nome: e.target.value }))
                }
                className="mt-1 w-full rounded-lg border px-3 py-2"
              />
            </label>
            <label className="block text-sm text-slate-600">
              Cor
              <input
                type="color"
                value={formEditarCorMarketing.cor}
                onChange={(e) =>
                  setFormEditarCorMarketing((f) => ({ ...f, cor: e.target.value }))
                }
                className="mt-1 block h-10 w-14 rounded border"
              />
            </label>
            <button
              type="submit"
              disabled={aGuardar}
              className="rounded-lg bg-portic px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              Guardar
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h4 className="mb-4 font-bold">{title}</h4>
        {children}
      </div>
    </div>
  );
}
