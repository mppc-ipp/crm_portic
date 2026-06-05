"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  getModuloConfig,
  moduloEfetivo,
  mostrarInterruptorModulos,
  pathAoMudarModulo,
  persistModulo,
  type ModuloReserva
} from "@/lib/modulo";
import { painelElevadoModulo } from "@/lib/postLogin";
import type { AdminModulos, ModulosInstalacao, TipoUsuario } from "@/lib/types";

const modulos: ModuloReserva[] = ["salas", "viaturas"];

type Props = {
  tipo: TipoUsuario | null;
  adminModulos: AdminModulos;
  modulosInstalacao: ModulosInstalacao;
};

export default function ModuleSwitcher({ tipo, adminModulos, modulosInstalacao }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const active = moduloEfetivo(pathname, modulosInstalacao);

  if (!mostrarInterruptorModulos(modulosInstalacao)) {
    return null;
  }

  const handleSelect = (modulo: ModuloReserva) => {
    if (modulo === active) return;
    if (modulo === "salas" && !modulosInstalacao.salas) return;
    if (modulo === "viaturas" && !modulosInstalacao.viaturas) return;
    persistModulo(modulo);
    const adminNoDestino = tipo ? painelElevadoModulo(tipo, modulo, adminModulos, modulosInstalacao) : false;
    router.replace(pathAoMudarModulo(pathname, modulo, adminNoDestino));
  };

  const modulosVisiveis = modulos.filter((m) => (m === "salas" ? modulosInstalacao.salas : modulosInstalacao.viaturas));

  return (
    <div
      className={`mb-3 grid gap-0.5 rounded-xl border border-slate-200 bg-slate-100 p-0.5 ${
        modulosVisiveis.length === 2 ? "grid-cols-2" : "grid-cols-1"
      }`}
      role="tablist"
      aria-label="Módulo de reservas"
    >
      {modulosVisiveis.map((modulo) => {
        const cfg = getModuloConfig(modulo);
        const isActive = active === modulo;
        return (
          <button
            key={modulo}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => handleSelect(modulo)}
            className={`cursor-pointer rounded-lg px-2 py-2 text-sm font-semibold transition ${
              isActive
                ? "border border-slate-200 bg-white text-slate-900 shadow-sm"
                : "border border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            {cfg.label}
          </button>
        );
      })}
    </div>
  );
}
