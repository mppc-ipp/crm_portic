import type { Plataforma } from "./types";
import PlatformBadge from "./PlatformBadge";
import FacebookPreview from "./previews/FacebookPreview";
import InstagramPreview from "./previews/InstagramPreview";
import LinkedInPreview from "./previews/LinkedInPreview";
import TikTokPreview from "./previews/TikTokPreview";

type Props = {
  plataforma: Plataforma;
  nomeConta?: string;
  texto: string;
  linkUrl?: string;
  imagens: string[];
  videos?: string[];
};

const PREVIEWS = {
  FACEBOOK: FacebookPreview,
  INSTAGRAM: InstagramPreview,
  LINKEDIN: LinkedInPreview,
  TIKTOK: TikTokPreview,
} as const;

export default function PostPreview({
  plataforma,
  nomeConta,
  texto,
  linkUrl,
  imagens,
  videos = [],
}: Props) {
  const Preview = PREVIEWS[plataforma];

  return (
    <div className="space-y-2">
      <PlatformBadge plataforma={plataforma} />
      <Preview
        nomeConta={nomeConta}
        texto={texto}
        linkUrl={linkUrl}
        imagens={imagens}
        videos={videos}
      />
    </div>
  );
}
