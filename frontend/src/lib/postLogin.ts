import { pathModuloInstalado } from "@/lib/modulo";
import type { AdminModulos, ModulosInstalacao, TipoUsuario } from "@/lib/types";
import { MODULOS_INSTALACAO_PADRAO } from "@/lib/types";
import type { ModuloReserva } from "@/lib/modulo";

export function rotaAposLogin(
  tipo: TipoUsuario,
  adminModulos?: AdminModulos,
  modulosInstalacao: ModulosInstalacao = MODULOS_INSTALACAO_PADRAO
): string {
  if (tipo === "SUPER_ADMIN") return "/super-admin/unidades";
  if (tipo === "ADMIN_UNIDADE") {
    const podeSalas = modulosInstalacao.salas && adminModulos?.salas;
    const podeViaturas = modulosInstalacao.viaturas && adminModulos?.viaturas;
    if (podeViaturas && !podeSalas) return "/viaturas/admin/reservas";
    if (podeSalas) return "/admin/reservas";
    return pathModuloInstalado(modulosInstalacao, true);
  }
  if (!modulosInstalacao.salas && modulosInstalacao.viaturas) return "/viaturas/minhas-reservas";
  return "/minhas-reservas";
}

export function painelElevado(tipo: TipoUsuario): boolean {
  return tipo === "ADMIN_UNIDADE" || tipo === "SUPER_ADMIN";
}

export function painelElevadoModulo(
  tipo: TipoUsuario,
  modulo: ModuloReserva,
  adminModulos?: AdminModulos,
  modulosInstalacao: ModulosInstalacao = MODULOS_INSTALACAO_PADRAO
): boolean {
  if (tipo === "SUPER_ADMIN") return true;
  if (tipo !== "ADMIN_UNIDADE" || !adminModulos) return false;
  const instalado = modulo === "salas" ? modulosInstalacao.salas : modulosInstalacao.viaturas;
  if (!instalado) return false;
  return modulo === "salas" ? adminModulos.salas : adminModulos.viaturas;
}

export function labelDestinoPosLogin(tipo: TipoUsuario): string {
  if (tipo === "SUPER_ADMIN") return "Painel super administrador";
  if (tipo === "ADMIN_UNIDADE") return "Gestão de reservas";
  return "Minhas reservas";
}
