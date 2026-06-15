/**
 * API client — backend Django.
 */
function resolveApiBase(): string {
  if (typeof window !== "undefined") {
    return (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8002").replace(/\/$/, "");
  }
  return (process.env.API_INTERNAL_URL ?? "http://localhost:8002").replace(/\/$/, "");
}

export const API_URL = resolveApiBase();

const AUTH_TOKEN_KEY = "portic_auth_token";
const AUTH_REJECTION_HANDLER_KEY = "__porticAuthUnhandledInstalled";

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function ensureAuthUnhandledRejectionHandler() {
  if (typeof window === "undefined") return;
  const w = window as Window & { [AUTH_REJECTION_HANDLER_KEY]?: boolean };
  if (w[AUTH_REJECTION_HANDLER_KEY]) return;
  window.addEventListener("unhandledrejection", (event) => {
    const message =
      event.reason instanceof Error ? event.reason.message : typeof event.reason === "string" ? event.reason : "";
    if (normalizeText(message).includes("nao autenticado")) {
      event.preventDefault();
      clearAuthToken();
      if (window.location.pathname !== "/login") {
        window.location.replace("/login");
      }
    }
  });
  w[AUTH_REJECTION_HANDLER_KEY] = true;
}

export function setAuthToken(token: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearAuthToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
  window.localStorage.removeItem("portic_user");
}

export function getAuthToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(AUTH_TOKEN_KEY);
}

export function withAuthHeaders(headers?: HeadersInit, body?: BodyInit | null): Headers {
  const nextHeaders = new Headers(headers ?? {});
  const token = getAuthToken();
  if (token && !nextHeaders.has("Authorization")) {
    nextHeaders.set("Authorization", `Bearer ${token}`);
  }
  if (body !== undefined && body !== null && !(body instanceof FormData)) {
    if (!nextHeaders.has("Content-Type")) nextHeaders.set("Content-Type", "application/json");
  }
  return nextHeaders;
}

export type ApiFetchOptions = RequestInit & {
  redirectOnUnauthorized?: boolean;
};

function buildUrl(path: string): string {
  if (path.startsWith("http")) return path;
  const base = resolveApiBase();
  const normalized = path.startsWith("/") ? path : `/api/${path}`;
  return `${base}${normalized}`;
}

export async function apiFetch<T>(path: string, init?: ApiFetchOptions): Promise<T> {
  const { redirectOnUnauthorized = true, ...requestInit } = init ?? {};
  ensureAuthUnhandledRejectionHandler();
  const headers = withAuthHeaders(requestInit.headers, requestInit.body ?? null);
  const method = (requestInit.method ?? "GET").toUpperCase();

  const url = buildUrl(path);
  let res: Response;
  try {
    res = await fetch(url, {
      ...requestInit,
      headers,
      cache: method === "GET" ? "no-store" : requestInit.cache,
    });
  } catch {
    const hint =
      typeof window !== "undefined"
        ? " Verifique se o backend está a correr em http://localhost:8002 (docker compose up)."
        : "";
    throw new Error(`Não foi possível contactar a API (${url}).${hint}`);
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Erro inesperado" }));
    const errorMessage = normalizeText(String(err.error ?? err.detail ?? ""));
    const isUnauthorized = res.status === 401 || errorMessage.includes("nao autenticado");
    if (isUnauthorized) {
      if (redirectOnUnauthorized) clearAuthToken();
      if (redirectOnUnauthorized && typeof window !== "undefined") {
        if (!window.location.pathname.startsWith("/login")) {
          window.location.replace("/login");
        }
        return new Promise<T>(() => {});
      }
      throw new Error(err.error ?? "Nao autenticado");
    }
    throw new Error(err.error ?? err.detail ?? "Falha no pedido");
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  if (!text.trim()) return undefined as T;

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Resposta inválida da API (${url}).`);
  }
}

export async function login(email: string, password: string) {
  const data = await apiFetch<{ token: string; user: UserSession }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    redirectOnUnauthorized: false,
  });
  setAuthToken(data.token);
  if (typeof window !== "undefined") {
    localStorage.setItem("portic_user", JSON.stringify(data.user));
  }
  return data;
}

export type UserSession = {
  id: number | string;
  username: string;
  nome: string;
  email?: string;
  modulos: Record<string, boolean>;
  admin_geral: boolean;
  permissoes?: {
    gerir_eventos?: boolean;
  };
  is_superuser?: boolean;
  is_staff?: boolean;
  grupos?: string[];
  tipo?: string;
};

export function getStoredUser(): UserSession | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("portic_user");
  if (!raw?.trim()) return null;
  try {
    return JSON.parse(raw) as UserSession;
  } catch {
    localStorage.removeItem("portic_user");
    return null;
  }
}
