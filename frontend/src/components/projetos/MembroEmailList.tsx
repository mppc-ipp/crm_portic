"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

type UserOpcao = {
  id: number;
  nome: string;
  email: string;
};

type Props = {
  emails: string[];
  onChange: (emails: string[]) => void;
  membrosExistentes?: MembroProjeto[];
};

export default function MembroEmailList({ emails, onChange, membrosExistentes = [] }: Props) {
  const [lookups, setLookups] = useState<Record<string, LookupInfo>>({});
  const [erroLocal, setErroLocal] = useState("");
  const [sugestoes, setSugestoes] = useState<UserOpcao[]>([]);
  const [aPesquisar, setAPesquisar] = useState(false);
  const [dropdownIdx, setDropdownIdx] = useState<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const linhas = emails.length > 0 ? emails : [""];

  const emailsJaAdicionados = useMemo(() => {
    const vistos = new Set<string>();
    for (const e of emails) {
      const norm = e.trim().toLowerCase();
      if (norm) vistos.add(norm);
    }
    return vistos;
  }, [emails]);

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
    if (dropdownIdx === idx) setDropdownIdx(null);
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

  const pesquisarUtilizadores = useCallback(
    async (termo: string) => {
      const q = termo.trim();
      if (q.length < 2) {
        setSugestoes([]);
        return;
      }
      setAPesquisar(true);
      try {
        const data = await apiFetch<UserOpcao[]>(
          `/api/users/search?q=${encodeURIComponent(q)}`
        );
        setSugestoes(
          data.filter((u) => !emailsJaAdicionados.has(u.email.trim().toLowerCase()))
        );
      } catch {
        setSugestoes([]);
      } finally {
        setAPesquisar(false);
      }
    },
    [emailsJaAdicionados]
  );

  useEffect(() => {
    for (const email of emailsValidos) {
      if (!lookups[email]) void fazerLookup(email);
    }
  }, [emailsValidos, lookups, fazerLookup]);

  useEffect(() => {
    if (dropdownIdx === null) return;
    const termo = linhas[dropdownIdx] ?? "";
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void pesquisarUtilizadores(termo);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [dropdownIdx, linhas, pesquisarUtilizadores]);

  useEffect(() => {
    function onClickFora(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownIdx(null);
      }
    }
    document.addEventListener("mousedown", onClickFora);
    return () => document.removeEventListener("mousedown", onClickFora);
  }, []);

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

  function selecionarUtilizador(idx: number, user: UserOpcao) {
    atualizarLinha(idx, user.email);
    const norm = user.email.trim().toLowerCase();
    setLookups((prev) => ({
      ...prev,
      [norm]: { email: norm, tem_cadastro: true, nome: user.nome },
    }));
    setDropdownIdx(null);
    setSugestoes([]);
  }

  return (
    <div ref={containerRef} className="space-y-3">
      <div className="space-y-2">
        {linhas.map((email, idx) => (
          <div key={idx} className="relative flex items-center gap-2">
            <input
              type="text"
              value={email}
              onChange={(e) => {
                atualizarLinha(idx, e.target.value);
                setDropdownIdx(idx);
              }}
              onFocus={() => {
                setDropdownIdx(idx);
                const termo = email.trim();
                if (termo.length >= 2) void pesquisarUtilizadores(termo);
              }}
              onBlur={() => {
                const norm = email.trim().toLowerCase();
                if (EMAIL_RE.test(norm)) void fazerLookup(norm);
                validarDuplicados();
              }}
              placeholder="Nome ou email…"
              className={`flex-1 ${T.input}`}
              autoComplete="off"
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

            {dropdownIdx === idx && (email.trim().length >= 2 || sugestoes.length > 0) && (
              <ul className="absolute left-0 right-12 top-full z-10 mt-1 max-h-48 overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                {aPesquisar && (
                  <li className="px-3 py-2 text-sm text-slate-400">A pesquisar…</li>
                )}
                {!aPesquisar && sugestoes.length === 0 && (
                  <li className="px-3 py-2 text-sm text-slate-400">
                    Nenhum utilizador encontrado
                  </li>
                )}
                {!aPesquisar &&
                  sugestoes.map((u) => (
                    <li key={u.id}>
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => selecionarUtilizador(idx, u)}
                      >
                        <Avatar nome={u.nome} tamanho="sm" />
                        <span>
                          <span className="font-medium text-slate-800">{u.nome}</span>
                          <span className="ml-2 text-slate-400">{u.email}</span>
                        </span>
                      </button>
                    </li>
                  ))}
              </ul>
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
