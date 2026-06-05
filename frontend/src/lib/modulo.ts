import type { ModulosInstalacao } from "@/lib/types";
import { MODULOS_INSTALACAO_PADRAO } from "@/lib/types";

export type ModuloReserva = "salas" | "viaturas";

export type ModuloConfig = {
  id: ModuloReserva;
  label: string;
  basePath: string;
  catalogPath: string;
  catalogLabel: string;
  gestaoRecursoLabel: string;
  recursoSingular: string;
  apiCatalog: string;
  apiCatalogItem: (id: string) => string;
  apiMinhasReservas: string;
  apiReservas: string;
  apiReserva: (id: string) => string;
  apiCalendario: string;
  apiAdminRecursos: string;
  apiAdminLocalizacoes: string;
  apiAdminReservas: string;
  apiAdminHistorico: string;
  apiAdminEstatisticas: string;
  apiAdminAuditoria: string;
  adminReservasPath: string;
  adminCalendarioPath: string;
  adminHistoricoPath: string;
  adminEstatisticasPath: string;
  adminAuditoriaPath: string;
  adminLocalizacoesPath: string;
  adminGestaoPath: string;
  minhasReservasPath: string;
  minhasReservasLabel: string;
  adminNavLabels: {
    reservas: string;
    calendario: string;
    historico: string;
    estatisticas: string;
    auditoria: string;
    localizacao: string;
    gestao: string;
  };
};

const MENU_MINHAS_RESERVAS_LABEL = "Minhas Reservas";

const MENU_ADMIN_NAV_LABELS = {
  reservas: "Gestão de Reservas",
  calendario: "Calendário",
  historico: "Histórico",
  estatisticas: "Estatísticas",
  auditoria: "Auditoria",
  localizacao: "Localização"
} as const;

export const MODULO_SALAS: ModuloConfig = {
  id: "salas",
  label: "Salas",
  basePath: "",
  catalogPath: "/salas",
  catalogLabel: "Salas",
  gestaoRecursoLabel: "Gestão de Sala",
  recursoSingular: "Sala",
  apiCatalog: "/api/salas",
  apiCatalogItem: (id) => `/api/salas/${id}`,
  apiMinhasReservas: "/api/minhas-reservas",
  apiReservas: "/api/reservas",
  apiReserva: (id) => `/api/reservas/${id}`,
  apiCalendario: "/api/calendario",
  apiAdminRecursos: "/api/admin/salas",
  apiAdminLocalizacoes: "/api/admin/localizacoes",
  apiAdminReservas: "/api/admin/reservas",
  apiAdminHistorico: "/api/admin/historico",
  apiAdminEstatisticas: "/api/admin/estatisticas",
  apiAdminAuditoria: "/api/admin/auditoria",
  adminReservasPath: "/admin/reservas",
  adminCalendarioPath: "/admin/calendario",
  adminHistoricoPath: "/admin/historico",
  adminEstatisticasPath: "/admin/estatisticas",
  adminAuditoriaPath: "/admin/auditoria",
  adminLocalizacoesPath: "/admin/localizacoes",
  adminGestaoPath: "/admin/salas",
  minhasReservasPath: "/minhas-reservas",
  minhasReservasLabel: MENU_MINHAS_RESERVAS_LABEL,
  adminNavLabels: {
    ...MENU_ADMIN_NAV_LABELS,
    gestao: "Gestão de Sala"
  }
};

export const MODULO_VIATURAS: ModuloConfig = {
  id: "viaturas",
  label: "Viaturas",
  basePath: "/viaturas",
  catalogPath: "/viaturas/viaturas",
  catalogLabel: "Viaturas",
  gestaoRecursoLabel: "Gestão de Viatura",
  recursoSingular: "Viatura",
  apiCatalog: "/api/viaturas",
  apiCatalogItem: (id) => `/api/viaturas/${id}`,
  apiMinhasReservas: "/api/viaturas/minhas-reservas",
  apiReservas: "/api/viaturas/reservas",
  apiReserva: (id) => `/api/viaturas/reservas/${id}`,
  apiCalendario: "/api/viaturas/calendario",
  apiAdminRecursos: "/api/admin/viaturas",
  apiAdminLocalizacoes: "/api/admin/localizacoes-viatura",
  apiAdminReservas: "/api/admin/reservas-viatura",
  apiAdminHistorico: "/api/admin/historico-viatura",
  apiAdminEstatisticas: "/api/admin/estatisticas-viatura",
  apiAdminAuditoria: "/api/admin/auditoria-viatura",
  adminReservasPath: "/viaturas/admin/reservas",
  adminCalendarioPath: "/viaturas/admin/calendario",
  adminHistoricoPath: "/viaturas/admin/historico",
  adminEstatisticasPath: "/viaturas/admin/estatisticas",
  adminAuditoriaPath: "/viaturas/admin/auditoria",
  adminLocalizacoesPath: "/viaturas/admin/localizacoes",
  adminGestaoPath: "/viaturas/admin/viaturas",
  minhasReservasPath: "/viaturas/minhas-reservas",
  minhasReservasLabel: MENU_MINHAS_RESERVAS_LABEL,
  adminNavLabels: {
    ...MENU_ADMIN_NAV_LABELS,
    gestao: "Gestão de Viatura"
  }
};

