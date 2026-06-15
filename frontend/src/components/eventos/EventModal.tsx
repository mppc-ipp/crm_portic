"use client";

import { FormEvent, useEffect, useState } from "react";
import { apiFetch, withAuthHeaders, API_URL } from "@/lib/api";
import {
  deDatetimeLocal,
  formatarDataHora,
  formatarTamanho,
  paraDatetimeLocal,
  type AnexoEvento,
  type EventoDetalhe,
  type TipoEventoConfig,
} from "@/lib/eventos";

type Props = {
  open: boolean;
  eventoId?: number | null;
  initialInicio?: Date;
  initialFim?: Date;
  readOnly?: boolean;
  podeGerir: boolean;
  onClose: () => void;
  onSaved: () => void;
};

const inputClass = "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm";
const labelClass = "block text-sm font-medium text-slate-700";

export default function EventModal({
  open,
  eventoId,
  initialInicio,
  initialFim,
  readOnly = false,
  podeGerir,
  onClose,
  onSaved,
}: Props) {
  const [tipos, setTipos] = useState<TipoEventoConfig[]>([]);
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [descricao, setDescricao] = useState("");
  const [particular, setParticular] = useState(false);
  const [anexos, setAnexos] = useState<AnexoEvento[]>([]);
  const [ficheiros, setFicheiros] = useState<File[]>([]);
  const [aGuardar, setAGuardar] = useState(false);
  const [erro, setErro] = useState("");
  const [detalhe, setDetalhe] = useState<EventoDetalhe | null>(null);

  const modoEdicao = Boolean(eventoId);
  const somenteLeitura =
    readOnly || (modoEdicao && detalhe !== null && !detalhe.editable);

  useEffect(() => {
    if (!open) return;
    apiFetch<TipoEventoConfig[]>("/api/eventos/tipos?ativos=1")
      .then((data) => {
        setTipos(data);
        if (!eventoId && data[0]) {
          setTipo((prev) => prev || String(data[0].id));
        }
      })
      .catch(() => undefined);
  }, [open, eventoId]);

  useEffect(() => {
    if (!open) return;

    if (eventoId) {
      apiFetch<EventoDetalhe>(`/api/eventos/${eventoId}`)
        .then((ev) => {
          setDetalhe(ev);
          setTitulo(ev.titulo);
          setTipo(String(ev.tipo));
          setDataInicio(paraDatetimeLocal(ev.data_inicio));
          setDataFim(paraDatetimeLocal(ev.data_fim));
          setDescricao(ev.descricao);
          setParticular(ev.particular);
          setAnexos(ev.anexos);
        })
        .catch((e: Error) => setErro(e.message));
    } else {
      setDetalhe(null);
      setTitulo("");
      setDescricao("");
      setParticular(false);
      setAnexos([]);
      setFicheiros([]);
      if (initialInicio) setDataInicio(paraDatetimeLocal(initialInicio.toISOString()));
      else setDataInicio("");
      if (initialFim) setDataFim(paraDatetimeLocal(initialFim.toISOString()));
      else setDataFim("");
    }
    setErro("");
  }, [open, eventoId, initialInicio, initialFim]);

  const uploadAnexos = async (id: number, files: File[]) => {
    for (const file of files) {
      const fd = new FormData();
      fd.append("ficheiro", file);
      const res = await fetch(`${API_URL}/api/eventos/${id}/anexos`, {
        method: "POST",
        headers: withAuthHeaders(),
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erro ao enviar ficheiro" }));
        throw new Error(err.error ?? "Erro ao enviar ficheiro");
      }
    }
  };

  const removerAnexo = async (anexoId: number) => {
    if (!eventoId || somenteLeitura) return;
    await apiFetch(`/api/eventos/${eventoId}/anexos/${anexoId}`, { method: "DELETE" });
    setAnexos((prev) => prev.filter((a) => a.id !== anexoId));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (somenteLeitura || !podeGerir) return;
    if (!tipo) {
      setErro("Selecione um tipo de evento.");
      return;
    }
    setAGuardar(true);
    setErro("");
    try {
      const payload = {
        titulo,
        tipo: Number(tipo),
        data_inicio: deDatetimeLocal(dataInicio),
        data_fim: deDatetimeLocal(dataFim),
        descricao,
        particular,
      };

      let id = eventoId;
      if (modoEdicao && eventoId) {
        await apiFetch(`/api/eventos/${eventoId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        const criado = await apiFetch<EventoDetalhe>("/api/eventos", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        id = criado.id;
      }

      if (id && ficheiros.length > 0) {
        await uploadAnexos(id, ficheiros);
      }

      onSaved();
      onClose();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao guardar evento");
    } finally {
      setAGuardar(false);
    }
  };

  const handleEliminar = async () => {
    if (!eventoId || somenteLeitura || !podeGerir) return;
    if (!window.confirm("Eliminar este evento?")) return;
    setAGuardar(true);
    try {
      await apiFetch(`/api/eventos/${eventoId}`, { method: "DELETE" });
      onSaved();
      onClose();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao eliminar");
    } finally {
      setAGuardar(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {somenteLeitura ? "Detalhe do evento" : modoEdicao ? "Editar evento" : "Novo evento"}
            </h2>
            {detalhe?.passado && (
              <p className="mt-1 text-xs text-amber-700">Evento passado — apenas consulta</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        {erro && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {erro}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelClass}>Título</label>
            <input
              className={inputClass}
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              required
              readOnly={somenteLeitura}
            />
          </div>

          <div>
            <label className={labelClass}>Tipo</label>
            <select
              className={inputClass}
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              disabled={somenteLeitura}
              required
            >
              <option value="">— Selecionar —</option>
              {tipos.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Início</label>
              <input
                type="datetime-local"
                className={inputClass}
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                required
                readOnly={somenteLeitura}
              />
            </div>
            <div>
              <label className={labelClass}>Fim</label>
              <input
                type="datetime-local"
                className={inputClass}
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                required
                readOnly={somenteLeitura}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Descrição</label>
            <textarea
              className={inputClass}
              rows={3}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              readOnly={somenteLeitura}
            />
          </div>

          {!somenteLeitura && podeGerir && (
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={particular}
                onChange={(e) => setParticular(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              Evento particular (visível apenas para si)
            </label>
          )}

          {somenteLeitura && detalhe?.particular && (
            <p className="text-xs text-slate-500">Evento particular — visível apenas para o criador.</p>
          )}

          {(anexos.length > 0 || (!somenteLeitura && podeGerir)) && (
            <div>
              <label className={labelClass}>Anexos</label>
              {anexos.length > 0 && (
                <ul className="mt-2 space-y-2">
                  {anexos.map((a) => (
                    <li
                      key={a.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    >
                      <a
                        href={a.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate text-blue-700 hover:underline"
                      >
                        {a.nome_original}
                      </a>
                      <span className="shrink-0 text-xs text-slate-500">{formatarTamanho(a.tamanho)}</span>
                      {!somenteLeitura && podeGerir && (
                        <button
                          type="button"
                          onClick={() => void removerAnexo(a.id)}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Remover
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {!somenteLeitura && podeGerir && (
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
                  className="mt-2 block w-full text-sm"
                  onChange={(e) => setFicheiros(Array.from(e.target.files ?? []))}
                />
              )}
            </div>
          )}

          {somenteLeitura && detalhe && (
            <p className="text-xs text-slate-500">
              {formatarDataHora(detalhe.data_inicio)} — {formatarDataHora(detalhe.data_fim)}
            </p>
          )}

          <div className="flex flex-wrap justify-end gap-2 pt-2">
            {modoEdicao && !somenteLeitura && podeGerir && (
              <button
                type="button"
                onClick={() => void handleEliminar()}
                disabled={aGuardar}
                className="mr-auto rounded-lg border border-red-300 px-4 py-2 text-sm text-red-700 hover:bg-red-50"
              >
                Eliminar
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
            >
              Fechar
            </button>
            {!somenteLeitura && podeGerir && (
              <button
                type="submit"
                disabled={aGuardar}
                className="rounded-lg bg-[#1e3a5f] px-4 py-2 text-sm font-medium text-white hover:bg-[#162d4a] disabled:opacity-60"
              >
                {aGuardar ? "A guardar…" : "Guardar"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
