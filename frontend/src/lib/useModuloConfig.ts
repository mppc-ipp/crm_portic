"use client";

import { usePathname } from "next/navigation";
import { getModuloConfig, moduloFromPathname } from "@/lib/modulo";

export function useModuloConfig() {
  const pathname = usePathname();
  return getModuloConfig(moduloFromPathname(pathname));
}
