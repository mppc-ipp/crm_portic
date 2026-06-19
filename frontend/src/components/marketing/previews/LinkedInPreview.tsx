import PreviewMedia from "./PreviewMedia";
import { dominioLink, inicialNome, NOMES_PADRAO } from "./utils";

type Props = {
  nomeConta?: string;
  texto: string;
  linkUrl?: string;
  imagens: string[];
  videos?: string[];
};

export default function LinkedInPreview({
  nomeConta,
  texto,
  linkUrl,
  imagens,
  videos = [],
}: Props) {
  const nome = nomeConta || NOMES_PADRAO.LINKEDIN;
  const temMedia = Boolean(videos[0] || imagens[0]);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="flex items-start gap-2 px-3 py-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-sky-800 text-sm font-bold text-white">
          {inicialNome(nome)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{nome}</p>
          <p className="text-xs text-slate-500">1.234 seguidores</p>
          <p className="text-xs text-slate-500">Agora · 🌐</p>
        </div>
      </div>

      <p className="whitespace-pre-wrap px-3 pb-3 text-sm leading-relaxed text-slate-800">
        {texto || <span className="text-slate-400">Texto da publicação…</span>}
      </p>

      <PreviewMedia
        videoUrl={videos[0]}
        imagens={imagens}
        imageClassName="max-h-48"
        videoClassName="max-h-48"
        mostrarIndicadorCarousel={imagens.length > 1}
      />

      {linkUrl && (
        <div className="mx-3 mb-3 overflow-hidden rounded border border-slate-200">
          {!temMedia && (
            <div className="flex h-24 items-center justify-center bg-slate-100 text-xs text-slate-500">
              Pré-visualização do artigo
            </div>
          )}
          <div className="bg-slate-50 px-3 py-2">
            <p className="truncate text-sm font-semibold text-slate-900">
              {dominioLink(linkUrl)}
            </p>
            <p className="truncate text-xs text-slate-500">{linkUrl}</p>
          </div>
        </div>
      )}

      <div className="flex justify-around border-t border-slate-100 px-2 py-2 text-xs font-medium text-slate-500">
        <span>Gosto</span>
        <span>Comentar</span>
        <span>Partilhar</span>
        <span>Enviar</span>
      </div>
    </div>
  );
}
