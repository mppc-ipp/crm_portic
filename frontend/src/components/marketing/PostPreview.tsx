import type { Plataforma } from "./types";
import PlatformBadge from "./PlatformBadge";

type Props = {
  plataforma: Plataforma;
  texto: string;
  linkUrl?: string;
  imagens: string[];
};

export default function PostPreview({ plataforma, texto, linkUrl, imagens }: Props) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="mb-2">
        <PlatformBadge plataforma={plataforma} />
      </div>
      {imagens[0] && (
        <img
          src={imagens[0]}
          alt="Pré-visualização"
          className="mb-2 max-h-40 w-full rounded-lg object-cover"
        />
      )}
      <p className="whitespace-pre-wrap text-sm text-slate-700">{texto || "Sem texto"}</p>
      {linkUrl && plataforma === "FACEBOOK" && (
        <p className="mt-2 truncate text-xs text-blue-600">{linkUrl}</p>
      )}
    </div>
  );
}
