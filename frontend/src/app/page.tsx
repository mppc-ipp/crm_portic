"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { apiFetch, clearAuthToken, type UserSession } from "@/lib/api";

export default function HomePage() {
  const router = useRouter();
  const redirected = useRef(false);

  useEffect(() => {
    if (redirected.current) return;
    redirected.current = true;

    apiFetch<UserSession>("/api/auth/me", { redirectOnUnauthorized: false })
      .then((user) => {
        if (user.modulos.dashboard) router.replace("/dashboard");
        else if (user.modulos.projetos) router.replace("/projetos");
        else if (user.modulos.empresas) router.replace("/empresas");
        else if (user.modulos.espacos) router.replace("/minhas-reservas");
        else router.replace("/dashboard");
      })
      .catch(() => {
        clearAuthToken();
        router.replace("/login");
      });
  }, [router]);

  return <p className="p-8 text-slate-500">A redirecionar…</p>;
}
