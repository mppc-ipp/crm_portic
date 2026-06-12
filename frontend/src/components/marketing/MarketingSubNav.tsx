"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/marketing", label: "Calendário", exact: true },
  { href: "/marketing/publicacoes", label: "Publicações", exact: false },
  { href: "/marketing/publicacoes/nova", label: "Nova publicação", exact: true },
  { href: "/marketing/contas", label: "Contas", exact: true },
];

export default function MarketingSubNav() {
  const pathname = usePathname();

  return (
    <nav className="mb-6 flex flex-wrap gap-2 border-b border-slate-200 pb-3">
      {LINKS.map((link) => {
        const active = link.exact
          ? pathname === link.href
          : pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              active
                ? "bg-portic text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
