import Image from "next/image";
import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-center gap-2 px-3 py-3 sm:flex-row sm:flex-wrap sm:gap-3">
        <p className="text-center text-xs font-medium text-slate-600">Desenvolvido por</p>
        <Link href="https://portic.ipp.pt" target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0">
          <Image
            src="/logos/portic.png"
            alt="PORTIC — Porto Research, Technology and Innovation Center"
            width={140}
            height={44}
            className="h-8 w-auto object-contain"
          />
        </Link>
        <span className="hidden text-slate-300 sm:block" aria-hidden>
          |
        </span>
        <Link
          href="https://www.ipp.pt"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0"
        >
          <Image
            src="/logos/pporto.png"
            alt="P.PORTO — Politécnico do Porto"
            width={160}
            height={38}
            className="h-8 w-auto max-w-[160px] object-contain"
          />
        </Link>
      </div>
    </footer>
  );
}
