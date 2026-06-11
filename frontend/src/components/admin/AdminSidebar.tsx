"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  adminGeral: boolean;
};

const sistemaItems = [
  { href: "/administrador/utilizadores", label: "Utilizadores" },
  { href: "/administrador/grupos", label: "Grupos" },
  { href: "/administrador/configuracao", label: "Configuração CRM" },
];

const techItems = [
  { href: "/administrador/sistema", label: "Sistema e segurança" },
  { href: "/administrador/auditoria", label: "Auditoria" },
  { href: "/administrador/modulos", label: "Módulos" },
];

export default function AdminSidebar({ adminGeral }: Props) {
  const pathname = usePathname();

  function linkClass(href: string) {
    const active = pathname === href || pathname.startsWith(`${href}/`);
    return `block rounded-lg px-3 py-2 text-sm transition ${
      active ? "bg-portic text-white" : "text-slate-700 hover:bg-slate-100"
    }`;
  }

  return (
    <aside className="rounded-xl border bg-white p-4 lg:sticky lg:top-4">
      <h2 className="mb-3 px-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Administração do sistema
      </h2>
      <nav className="mb-4 grid gap-1">
        {sistemaItems.map((item) => (
          <Link key={item.href} href={item.href} className={linkClass(item.href)}>
            {item.label}
          </Link>
        ))}
      </nav>
      {adminGeral && (
        <>
          <h2 className="mb-3 border-t pt-4 px-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Administração tecnológica
          </h2>
          <nav className="grid gap-1">
            {techItems.map((item) => (
              <Link key={item.href} href={item.href} className={linkClass(item.href)}>
                {item.label}
              </Link>
            ))}
          </nav>
        </>
      )}
    </aside>
  );
}
