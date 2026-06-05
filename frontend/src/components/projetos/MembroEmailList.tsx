"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Avatar from "./Avatar";
import { T } from "./constants";
import type { MembroProjeto } from "./types";
import { apiFetch } from "@/lib/api";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

type LookupInfo = {
  email: string;
  tem_cadastro: boolean;
  nome: string | null;
};

type Props = {
  emails: string[];
  onChange: (emails: string[]) => void;
  membrosExistentes?: MembroProjeto[];
};

export default function MembroEmailList({ emails, onChange, membrosExistentes = [] }: Props) {
  const [lookups, setLookups] = useState<Record<string, LookupInfo>>({});
  const [erroLocal, setErroLocal] = useState("");

  const linhas = emails.length > 0 ? emails : [""];

  const emailsValidos = useMemo(
    () => emails.map((e) => e.trim().toLowerCase()).filter((e) => EMAIL_RE.test(e)),
    [emails]
  );

  const atualizarLinha = (idx: number, valor: string) => {
    const base = emails.length > 0 ? [...emails] : [""];
    base[idx] = valor;
    onChange(base);
    setErroLocal("");
  };

  const adicionarLinha = () => {
    onChange(emails.length > 0 ? [...emails, ""] : ["", ""]);
  };

  const removerLinha = (idx: number) => {
    const base = emails.length > 0 ? emails : [""];
    const nova = base.filter((_, i) => i !== idx);
    onChange(nova.length > 0 ? nova : [""]);
  };

  const fazerLookup = useCallback(async (email: string) => {
    const norm = email.trim().toLowerCase();
    if (!EMAIL_RE.test(norm)) return;
    try {
      const data = await apiFetch<{ tem_cadastro: boolean; nome: string | null }>(
        `/api/users/lookup?email=${encodeURIComponent(norm)}`
      );
      setLookups((prev) => ({
        ...prev,
        [norm]: { email: norm, tem_cadastro: data.tem_cadastro, nome: data.nome },
      }));
    } catch {
      setLookups((prev) => ({
        ...prev,
        [norm]: { email: norm, tem_cadastro: false, nome: null },
      }));
    }
  }, []);

  useEffect(() => {
    for (const email of emailsValidos) {
      if (!lookups[email]) void fazerLookup(email);
    }
  }, [emailsValidos, lookups, fazerLookup]);

  const preview = useMemo(() => {
    return emailsValidos.map((email) => {
      const existente = membrosExistentes.find((m) => m.email.toLowerCase() === email);
      const info = lookups[email];
      if (existente?.tem_cadastro) {
        return { email, nome: existente.nome, tem_cadastro: true };
      }
      return {
        email,
        nome: info?.nome ?? null,
        tem_cadastro: info?.tem_cadastro ?? false,
      };
    });
  }, [emailsValidos, lookups, membrosExistentes]);

  function validarDuplicados(): boolean {
    const vistos = new Set<string>();
    for (const e of emails) {
      const norm = e.trim().toLowerCase();
      if (!norm) continue;
      if (vistos.has(norm)) {
        setErroLocal("Existem emails duplicados.");
        return false;
      }
      vistos.add(norm);
      if (!EMAIL_RE.test(norm)) {
        setErroLocal(`Email inválido: ${e}`);
        return false;
      }
    }
    setErroLocal("");
    return true;
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {linhas.map((email, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => atualizarLinha(idx, e.target.value)}
              onBlur={() => {
                const norm = email.trim().toLowerCase();
                if (EMAIL_RE.test(norm)) void fazerLookup(norm);
                validarDuplicados();
              }}
              placeholder="email@exemplo.com"
              className={`flex-1 ${T.input}`}
            />
            {linhas.length > 1 && (
              <button
                type="button"
                onClick={() => removerLinha(idx)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
                title="Remover"
              >
                ×
              </button>
            )}
            {idx === linhas.length - 1 && (
              <button
                type="button"
                onClick={adicionarLinha}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                title="Adicionar membro"
              >
                +
              </button>
            )}
          </div>
        ))}
      </div>

      {preview.length > 0 && (
        <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
          <p className="mb-2 text-xs font-medium text-slate-500">Membros</p>
          <div className="flex flex-wrap gap-2">
            {preview.map((m) =>
              m.tem_cadastro && m.nome ? (
                <span key={m.email} className="inline-flex items-center gap-1.5" title={m.nome}>
                  <Avatar nome={m.nome} tamanho="sm" />
                </span>
              ) : (
                <span
                  key={m.email}
                  className="inline-flex items-center rounded-full bg-slate-200 px-2.5 py-1 text-xs text-slate-700"
                  title={m.email}
                >
                  {m.email}
                </span>
              )
            )}
          </div>
        </div>
      )}

      {erroLocal && <p className="text-xs text-red-600">{erroLocal}</p>}
    </div>
  );
}

export function extrairEmailsValidos(emails: string[]): string[] {
  const vistos = new Set<string>();
  const resultado: string[] = [];
  for (const raw of emails) {
    const norm = raw.trim().toLowerCase();
    if (!norm || !EMAIL_RE.test(norm) || vistos.has(norm)) continue;
    vistos.add(norm);
    resultado.push(norm);
  }
  return resultado;
}
