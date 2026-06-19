import PreviewMedia from "./PreviewMedia";
import { inicialNome, NOMES_PADRAO } from "./utils";

type Props = {
  nomeConta?: string;
  texto: string;
  imagens: string[];
  videos?: string[];
};

export default function InstagramPreview({
  nomeConta,
  texto,
  imagens,
  videos = [],
}: Props) {
  const nome = nomeConta || NOMES_PADRAO.INSTAGRAM;
  const temMedia = Boolean(videos[0] || imagens[0]);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[2px]">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-xs font-bold text-slate-700">
              {inicialNome(nome)}
            </div>
          </div>
          <p className="text-sm font-semibold text-slate-900">{nome}</p>
        </div>
        <span className="text-lg leading-none text-slate-700">···</span>
      </div>

      <PreviewMedia
        videoUrl={videos[0]}
        imagens={imagens}
        imageClassName="aspect-square"
        videoClassName="aspect-square"
        mostrarIndicadorCarousel={imagens.length > 1}
      />

      {!temMedia && (
        <div className="flex aspect-square items-center justify-center bg-slate-100 text-sm text-slate-400">
          Adicione uma imagem ou vídeo
        </div>
      )}

      <div className="flex gap-3 px-3 py-2 text-xl">
        <span>♡</span>
        <span>💬</span>
        <span>➤</span>
      </div>

      <div className="px-3 pb-3">
        <p className="text-sm">
          <span className="font-semibold text-slate-900">{nome}</span>{" "}
          <span className="whitespace-pre-wrap text-slate-800">
            {texto || <span className="text-slate-400">Legenda…</span>}
          </span>
        </p>
      </div>
    </div>
  );
}
