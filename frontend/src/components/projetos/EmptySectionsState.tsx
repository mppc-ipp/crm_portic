"use client";

import { useState } from "react";
import { KANBAN_SECOES, T } from "./constants";

type Props = {
  onCreateSection: () => void;
  onApplyKanban: () => Promise<void>;
};

export default function EmptySectionsState({ onCreateSection, onApplyKanban }: Props) {
  const [aAplicar, setAAplicar] = useState(false);

  async function aplicarKanban() {
    setAAplicar(true);
    try {
      await onApplyKanban();
    } finally {
      setAAplicar(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-lg font-medium text-slate-700">Nenhuma secção neste projeto</p>
      <p className="max-w-md text-sm text-slate-500">
        Crie secções à medida da sua equipa — por exemplo Backlog, Sprint, Em revisão ou Entregue.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <button type="button" onClick={onCreateSection} className={T.btnPrimary}>
          + Criar primeira secção
        </button>
        <button
          type="button"
          disabled={aAplicar}
          onClick={() => void aplicarKanban()}
          className={`${T.btnOutline} disabled:opacity-50`}
        >
          {aAplicar ? "A aplicar…" : `Usar template (${KANBAN_SECOES.join(" / ")})`}
        </button>
      </div>
    </div>
  );
}
