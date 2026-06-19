"use client";

import type { Plataforma, PublicacaoMidia } from "./types";
import {
  limiteCarrossel,
  PLATAFORMAS_CARROSSEL,
  type MediaInfo,
  type MediaValidationIssue,
} from "@/lib/marketing-media-validation";

export type ValidacaoMidia = {
  info?: MediaInfo;
  issues: MediaValidationIssue[];
};

function ThumbnailMidia({
  midia,
  indice,
  validacao,
  editavel,
  aEliminar,
  onEliminar,
}: {
  midia: PublicacaoMidia;
  indice?: number;
  validacao?: ValidacaoMidia;
  editavel?: boolean;
  aEliminar?: boolean;
  onEliminar?: (id: number) => void;
}) {
  return (
    <div className="flex w-28 flex-col gap-1">
      <div className="relative">
        {indice !== undefined && midia.tipo === "IMAGEM" && (
          <span className="absolute left-1 top-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-[10px] font-bold text-white">
            {indice}
          </span>
        )}
        {editavel && onEliminar && (
          <button
            type="button"
            disabled={aEliminar}
            onClick={() => onEliminar(midia.id)}
            className="absolute right-1 top-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-sm leading-none text-white hover:bg-red-600 disabled:opacity-50"
            aria-label="Remover ficheiro"
            title="Remover"
          >
            ×
          </button>
        )}
        {midia.tipo === "VIDEO" ? (
          <video
            src={midia.url}
            className="h-28 w-28 rounded-lg border object-cover"
          />
        ) : (
          <img
            src={midia.url}
            alt=""
            className="h-28 w-28 rounded-lg border object-cover"
          />
        )}
      </div>

      {validacao?.info && (
        <p className="text-center text-[10px] text-slate-500">
          {validacao.info.width}×{validacao.info.height}
          {validacao.info.durationSec !== undefined &&
            ` · ${Math.round(validacao.info.durationSec)}s`}
        </p>
      )}
    </div>
  );
}

type Props = {
  midias: PublicacaoMidia[];
  validacoes: Record<number, ValidacaoMidia>;
  plataformasSeleccionadas: Plataforma[];
  editavel?: boolean;
  aEliminarId?: number | null;
  onEliminar?: (id: number) => void;
};

export default function MediaGallery({
  midias,
  validacoes,
  plataformasSeleccionadas,
  editavel = false,
  aEliminarId = null,
  onEliminar,
}: Props) {
  const imagens = midias.filter((m) => m.tipo === "IMAGEM");
  const videos = midias.filter((m) => m.tipo === "VIDEO");
  const redesCarrossel = plataformasSeleccionadas.filter((p) =>
    PLATAFORMAS_CARROSSEL.includes(p)
  );
  const carrossel = imagens.length > 1 && redesCarrossel.length > 0;
  const limiteMin = carrossel
    ? Math.min(
        ...redesCarrossel
          .map((p) => limiteCarrossel(p))
          .filter((n): n is number => n !== null)
      )
    : 10;

  if (midias.length === 0) return null;

  return (
    <div className="mt-2 space-y-3">
      {carrossel && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
          <p className="font-medium">
            Carrossel · {imagens.length}/{limiteMin} fotos
          </p>
          <p className="mt-0.5">
            Publicação com várias imagens em{" "}
            {redesCarrossel
              .map((p) =>
                p === "INSTAGRAM" ? "Instagram" : p === "FACEBOOK" ? "Facebook" : "LinkedIn"
              )
              .join(", ")}
            .
            {redesCarrossel.includes("INSTAGRAM") &&
              " No Instagram, todas devem ter a mesma proporção."}
          </p>
        </div>
      )}

      {imagens.length > 0 && (
        <div>
          {carrossel && (
            <p className="mb-1.5 text-xs font-medium text-slate-600">
              Fotos do carrossel (ordem de publicação)
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            {imagens.map((m, idx) => (
              <ThumbnailMidia
                key={m.id}
                midia={m}
                indice={carrossel ? idx + 1 : undefined}
                validacao={validacoes[m.id]}
                editavel={editavel}
                aEliminar={aEliminarId === m.id}
                onEliminar={onEliminar}
              />
            ))}
          </div>
        </div>
      )}

      {videos.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium text-slate-600">Vídeos</p>
          <div className="flex flex-wrap gap-3">
            {videos.map((m) => (
              <ThumbnailMidia
                key={m.id}
                midia={m}
                validacao={validacoes[m.id]}
                editavel={editavel}
                aEliminar={aEliminarId === m.id}
                onEliminar={onEliminar}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
