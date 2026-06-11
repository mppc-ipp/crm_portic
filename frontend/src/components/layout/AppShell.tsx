"use client";

import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { apiFetch, clearAuthToken, type UserSession } from "@/lib/api";
import { isCrmRoute, isPublicRoute, podeAcederRota, rotaFallback } from "@/lib/routes";
import CrmNav from "./CrmNav";

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isPublic = isPublicRoute(pathname);
  const isLogin = pathname.startsWith("/login");
  const isCrm = isCrmRoute(pathname);

  const [user, setUser] = useState<UserSession | null>(null);
  const [checking, setChecking] = useState(!isPublic && !isLogin);

  useEffect(() => {
    if (isPublic || isLogin) {
      setChecking(false);
      return;
    }

    let alive = true;
    const load = async () => {
      try {
        const me = await apiFetch<UserSession>("/api/auth/me", { redirectOnUnauthorized: false });
        if (!alive) return;
        if (isCrm && !podeAcederRota(pathname, me.modulos, me.admin_geral)) {
          router.replace(rotaFallback(me.modulos, me.admin_geral));
          return;
        }
        setUser(me);
        setChecking(false);
      } catch (err) {
        if (!alive) return;
        const msg = err instanceof Error ? err.message : "";
        const authFailed = /nao autenticado|401|credenciais/i.test(msg);
        if (authFailed) {
          clearAuthToken();
          router.replace("/login");
        } else {
          setChecking(false);
        }
      }
    };
    setChecking(true);
    void load();
    return () => {
      alive = false;
    };
  }, [pathname, isPublic, isLogin, isCrm, router]);

  if (isPublic || isLogin) {
    return <div className="flex-1 bg-white">{children}</div>;
  }

  if (checking) {
    return (
      <div className="flex flex-1 items-center justify-center text-slate-500 text-sm">
        A verificar sessão…
      </div>
    );
  }

  if (isCrm) {
    return (
      <div className="logged-area flex flex-1 flex-col bg-slate-50">
        <CrmNav modulos={user?.modulos ?? {}} adminGeral={Boolean(user?.admin_geral)} />
        <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6">{children}</main>
      </div>
    );
  }

  return (
    <div className="logged-area flex flex-1 flex-col bg-slate-50">
      <CrmNav modulos={user?.modulos ?? {}} adminGeral={Boolean(user?.admin_geral)} />
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
