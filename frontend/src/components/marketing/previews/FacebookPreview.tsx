import PreviewMedia from "./PreviewMedia";
import { dominioLink, inicialNome, NOMES_PADRAO } from "./utils";

type Props = {
  nomeConta?: string;
  texto: string;
  linkUrl?: string;
  imagens: string[];
  videos?: string[];
};

export default function FacebookPreview({
  nomeConta,
  texto,
  linkUrl,
  imagens,
  videos = [],
}: Props) {
  const nome = nomeConta || NOMES_PADRAO.FACEBOOK;
  const temMedia = Boolean(videos[0] || imagens[0]);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
          {inicialNome(nome)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{nome}</p>
          <p className="text-xs text-slate-500">Agora · 🌐</p>
        </div>
      </div>

      {texto && (
        <p className="whitespace-pre-wrap px-3 pb-2 text-sm leading-snug text-slate-800">
          {texto}
        </p>
      )}

      <PreviewMedia
        videoUrl={videos[0]}
        imagens={imagens}
        imageClassName="max-h-56"
        videoClassName="max-h-56"
        mostrarIndicadorCarousel={imagens.length > 1}
      />

      {linkUrl && (
        <div className="border-t border-slate-200 bg-slate-50">
          {temMedia ? null : (
            <div className="flex h-32 items-center justify-center bg-slate-200 text-xs text-slate-500">
              Pré-visualização do link
            </div>
          )}
          <div className="border-t border-slate-200 px-3 py-2">
            <p className="truncate text-[11px] uppercase tracking-wide text-slate-500">
              {dominioLink(linkUrl)}
            </p>
            <p className="truncate text-sm font-semibold text-slate-900">
              {dominioLink(linkUrl)}
            </p>
          </div>
        </div>
      )}

      {!texto && !temMedia && !linkUrl && (
        <p className="px-3 pb-3 text-sm text-slate-400">Sem conteúdo</p>
      )}

      <div className="flex justify-around border-t border-slate-100 px-2 py-1.5 text-xs text-slate-500">
        <span>Gosto</span>
        <span>Comentar</span>
        <span>Partilhar</span>
      </div>
    </div>
  );
}
