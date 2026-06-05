/** Rotas públicas (sem sessão obrigatória). */
export const PUBLIC_ROUTES = new Set([
  "/",
  "/login",
  "/cadastro",
  "/esqueci-senha",
  "/esqueci-senha/redefinir",
]);

const CRM_PREFIXES = ["/dashboard", "/empresas", "/startups", "/projetos", "/administrador"];

const ESPACOS_PREFIXES = [
  "/salas",
  "/minhas-reservas",
  "/admin",
  "/viaturas",
  "/espacos",
];

export function isPublicRoute(path: string): boolean {
  if (PUBLIC_ROUTES.has(path)) return true;
  if (path.startsWith("/candidatura")) return true;
  return false;
}

export function isCrmRoute(path: string): boolean {
  return CRM_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}

export function isEspacosRoute(path: string): boolean {
  return ESPACOS_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}
