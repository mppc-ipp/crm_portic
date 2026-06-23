"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import PostPreview from "./PostPreview";
import MediaGallery, { type ValidacaoMidia } from "./MediaGallery";
import EmpresasVincular, { type EmpresaVinculada } from "./EmpresasVincular";
import type { ContaSocial, Plataforma, Publicacao } from "./types";
import {
  actualizarPublicacao,
  agendarPublicacao,
  criarPublicacao,
  publicarAgora,
  uploadMedia,
  eliminarMedia,
} from "@/lib/marketing-api";
import {
  lerInfoMidia,
  lerInfoMidiaFromUrl,
  REQUISITOS_RESUMO,
  NOMES_PLATAFORMA,
  PLATAFORMAS_CARROSSEL,
  validarCarrossel,
  validarCarrosselInstagram,
  validarMixMidias,
  validarMidiaParaPlataformas,
  estadoPlataforma,
  issuesDaPlataforma,
  issuesRequisitosMidia,
  errosBloqueantes,
  type MediaInfo,
  type MediaValidationIssue,
} from "@/lib/marketing-media-validation";

const LIMITES: Record<Plataforma, number> = {
  FACEBOOK: 63206,
  INSTAGRAM: 2200,
  LINKEDIN: 3000,
  TIKTOK: 2200,
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
  const [empresas, setEmpresas] = useState<EmpresaVinculada[]>(
    publicacao?.empresas?.map((e) => ({ id: e.id, nome: e.nome })) ?? []
  );
  const [publicacaoId, setPublicacaoId] = useState(publicacao?.id);
  const [agendadoPara, setAgendadoPara] = useState(
    publicacao?.agendado_para?.slice(0, 16) ?? ""
  );
  const [aGuardar, setAGuardar] = useState(false);
  const [aCarregarMidia, setACarregarMidia] = useState(false);
  const [aEliminarMidiaId, setAEliminarMidiaId] = useState<number | null>(null);
  const [erro, setErro] = useState("");
  const [validacoesMidia, setValidacoesMidia] = useState<Record<number, ValidacaoMidia>>({});
  const [issuesGlobais, setIssuesGlobais] = useState<MediaValidationIssue[]>([]);
  const ficheiroRef = useRef<HTMLInputElement>(null);
  const midiasCarregadasRef = useRef<Set<number>>(new Set());

  const plataformasSeleccionadas = useMemo(
    () => [...new Set(destinos.map((d) => d.plataforma))],
    [destinos]
  );

  const limiteTexto = useMemo(() => {
    if (plataformasSeleccionadas.length === 0) return 63206;
    return Math.min(...plataformasSeleccionadas.map((p) => LIMITES[p]));
  }, [plataformasSeleccionadas]);

  const plataformasValidacao = plataformasSeleccionadas;

  const recalcularValidacoesGlobais = useCallback(
    (infos: MediaInfo[]) => {
      if (plataformasValidacao.length === 0) return [];
      const totalImagens = infos.filter((i) => i.tipo === "IMAGEM").length;
      return [
        ...validarCarrossel(totalImagens, plataformasValidacao),
        ...validarCarrosselInstagram(infos, plataformasValidacao),
        ...validarMixMidias(infos, plataformasValidacao),
      ];
    },
    [plataformasValidacao]
  );

  const actualizarValidacaoMidia = useCallback(
    (id: number, info: MediaInfo) => {
      const issues = validarMidiaParaPlataformas(info, plataformasValidacao);
      setValidacoesMidia((prev) => ({ ...prev, [id]: { info, issues } }));
      return issues;
    },
    [plataformasValidacao]
  );

  useEffect(() => {
    let cancelado = false;
    const pendentes = midias.filter((m) => !midiasCarregadasRef.current.has(m.id));
    if (pendentes.length === 0) return;

    (async () => {
      const novas: Record<number, ValidacaoMidia> = {};
      for (const m of pendentes) {
        try {
          const info = await lerInfoMidiaFromUrl(m.url, m.tipo);
          if (cancelado) return;
          novas[m.id] = {
            info,
            issues: validarMidiaParaPlataformas(info, plataformasValidacao),
          };
        } catch {
          if (cancelado) return;
          novas[m.id] = { issues: [] };
        }
        midiasCarregadasRef.current.add(m.id);
      }
      if (!cancelado && Object.keys(novas).length > 0) {
        setValidacoesMidia((prev) => ({ ...prev, ...novas }));
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [midias, plataformasValidacao]);

  useEffect(() => {
    setValidacoesMidia((prev) => {
      const next: Record<number, ValidacaoMidia> = {};
      for (const m of midias) {
        const actual = prev[m.id];
        if (actual?.info) {
          next[m.id] = {
            info: actual.info,
            issues: validarMidiaParaPlataformas(actual.info, plataformasValidacao),
          };
        } else if (actual) {
          next[m.id] = actual;
        }
      }
      return next;
    });
  }, [plataformasValidacao, midias]);

  useEffect(() => {
    const infos = Object.values(validacoesMidia)
      .map((v) => v.info)
      .filter((i): i is MediaInfo => Boolean(i));
    setIssuesGlobais(recalcularValidacoesGlobais(infos));
  }, [validacoesMidia, recalcularValidacoesGlobais]);

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

  const validacoesLista = useMemo(
    () => Object.values(validacoesMidia),
    [validacoesMidia]
  );

  const errosPublicacao = useMemo(
    () =>
      errosBloqueantes(
        plataformasSeleccionadas,
        validacoesLista,
        issuesGlobais,
        midias
      ),
    [plataformasSeleccionadas, validacoesLista, issuesGlobais, midias]
  );

  async function guardarPayload(): Promise<Publicacao> {
    const payload = {
      titulo_interno: titulo,
      texto,
      link_url: linkUrl,
      destinos_input: destinos,
      empresas_input: empresas.map((e) => e.id),
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
    if (destinos.length === 0) {
      if (ficheiroRef.current) ficheiroRef.current.value = "";
      return;
    }

    setErro("");
    setACarregarMidia(true);

    const listaFicheiros = Array.from(files);

    try {
      const novasImagens = listaFicheiros.filter((f) => !f.type.startsWith("video/")).length;
      const infosActuais = Object.values(validacoesMidia)
        .map((v) => v.info)
        .filter((i): i is MediaInfo => Boolean(i));
      const totalImagens =
        infosActuais.filter((i) => i.tipo === "IMAGEM").length + novasImagens;

      if (plataformasValidacao.length > 0) {
        const carrosselIssues = validarCarrossel(totalImagens, plataformasValidacao);
        const errosCarrossel = carrosselIssues.filter((i) => i.nivel === "erro");
        if (errosCarrossel.length > 0) {
          setErro(
            `${NOMES_PLATAFORMA[errosCarrossel[0].plataforma]}: ${errosCarrossel[0].mensagem}`
          );
          return;
        }
      }

      let pid = publicacaoId;

      for (let i = 0; i < listaFicheiros.length; i++) {
        const ficheiro = listaFicheiros[i];
        let info: MediaInfo;
        try {
          info = await lerInfoMidia(ficheiro);
        } catch {
          setErro(`Não foi possível ler «${ficheiro.name}». Verifique o ficheiro.`);
          return;
        }

        if (plataformasValidacao.length > 0) {
          const issues = validarMidiaParaPlataformas(info, plataformasValidacao);
          const erros = issues.filter((i) => i.nivel === "erro");
          if (erros.length > 0) {
            setErro(
              `«${ficheiro.name}» — ${NOMES_PLATAFORMA[erros[0].plataforma]}: ${erros[0].mensagem}`
            );
            return;
          }
        }

        const tipo = info.tipo;
        const result = await uploadMedia(ficheiro, pid, midias.length + i);
        pid = result.publicacao_id;
        setPublicacaoId(pid);
        const novaMidia = {
          id: result.midia.id,
          tipo,
          ordem: midias.length + i,
          url: result.midia.url,
        } as const;
        setMidias((m) => [...m, novaMidia]);
        midiasCarregadasRef.current.add(result.midia.id);
        actualizarValidacaoMidia(result.midia.id, info);
      }
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao enviar ficheiro");
    } finally {
      setACarregarMidia(false);
      if (ficheiroRef.current) ficheiroRef.current.value = "";
    }
  }

  async function eliminarMidia(id: number) {
    setErro("");
    setAEliminarMidiaId(id);
    try {
      await eliminarMedia(id);
      setMidias((lista) => lista.filter((m) => m.id !== id));
      midiasCarregadasRef.current.delete(id);
      setValidacoesMidia((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao remover ficheiro");
    } finally {
      setAEliminarMidiaId(null);
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
    if (
      plataformasSeleccionadas.includes("TIKTOK") &&
      !midias.some((m) => m.tipo === "VIDEO")
    ) {
      setErro("TikTok exige pelo menos um vídeo");
      return;
    }
    if (texto.length > limiteTexto) {
      setErro(`Texto excede o limite de ${limiteTexto} caracteres`);
      return;
    }
    if (
      (accao === "publicar" || accao === "agendar") &&
      errosPublicacao.length > 0
    ) {
      const primeiro = errosPublicacao[0];
      setErro(
        `Não é possível publicar: ${NOMES_PLATAFORMA[primeiro.plataforma]} — ${primeiro.mensagem}`
      );
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
          {plataformasSeleccionadas.length > 0 && (
            <div className="mb-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <p className="font-medium text-slate-700">Requisitos das redes seleccionadas</p>
              <ul className="mt-1 space-y-1">
                {plataformasSeleccionadas.map((p) => (
                  <li key={p}>
                    <span className="font-medium">{NOMES_PLATAFORMA[p]}:</span>{" "}
                    {REQUISITOS_RESUMO[p].imagem}; {REQUISITOS_RESUMO[p].video}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-2 space-y-2">
            {contas.length === 0 && (
              <p className="text-sm text-amber-700">
                Nenhuma conta ligada.{" "}
                <a href="/marketing/contas" className="underline">
                  Ligar contas
                </a>
              </p>
            )}
            {contas.map((conta) => {
              const seleccionada = contaSeleccionada(conta.id);
              const issuesConta = seleccionada
                ? [
                    ...issuesRequisitosMidia(conta.plataforma, midias),
                    ...issuesDaPlataforma(
                      conta.plataforma,
                      validacoesLista,
                      issuesGlobais
                    ),
                  ]
                : [];
              const estado = seleccionada ? estadoPlataforma(conta.plataforma, issuesConta) : "ok";
              const rowClass = !seleccionada
                ? "hover:bg-slate-50"
                : estado === "erro"
                  ? "border-red-400 bg-red-50"
                  : "hover:bg-slate-50";

              return (
              <label
                key={conta.id}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 ${rowClass}`}
              >
                <input
                  type="checkbox"
                  checked={seleccionada}
                  onChange={() => toggleConta(conta)}
                  disabled={!editavel}
                />
                <span className={`text-sm ${seleccionada && estado === "erro" ? "font-medium text-red-800" : ""}`}>
                  {conta.plataforma_nome} — {conta.nome_exibicao}
                  {seleccionada && estado === "erro" && (
                    <span className="ml-1 text-xs text-red-600">
                      — {issuesConta.find((i) => i.nivel === "erro")?.mensagem}
                    </span>
                  )}
                </span>
              </label>
            );
            })}
          </div>
        </div>

        <div>
          <label className={labelClass}>Imagens / vídeo</label>
          {destinos.length === 0 ? (
            <p className="mt-0.5 text-xs text-slate-500">
              Seleccione pelo menos uma conta acima para adicionar imagens ou vídeos.
            </p>
          ) : (
            PLATAFORMAS_CARROSSEL.some((p) => plataformasSeleccionadas.includes(p)) && (
              <p className="mt-0.5 text-xs text-slate-500">
                Para carrossel, seleccione várias fotos de uma vez (máx. 10 no Instagram/Facebook,
                9 no LinkedIn).
                {plataformasSeleccionadas.includes("INSTAGRAM") &&
                  " No Instagram, todas devem ter a mesma proporção."}
              </p>
            )
          )}
          <input
            ref={ficheiroRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="mt-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!editavel || aCarregarMidia || destinos.length === 0}
            onChange={(e) => handleUpload(e.target.files)}
          />
          {aCarregarMidia && (
            <p className="mt-1 text-xs text-slate-500">A validar e enviar ficheiro…</p>
          )}
          <MediaGallery
            midias={midias}
            validacoes={validacoesMidia}
            plataformasSeleccionadas={plataformasSeleccionadas}
            editavel={editavel}
            aEliminarId={aEliminarMidiaId}
            onEliminar={eliminarMidia}
          />
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

        <EmpresasVincular
          selecionadas={empresas}
          onChange={setEmpresas}
          editavel={editavel}
          labelClass={labelClass}
          inputClass={inputClass}
        />

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
              disabled={aGuardar || errosPublicacao.length > 0}
              onClick={(e) => submit(e as unknown as FormEvent, "publicar")}
              className="rounded-lg bg-portic px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              Publicar agora
            </button>
            <button
              type="button"
              disabled={aGuardar || errosPublicacao.length > 0}
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
          plataformasSeleccionadas.map((p) => {
            const contaId = destinos.find((d) => d.plataforma === p)?.conta;
            const conta = contas.find((c) => c.id === contaId);
            return (
              <PostPreview
                key={p}
                plataforma={p}
                nomeConta={conta?.nome_exibicao}
                texto={texto}
                linkUrl={linkUrl}
                imagens={midias.filter((m) => m.tipo === "IMAGEM").map((m) => m.url)}
                videos={midias.filter((m) => m.tipo === "VIDEO").map((m) => m.url)}
              />
            );
          })
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
