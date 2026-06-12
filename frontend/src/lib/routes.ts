/** Rotas públicas (sem sessão obrigatória). */
export const PUBLIC_ROUTES = new Set([
  "/",
  "/login",
  "/cadastro",
  "/esqueci-senha",
  "/esqueci-senha/redefinir",
]);

const CRM_PREFIXES = [
  "/dashboard",
  "/empresas",
  "/startups",
  "/projetos",
  "/marketing",
  "/administrador",
];

export function isPublicRoute(path: string): boolean {
  if (PUBLIC_ROUTES.has(path)) return true;
  if (path.startsWith("/candidatura")) return true;
  return false;
}

export function isCrmRoute(path: string): boolean {
  return CRM_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}

export function isAuthenticatedRoute(path: string): boolean {
  return !isPublicRoute(path);
}

/** Redireciona para o primeiro módulo CRM acessível após login. */
export function rotaAposLogin(modulos: Record<string, boolean>, adminGeral: boolean): string {
  if (adminGeral || modulos.dashboard) return "/dashboard";
  if (modulos.empresas) return "/empresas";
  if (modulos.startups) return "/startups";
  if (modulos.projetos) return "/projetos";
  if (modulos.marketing) return "/marketing";
  if (modulos.administrador) return "/administrador";
  return "/dashboard";
}

export function podeAcederAdmin(modulos: Record<string, boolean>, adminGeral: boolean): boolean {
  return adminGeral || Boolean(modulos.administrador);
}

const ROTA_MODULO: Array<{ prefix: string; modulo: string }> = [
  { prefix: "/dashboard", modulo: "dashboard" },
  { prefix: "/empresas", modulo: "empresas" },
  { prefix: "/startups", modulo: "startups" },
  { prefix: "/projetos", modulo: "projetos" },
  { prefix: "/marketing", modulo: "marketing" },
  { prefix: "/administrador", modulo: "administrador" },
];

/** Verifica se o utilizador pode aceder à rota CRM actual. */
export function podeAcederRota(
  path: string,
  modulos: Record<string, boolean>,
  adminGeral: boolean
): boolean {
  if (adminGeral) return true;
  for (const { prefix, modulo } of ROTA_MODULO) {
    if (path === prefix || path.startsWith(`${prefix}/`)) {
      return Boolean(modulos[modulo]);
    }
  }
  return true;
}

export function rotaFallback(modulos: Record<string, boolean>, adminGeral: boolean): string {
  return rotaAposLogin(modulos, adminGeral);
}
