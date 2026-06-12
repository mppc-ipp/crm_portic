"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  modulos: Record<string, boolean>;
  adminGeral: boolean;
};

export default function CrmNav({ modulos, adminGeral }: Props) {
  const pathname = usePathname();

  const podeAdmin = adminGeral || Boolean(modulos.administrador);

  const links: Array<{ href: string; label: string; show: boolean }> = [
    { href: "/dashboard", label: "Dashboard", show: adminGeral || Boolean(modulos.dashboard) },
    { href: "/dashboard/eventos", label: "Eventos", show: adminGeral || Boolean(modulos.dashboard) },
    { href: "/empresas", label: "Empresas", show: adminGeral || Boolean(modulos.empresas) },
    { href: "/startups", label: "Startups", show: adminGeral || Boolean(modulos.startups) },
    { href: "/projetos", label: "Projetos", show: adminGeral || Boolean(modulos.projetos) },
    { href: "/marketing", label: "Marketing", show: adminGeral || Boolean(modulos.marketing) },
    { href: "/administrador", label: "Administração", show: podeAdmin },
  ];

  return (
    <nav className="border-b border-slate-200 bg-[#1e3a5f] text-white">
      <div className="mx-auto flex max-w-[1440px] flex-wrap gap-1 px-4 py-2">
        {links
          .filter((l) => l.show)
          .map((l) => {
            const active =
              l.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname === l.href || pathname.startsWith(`${l.href}/`);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  active ? "bg-white/20 text-white" : "text-white/80 hover:bg-white/10 hover:text-white"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
      </div>
    </nav>
  );
}
