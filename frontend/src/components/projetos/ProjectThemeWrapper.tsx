"use client";

import { ReactNode } from "react";
import { buildThemeStyle, COR_PROJETO_PADRAO } from "./projectTheme";

type Props = {
  cor?: string | null;
  className?: string;
  /** Sem layout flex — para modais e painéis flutuantes */
  inline?: boolean;
  children: ReactNode;
};

export default function ProjectThemeWrapper({ cor, className = "", inline = false, children }: Props) {
  return (
    <div
      className={`projeto-themed ${inline ? "" : "flex min-h-0 min-w-0 flex-1 flex-col"} ${className}`}
      style={buildThemeStyle(cor ?? COR_PROJETO_PADRAO)}
    >
      {children}
    </div>
  );
}
