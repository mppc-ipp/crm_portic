"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { apiFetch, clearAuthToken, type UserSession } from "@/lib/api";
import { rotaAposLogin } from "@/lib/routes";

export default function HomePage() {
  const router = useRouter();
  const redirected = useRef(false);

  useEffect(() => {
    if (redirected.current) return;
    redirected.current = true;

    apiFetch<UserSession>("/api/auth/me", { redirectOnUnauthorized: false })
      .then((user) => {
        router.replace(rotaAposLogin(user.modulos, user.admin_geral));
      })
      .catch(() => {
        clearAuthToken();
        router.replace("/login");
      });
  }, [router]);

  return <p className="p-8 text-slate-500">A redirecionar…</p>;
}
