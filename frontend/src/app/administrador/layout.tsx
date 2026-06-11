"use client";

import { useRouter, usePathname } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { apiFetch, type UserSession } from "@/lib/api";
import { podeAcederAdmin } from "@/lib/routes";

export default function AdministradorLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<UserSession | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let alive = true;
    apiFetch<UserSession>("/api/auth/me")
      .then((me) => {
        if (!alive) return;
        if (!podeAcederAdmin(me.modulos, me.admin_geral)) {
          router.replace("/dashboard");
          return;
        }
        const techOnly =
          pathname.startsWith("/administrador/auditoria") ||
          pathname.startsWith("/administrador/modulos") ||
          pathname.startsWith("/administrador/sistema");
        if (techOnly && !me.admin_geral) {
          router.replace("/administrador/utilizadores");
          return;
        }
        setUser(me);
        setChecking(false);
      })
      .catch(() => {
        if (alive) router.replace("/login");
      });
    return () => {
      alive = false;
    };
  }, [router, pathname]);

  if (checking) {
    return <p className="text-sm text-slate-500">A verificar permissões…</p>;
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Administração</h1>
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <AdminSidebar adminGeral={Boolean(user?.admin_geral)} />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
