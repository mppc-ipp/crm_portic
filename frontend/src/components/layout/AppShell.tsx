"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { apiFetch, clearAuthToken, type UserSession } from "@/lib/api";
import {
  getModuloConfig,
  isAdminPath,
  moduloEfetivo,
  moduloUnicoInstalado,
  normalizarModulosInstalacao,
  pathModuloInstalado,
  persistModulo,
  rotaPermitida,
} from "@/lib/modulo";
import { isCrmRoute, isEspacosRoute, isPublicRoute } from "@/lib/routes";
import { painelElevadoModulo } from "@/lib/postLogin";
import { AdminModulos, MODULOS_INSTALACAO_PADRAO, ModulosInstalacao, TipoUsuario } from "@/lib/types";
import CrmNav from "./CrmNav";
import ModuleSwitcher from "./ModuleSwitcher";

const superNavItems = [
  { href: "/super-admin/auditoria-geral", label: "Auditoria geral" },
  { href: "/super-admin/utilizadores", label: "Utilizadores" },
  { href: "/super-admin/unidades", label: "Unidades" },
  { href: "/super-admin/modulos", label: "Módulos" },
  { href: "/super-admin/logos", label: "Logos" },
];

type Sessao = UserSession & {
  tipo?: TipoUsuario;
  adminModulos?: AdminModulos;
  modulosInstalacao?: ModulosInstalacao;
};

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isPublic = isPublicRoute(pathname);
  const isLogin = pathname.startsWith("/login");
  const isCrm = isCrmRoute(pathname);
  const isEspacos = isEspacosRoute(pathname);
  const isSuperRoute = pathname.startsWith("/super-admin");
  const isAdminRoute = isAdminPath(pathname);

  const [user, setUser] = useState<Sessao | null>(null);
  const [modulosInstalacao, setModulosInstalacao] = useState<ModulosInstalacao>(MODULOS_INSTALACAO_PADRAO);
  const [checking, setChecking] = useState(!isPublic && !isLogin);

  const modulo = moduloEfetivo(pathname, modulosInstalacao);
  const cfg = getModuloConfig(modulo);
  const tipo = user?.tipo ?? null;
  const adminModulos = user?.adminModulos ?? { salas: false, viaturas: false };
  const modulos = user?.modulos ?? {};

  const commonNavItems = useMemo(
    () => [{ href: cfg.minhasReservasPath, label: cfg.minhasReservasLabel }],
    [cfg.minhasReservasPath, cfg.minhasReservasLabel]
  );

  const adminNavItems = useMemo(() => {
    const labels = cfg.adminNavLabels;
    return [
      { href: cfg.adminReservasPath, label: labels.reservas },
      { href: cfg.adminCalendarioPath, label: labels.calendario },
      { href: cfg.adminHistoricoPath, label: labels.historico },
      { href: cfg.adminEstatisticasPath, label: labels.estatisticas },
      { href: cfg.adminAuditoriaPath, label: labels.auditoria },
      { href: cfg.adminLocalizacoesPath, label: labels.localizacao },
      { href: cfg.adminGestaoPath, label: labels.gestao },
    ];
  }, [cfg]);

  useEffect(() => {
    if (isPublic || isLogin) {
      setChecking(false);
      void apiFetch<ModulosInstalacao>("/api/config/modulos", { redirectOnUnauthorized: false })
        .then((m) => setModulosInstalacao(normalizarModulosInstalacao(m)))
        .catch(() => setModulosInstalacao(MODULOS_INSTALACAO_PADRAO));
      return;
    }

    let alive = true;
    const load = async () => {
      try {
        const me = await apiFetch<Sessao>("/api/auth/me", { redirectOnUnauthorized: false });
        if (!alive) return;
        setUser(me);
        const instalacao = normalizarModulosInstalacao(me.modulosInstalacao);
        setModulosInstalacao(instalacao);

        // Rotas CRM: só exigem sessão válida — sem redirecionamentos do módulo salas
        if (isCrm) {
          setChecking(false);
          return;
        }

        // Rotas de espaços: lógica do reserva_sala_portic
        if (isEspacos || isSuperRoute) {
          const moduloAtual = moduloEfetivo(pathname, instalacao);
          const cfgAtual = getModuloConfig(moduloAtual);
          if (isSuperRoute && me.tipo !== "SUPER_ADMIN") {
            router.replace("/dashboard");
            return;
          }
          if (!rotaPermitida(pathname, instalacao)) {
            const adminDestino =
              isAdminRoute && painelElevadoModulo(me.tipo!, moduloAtual, me.adminModulos, instalacao);
            router.replace(pathModuloInstalado(instalacao, Boolean(adminDestino)));
            return;
          }
          if (isAdminRoute && !painelElevadoModulo(me.tipo!, moduloAtual, me.adminModulos, instalacao)) {
            router.replace(cfgAtual.minhasReservasPath);
            return;
          }
        }
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
  }, [pathname, isPublic, isLogin, isCrm, isEspacos, isSuperRoute, isAdminRoute, router]);

  useEffect(() => {
    if (isPublic || isLogin || checking || isCrm) return;
    if ((isEspacos || isSuperRoute) && !rotaPermitida(pathname, modulosInstalacao)) {
      const adminDestino = isAdminRoute && tipo && painelElevadoModulo(tipo, modulo, adminModulos, modulosInstalacao);
      router.replace(pathModuloInstalado(modulosInstalacao, Boolean(adminDestino)));
    }
  }, [pathname, modulosInstalacao, isPublic, isLogin, checking, isCrm, isEspacos, isSuperRoute, isAdminRoute, tipo, modulo, adminModulos, router]);

  useEffect(() => {
    if (isPublic || isLogin || isCrm) return;
    const unico = moduloUnicoInstalado(modulosInstalacao);
    if (unico) {
      persistModulo(unico);
      return;
    }
    if (pathname.startsWith("/viaturas")) persistModulo("viaturas");
    else if (isEspacos) persistModulo("salas");
  }, [pathname, isPublic, isLogin, isCrm, isEspacos, modulosInstalacao]);

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

  // Layout CRM — barra superior com todos os módulos
  if (isCrm) {
    return (
      <div className="logged-area flex flex-1 flex-col bg-slate-50">
        <CrmNav modulos={modulos} adminGeral={Boolean(user?.admin_geral)} />
        <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6">{children}</main>
      </div>
    );
  }

  // Layout espaços — sidebar estilo reserva_sala_portic
  const showAdminNav = tipo && painelElevadoModulo(tipo, modulo, adminModulos, modulosInstalacao);
  const showSuperNav = tipo === "SUPER_ADMIN";
  const viaturasTheme = modulo === "viaturas";

  return (
    <div className="logged-area flex-1 bg-white">
      <CrmNav modulos={modulos} adminGeral={Boolean(user?.admin_geral)} />
      <div className="mx-auto max-w-[1440px] p-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <aside className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:col-span-3">
            <ModuleSwitcher tipo={tipo} adminModulos={adminModulos} modulosInstalacao={modulosInstalacao} />
            <nav className="grid gap-3">
              <div>
                <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Painel do utilizador
                </p>
                <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-1">
                  {commonNavItems.map((item) => {
                    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`block rounded-xl px-3 py-2 text-sm transition ${
                          active ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
              {showAdminNav && (
                <div className="border-t border-slate-200 pt-3">
                  <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Painel da unidade
                  </p>
                  <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-1">
                    {adminNavItems.map((item) => {
                      const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`block rounded-xl px-3 py-2 text-sm transition ${
                            active ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
              {showSuperNav && (
                <div className="border-t border-slate-200 pt-3">
                  <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Super administrador
                  </p>
                  <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-1">
                    {superNavItems.map((item) => {
                      const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`block rounded-xl px-3 py-2 text-sm transition ${
                            active ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </nav>
          </aside>
          <main
            className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-9 ${
              viaturasTheme ? "modulo-viaturas" : ""
            }`}
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