export function getModuloConfig(modulo: ModuloReserva): ModuloConfig {
  return modulo === "viaturas" ? MODULO_VIATURAS : MODULO_SALAS;
}

const STORAGE_KEY = "portic_ultimo_modulo";

export function persistModulo(modulo: ModuloReserva): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, modulo);
}

export function readUltimoModulo(): ModuloReserva {
  if (typeof window === "undefined") return "salas";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "viaturas" ? "viaturas" : "salas";
}

/** Módulo ativo na UI (super-admin usa último módulo guardado). */
export function moduloAtivo(pathname: string): ModuloReserva {
  if (pathname.startsWith("/viaturas")) return "viaturas";
  if (pathname.startsWith("/super-admin")) return readUltimoModulo();
  return "salas";
}

export function moduloFromPathname(path: string): ModuloReserva {
  return moduloAtivo(path);
}

const ROUTE_MAP: Array<[string, string]> = [
  ["/minhas-reservas", "/viaturas/minhas-reservas"],
  ["/salas", "/viaturas/viaturas"],
  ["/admin/reservas", "/viaturas/admin/reservas"],
  ["/admin/calendario", "/viaturas/admin/calendario"],
  ["/admin/historico", "/viaturas/admin/historico"],
  ["/admin/estatisticas", "/viaturas/admin/estatisticas"],
  ["/admin/auditoria", "/viaturas/admin/auditoria"],
  ["/admin/localizacoes", "/viaturas/admin/localizacoes"],
  ["/admin/salas", "/viaturas/admin/viaturas"]
];

/** Destino ao mudar de módulo no interruptor da sidebar. */
export function pathAoMudarModulo(pathname: string, target: ModuloReserva, adminNoModuloDestino: boolean): string {
  const cfg = getModuloConfig(target);
  if (pathname.startsWith("/super-admin")) {
    return adminNoModuloDestino ? cfg.adminReservasPath : cfg.minhasReservasPath;
  }
  const origem = moduloAtivo(pathname);
  if (origem === target) return pathname;
  if (isAdminPath(pathname) && adminNoModuloDestino) {
    return equivalentPath(pathname, target);
  }
  return cfg.minhasReservasPath;
}

export function equivalentPath(path: string, target: ModuloReserva): string {
  const current = moduloAtivo(path);
  if (current === target) return path;
  if (target === "viaturas") {
    for (const [salas, viaturas] of ROUTE_MAP) {
      if (path === salas || path.startsWith(`${salas}/`)) {
        return path.replace(salas, viaturas);
      }
    }
    return "/viaturas/minhas-reservas";
  }
  for (const [salas, viaturas] of ROUTE_MAP) {
    if (path === viaturas || path.startsWith(`${viaturas}/`)) {
      return path.replace(viaturas, salas);
    }
  }
  return "/minhas-reservas";
}

export function isAdminPath(path: string): boolean {
  return path.startsWith("/admin") || path.startsWith("/viaturas/admin");
}

export function normalizarModulosInstalacao(cfg?: ModulosInstalacao | null): ModulosInstalacao {
  return cfg ?? MODULOS_INSTALACAO_PADRAO;
}

export function moduloUnicoInstalado(cfg: ModulosInstalacao): ModuloReserva | null {
  if (cfg.salas && !cfg.viaturas) return "salas";
  if (!cfg.salas && cfg.viaturas) return "viaturas";
  return null;
}

export function moduloEfetivo(pathname: string, cfg: ModulosInstalacao): ModuloReserva {
  const unico = moduloUnicoInstalado(cfg);
  if (unico) return unico;
  return moduloAtivo(pathname);
}

export function pathModuloInstalado(cfg: ModulosInstalacao, admin = false): string {
  const unico = moduloUnicoInstalado(cfg);
  if (unico) {
    const c = getModuloConfig(unico);
    return admin ? c.adminReservasPath : c.minhasReservasPath;
  }
  const c = getModuloConfig("salas");
  return admin ? c.adminReservasPath : c.minhasReservasPath;
}

export function rotaPermitida(pathname: string, cfg: ModulosInstalacao): boolean {
  if (pathname.startsWith("/super-admin")) return true;
  if (
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/cadastro") ||
    pathname.startsWith("/esqueci-senha") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/empresas") ||
    pathname.startsWith("/startups") ||
    pathname.startsWith("/projetos") ||
    pathname.startsWith("/administrador") ||
    pathname.startsWith("/candidatura") ||
    pathname.startsWith("/espacos")
  ) {
    return true;
  }
  if (pathname.startsWith("/viaturas") && !cfg.viaturas) return false;
  if (!pathname.startsWith("/viaturas") && !cfg.salas) {
    if (pathname.startsWith("/admin") || pathname.startsWith("/salas") || pathname === "/minhas-reservas" || pathname.startsWith("/minhas-reservas/")) {
      return false;
    }
  }
  return true;
}

export function mostrarInterruptorModulos(cfg: ModulosInstalacao): boolean {
  return cfg.salas && cfg.viaturas;
}
