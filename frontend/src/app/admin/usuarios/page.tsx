"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import type { SessaoUtilizador } from "@/lib/types";

export default function AdminUsuariosRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    apiFetch<SessaoUtilizador>("/api/auth/me")
      .then((u) => {
        if (u.tipo === "SUPER_ADMIN") router.replace("/super-admin/utilizadores");
        else router.replace("/admin/reservas");
      })
      .catch(() => router.replace("/login"));
  }, [router]);
  return (
    <main className="mx-auto max-w-lg p-8 text-center text-sm text-slate-600">
      A redirecionar…
    </main>
  );
}
