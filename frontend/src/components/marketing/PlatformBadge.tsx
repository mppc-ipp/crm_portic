import type { Plataforma } from "./types";

const STYLES: Record<Plataforma, string> = {
  FACEBOOK: "bg-blue-600 text-white",
  INSTAGRAM: "bg-gradient-to-r from-purple-600 to-pink-500 text-white",
  LINKEDIN: "bg-sky-800 text-white",
  TIKTOK: "bg-black text-white",
};

const LABELS: Record<Plataforma, string> = {
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  LINKEDIN: "LinkedIn",
  TIKTOK: "TikTok",
};

export default function PlatformBadge({ plataforma }: { plataforma: Plataforma }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STYLES[plataforma]}`}
    >
      {LABELS[plataforma]}
    </span>
  );
}
