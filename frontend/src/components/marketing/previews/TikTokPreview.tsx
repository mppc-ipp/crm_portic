import PreviewMedia from "./PreviewMedia";
import { NOMES_PADRAO } from "./utils";

type Props = {
  nomeConta?: string;
  texto: string;
  imagens: string[];
  videos?: string[];
};

export default function TikTokPreview({
  nomeConta,
  texto,
  imagens,
  videos = [],
}: Props) {
  const nome = nomeConta || NOMES_PADRAO.TIKTOK;
  const handle = nome.startsWith("@") ? nome : `@${nome.replace(/\s+/g, "_").toLowerCase()}`;
  const temMedia = Boolean(videos[0] || imagens[0]);

  return (
    <div className="mx-auto max-w-[220px] overflow-hidden rounded-2xl border border-slate-300 bg-black shadow-lg">
      <div className="relative aspect-[9/16] w-full">
        {temMedia ? (
          <PreviewMedia
            videoUrl={videos[0]}
            imagens={imagens}
            className="absolute inset-0 h-full"
            imageClassName="h-full"
            videoClassName="h-full"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-slate-900 text-center text-xs text-slate-500">
            Adicione um vídeo
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

        <div className="absolute bottom-0 left-0 right-10 p-3">
          <p className="text-sm font-semibold text-white">{handle}</p>
          <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-xs text-white/90">
            {texto || "Descrição do vídeo…"}
          </p>
          <p className="mt-2 text-[10px] text-white/60">♫ Som original</p>
        </div>

        <div className="absolute bottom-4 right-2 flex flex-col items-center gap-3 text-white">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-lg">
            ♡
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-lg">
            💬
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-lg">
            ↗
          </div>
        </div>
      </div>
    </div>
  );
}
