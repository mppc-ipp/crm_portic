"use client";

import { useEffect, useRef, useState } from "react";
import type { Secao } from "./types";

type Props = {
  secao: Secao;
  isFirst: boolean;
  isLast: boolean;
  onRename: (id: number, nome: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onMoveLeft: (id: number) => void;
  onMoveRight: (id: number) => void;
};

export default function SectionMenu({
  secao,
  isFirst,
  isLast,
  onRename,
  onDelete,
  onMoveLeft,
  onMoveRight,
}: Props) {
  const [aberto, setAberto] = useState(false);
  const [aRenomear, setARenomear] = useState(false);
  const [nome, setNome] = useState(secao.nome);
  const [aProcessar, setAProcessar] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNome(secao.nome);
  }, [secao.nome]);

  useEffect(() => {
    if (!aberto) return;
    function fora(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, [aberto]);

  async function guardarNome() {
    if (!nome.trim() || nome.trim() === secao.nome) {
      setARenomear(false);
      return;
    }
    setAProcessar(true);
    try {
      await onRename(secao.id, nome.trim());
      setARenomear(false);
      setAberto(false);
    } finally {
      setAProcessar(false);
    }
  }

  async function apagar() {
    if (!window.confirm(`Apagar a secção «${secao.nome}»?`)) return;
    setAProcessar(true);
    try {
      await onDelete(secao.id);
      setAberto(false);
    } finally {
      setAProcessar(false);
    }
  }

  if (aRenomear) {
    return (
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <input
          autoFocus
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void guardarNome();
            if (e.key === "Escape") {
              setNome(secao.nome);
              setARenomear(false);
            }
          }}
          className="w-32 rounded border border-slate-200 px-2 py-0.5 text-xs outline-none focus:border-proj"
        />
        <button
          type="button"
          disabled={aProcessar}
          onClick={() => void guardarNome()}
          className="text-xs text-proj hover:underline"
        >
          OK
        </button>
      </div>
    );
  }

  return (
    <div className="relative" ref={ref} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="rounded px-1.5 py-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
        aria-label="Opções da secção"
      >
        ⋯
      </button>
      {aberto && (
        <div className="absolute right-0 z-20 mt-1 min-w-[140px] rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          <button
            type="button"
            disabled={aProcessar}
            onClick={() => {
              setARenomear(true);
              setAberto(false);
            }}
            className="block w-full px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50"
          >
            Renomear
          </button>
          {!isFirst && (
            <button
              type="button"
              disabled={aProcessar}
              onClick={() => {
                onMoveLeft(secao.id);
                setAberto(false);
              }}
              className="block w-full px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50"
            >
              Mover ←
            </button>
          )}
          {!isLast && (
            <button
              type="button"
              disabled={aProcessar}
              onClick={() => {
                onMoveRight(secao.id);
                setAberto(false);
              }}
              className="block w-full px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50"
            >
              Mover →
            </button>
          )}
          <button
            type="button"
            disabled={aProcessar}
            onClick={() => void apagar()}
            className="block w-full px-3 py-1.5 text-left text-xs text-red-600 hover:bg-red-50"
          >
            Apagar
          </button>
        </div>
      )}
    </div>
  );
}
