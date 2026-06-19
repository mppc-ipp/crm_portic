"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch, logout } from "@/lib/api";
import { Button } from "@/components/ui/ui";

export default function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [autenticado, setAutenticado] = useState<boolean | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let alive = true;
    const check = async (attempt = 1) => {
      try {
        await apiFetch("/api/auth/me", { redirectOnUnauthorized: false });
        if (alive) setAutenticado(true);
      } catch {
        if (!alive) return;
        if (attempt === 1) {
          window.setTimeout(() => {
            if (alive) void check(2);
          }, 450);
          return;
        }
        if (alive) setAutenticado(false);
      }
    };
    setAutenticado(null);
    void check();
    return () => {
      alive = false;
    };
  }, [pathname]);

  const mostrarSair = autenticado === true;
  const mostrarEntrar = autenticado === false && pathname !== "/" && pathname !== "/login";

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3">
        <Link href={autenticado ? "/dashboard" : "/login"} className="flex min-w-0 flex-1 items-center gap-3 text-black sm:flex-initial">
          <span className="flex h-12 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white px-2 py-1 sm:h-14 sm:px-3">
            <Image
              src="/logos/pporto.png"
              alt="P.PORTO — Politécnico do Porto"
              width={220}
              height={48}
              className="h-9 w-auto max-w-[min(52vw,220px)] object-contain object-left sm:h-10"
              priority
            />
          </span>
          <span className="min-w-0 text-base font-black tracking-tight text-black sm:text-lg md:text-xl">
            CRM Portic
          </span>
        </Link>
        <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
          <span className="hidden text-xs text-slate-600 sm:inline md:text-sm">Gestão interna Portic</span>
          {mostrarEntrar && (
            <Link
              href="/login"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              Iniciar sessão
            </Link>
          )}
          {mostrarSair && (
            <Button
              variant="secondary"
              className="px-3 py-1.5"
              disabled={loggingOut}
              onClick={() => {
                setLoggingOut(true);
                void logout().finally(() => {
                  router.push("/login");
                  setLoggingOut(false);
                });
              }}
            >
              Sair
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
