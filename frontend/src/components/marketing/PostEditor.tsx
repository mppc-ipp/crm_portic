"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import PostPreview from "./PostPreview";
import type { ContaSocial, Plataforma, Publicacao } from "./types";
import {
  actualizarPublicacao,
  agendarPublicacao,
  criarPublicacao,
  publicarAgora,
  uploadMedia,
} from "@/lib/marketing-api";

const LIMITES: Record<Plataforma, number> = {
  FACEBOOK: 63206,
  INSTAGRAM: 2200,
  LINKEDIN: 3000,
};

const inputClass = "mt-1 w-full rounded-lg border px-3 py-2 text-sm";
const labelClass = "block text-sm text-slate-600";

type DestinoInput = { plataforma: Plataforma; conta: number };

type Props = {
  contas: ContaSocial[];
  publicacao?: Publicacao;
  onGuardado?: (pub: Publicacao) => void;
};

export default function PostEditor({ contas, publicacao, onGuardado }: Props) {
  const [titulo, setTitulo] = useState(publicacao?.titulo_interno ?? "");
  const [texto, setTexto] = useState(publicacao?.texto ?? "");
  const [linkUrl, setLinkUrl] = useState(publicacao?.link_url ?? "");
  const [destinos, setDestinos] = useState<DestinoInput[]>(
    publicacao?.destinos.map((d) => ({ plataforma: d.plataforma, conta: d.conta })) ?? []
  );
  const [midias, setMidias] = useState(publicacao?.midias ?? []);
  const [publicacaoId, setPublicacaoId] = useState(publicacao?.id);
  const [agendadoPara, setAgendadoPara] = useState(
    publicacao?.agendado_para?.slice(0, 16) ?? ""
  );
  const [aGuardar, setAGuardar] = useState(false);
  const [erro, setErro] = useState("");
  const ficheiroRef = useRef<HTMLInputElement>(null);

  const plataformasSeleccionadas = useMemo(
    () => [...new Set(destinos.map((d) => d.plataforma))],
    [destinos]
  );

  const limiteTexto = useMemo(() => {
    if (plataformasSeleccionadas.length === 0) return 63206;
    return Math.min(...plataformasSeleccionadas.map((p) => LIMITES[p]));
  }, [plataformasSeleccionadas]);

  function toggleConta(conta: ContaSocial) {
    setDestinos((prev) => {
      const existe = prev.find((d) => d.conta === conta.id);
      if (existe) return prev.filter((d) => d.conta !== conta.id);
      return [...prev, { plataforma: conta.plataforma, conta: conta.id }];
    });
  }

  function contaSeleccionada(contaId: number) {
    return destinos.some((d) => d.conta === contaId);
  }

  async function guardarPayload(): Promise<Publicacao> {
    const payload = {
      titulo_interno: titulo,
      texto,
      link_url: linkUrl,
      destinos_input: destinos,
    };
    if (publicacaoId) {
      return actualizarPublicacao(publicacaoId, payload);
    }
    const criada = await criarPublicacao(payload);
    setPublicacaoId(criada.id);
    return criada;
  }

  async function handleUpload(files: FileList | null) {
    if (!files?.length) return;
    setErro("");
    let pid = publicacaoId;
    for (let i = 0; i < files.length; i++) {
      const result = await uploadMedia(files[i], pid, midias.length + i);
      pid = result.publicacao_id;
      setPublicacaoId(pid);
      setMidias((m) => [
        ...m,
        { id: result.midia.id, tipo: "IMAGEM", ordem: m.length, url: result.midia.url },
      ]);
    }
  }

  async function submit(e: FormEvent, accao: "rascunho" | "publicar" | "agendar") {
    e.preventDefault();
    setErro("");
    if (!titulo.trim()) {
      setErro("Título interno obrigatório");
      return;
    }
    if (destinos.length === 0) {
      setErro("Seleccione pelo menos uma conta");
      return;
    }
    if (plataformasSeleccionadas.includes("INSTAGRAM") && midias.length === 0) {
      setErro("Instagram exige pelo menos uma imagem");
      return;
    }
    if (texto.length > limiteTexto) {
      setErro(`Texto excede o limite de ${limiteTexto} caracteres`);
      return;
    }

    setAGuardar(true);
    try {
      let pub = await guardarPayload();
      if (accao === "publicar") {
        pub = await publicarAgora(pub.id);
      } else if (accao === "agendar") {
        if (!agendadoPara) {
          setErro("Indique data e hora para agendar");
          return;
        }
        pub = await agendarPublicacao(pub.id, new Date(agendadoPara).toISOString());
      }
      onGuardado?.(pub);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao guardar");
    } finally {
      setAGuardar(false);
    }
  }

  const editavel =
    !publicacao || publicacao.estado === "RASCUNHO" || publicacao.estado === "CANCELADO";

  return (
    <form onSubmit={(e) => submit(e, "rascunho")} className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        {erro && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}

        <div>
          <label className={labelClass}>Título interno</label>
          <input
            className={inputClass}
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            disabled={!editavel}
            required
          />
        </div>

        <div>
          <label className={labelClass}>
            Texto ({texto.length}/{limiteTexto})
          </label>
          <textarea
            className={`${inputClass} min-h-[140px]`}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            disabled={!editavel}
          />
        </div>

        <div>
          <label className={labelClass}>Link (Facebook)</label>
          <input
            className={inputClass}
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            disabled={!editavel}
            placeholder="https://"
          />
        </div>

        <div>
          <label className={labelClass}>Redes e contas</label>
          <div className="mt-2 space-y-2">
            {contas.length === 0 && (
              <p className="text-sm text-amber-700">
                Nenhuma conta ligada.{" "}
                <a href="/marketing/contas" className="underline">
                  Ligar contas
                </a>
              </p>
            )}
            {contas.map((conta) => (
              <label
                key={conta.id}
                className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={contaSeleccionada(conta.id)}
                  onChange={() => toggleConta(conta)}
                  disabled={!editavel}
                />
                <span className="text-sm">
                  {conta.plataforma_nome} — {conta.nome_exibicao}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className={labelClass}>Imagens / vídeo</label>
          <input
            ref={ficheiroRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="mt-1 text-sm"
            disabled={!editavel}
            onChange={(e) => handleUpload(e.target.files)}
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {midias.map((m) => (
              <img
                key={m.id}
                src={m.url}
                alt=""
                className="h-20 w-20 rounded-lg border object-cover"
              />
            ))}
          </div>
        </div>

        <div>
          <label className={labelClass}>Agendar para</label>
          <input
            type="datetime-local"
            className={inputClass}
            value={agendadoPara}
            onChange={(e) => setAgendadoPara(e.target.value)}
            disabled={!editavel}
          />
        </div>

        {editavel && (
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={aGuardar}
              className="rounded-lg border px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
            >
              Guardar rascunho
            </button>
            <button
              type="button"
              disabled={aGuardar}
              onClick={(e) => submit(e as unknown as FormEvent, "publicar")}
              className="rounded-lg bg-portic px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              Publicar agora
            </button>
            <button
              type="button"
              disabled={aGuardar}
              onClick={(e) => submit(e as unknown as FormEvent, "agendar")}
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              Agendar
            </button>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-medium text-slate-700">Pré-visualização</h3>
        {plataformasSeleccionadas.length === 0 ? (
          <p className="text-sm text-slate-500">Seleccione redes para pré-visualizar.</p>
        ) : (
          plataformasSeleccionadas.map((p) => (
            <PostPreview
              key={p}
              plataforma={p}
              texto={texto}
              linkUrl={linkUrl}
              imagens={midias.map((m) => m.url)}
            />
          ))
        )}

        {publicacao?.logs && publicacao.logs.length > 0 && (
          <div className="rounded-xl border bg-white p-3">
            <h3 className="mb-2 text-sm font-medium">Histórico</h3>
            <ul className="max-h-48 space-y-1 overflow-y-auto text-xs text-slate-600">
              {publicacao.logs.map((log) => (
                <li key={log.id}>
                  <span className="font-medium">{log.nivel}</span> — {log.mensagem}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </form>
  );
}
