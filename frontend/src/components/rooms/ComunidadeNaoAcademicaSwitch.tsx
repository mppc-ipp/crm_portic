"use client";

import { Field } from "@/components/ui/ui";

type Props = {
  ativo: boolean;
  onChange: (ativo: boolean) => void;
  disabled?: boolean;
};

export default function ComunidadeNaoAcademicaSwitch({ ativo, onChange, disabled }: Props) {
  return (
    <Field label="Comunidade não académica" horizontal>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="min-w-0 flex-1 text-xs text-slate-600">
          Ative para permitir reservas por utilizadores externos (sem email ipp.pt).
        </p>
        <button
          type="button"
          role="switch"
          aria-checked={ativo}
          aria-label="Comunidade não académica"
          disabled={disabled}
          onClick={() => onChange(!ativo)}
          className={`relative flex h-8 w-14 shrink-0 items-center rounded-full p-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
            ativo ? "justify-end bg-emerald-600" : "justify-start bg-slate-300"
          }`}
        >
          <span className="h-6 w-6 rounded-full bg-white shadow-sm ring-1 ring-black/5" />
        </button>
      </div>
    </Field>
  );
}
