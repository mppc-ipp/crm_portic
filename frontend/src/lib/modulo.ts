export type ModuloReserva = "salas" | "viaturas";

export type ModuloConfig = {
  id: ModuloReserva;
  apiAdminHistorico: string;
  apiAdminEstatisticas: string;
  apiAdminAuditoria: string;
  apiAdminReservas: string;
};

export const MODULO_SALAS: ModuloConfig = {
  id: "salas",
  apiAdminHistorico: "/api/admin/historico",
  apiAdminEstatisticas: "/api/admin/estatisticas",
  apiAdminAuditoria: "/api/espacos/admin/auditoria",
  apiAdminReservas: "/api/admin/reservas",
};

export const MODULO_VIATURAS: ModuloConfig = {
  id: "viaturas",
  apiAdminHistorico: "/api/admin/historico-viatura",
  apiAdminEstatisticas: "/api/admin/estatisticas-viatura",
  apiAdminAuditoria: "/api/admin/auditoria-viatura",
  apiAdminReservas: "/api/admin/reservas-viatura",
};

export function getModuloConfig(modulo: ModuloReserva): ModuloConfig {
  return modulo === "viaturas" ? MODULO_VIATURAS : MODULO_SALAS;
}

export function moduloFromPathname(path: string): ModuloReserva {
  return path.startsWith("/viaturas") ? "viaturas" : "salas";
}
