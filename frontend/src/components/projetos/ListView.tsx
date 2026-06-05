"use client";

import { useState } from "react";
import Avatar from "./Avatar";
import { ESTADOS_OBJ, T } from "./constants";
import SectionMenu from "./SectionMenu";
import type { Objetivo, Secao } from "./types";
import { estiloDataLimite, formatarData } from "./utils";

type Props = {
  secoes: Secao[];
  onSelect: (obj: Objetivo) => void;
  onToggleComplete: (obj: Objetivo) => void;
  onAddTask: (secaoId: number) => void;
  onAddSection: () => void;
  onRenameSection: (id: number, nome: string) => Promise<void>;
  onDeleteSection: (id: number) => Promise<void>;
  onMoveSection: (id: number, direcao: "esquerda" | "direita") => void;
};

export default function ListView({
  secoes,
  onSelect,
  onToggleComplete,
  onAddTask,
  onAddSection,
  onRenameSection,
  onDeleteSection,
  onMoveSection,
}: Props) {
  const [colapsadas, setColapsadas] = useState<Set<number>>(new Set());
  const ordenadas = [...secoes].sort((a, b) => a.ordem - b.ordem);

  function alternar(secaoId: number) {
    setColapsadas((prev) => {
      const next = new Set(prev);
      if (next.has(secaoId)) next.delete(secaoId);
      else next.add(secaoId);
      return next;
    });
  }

  return (
    <div className="flex flex-1 flex-col overflow-auto">
      <div className="sticky top-0 z-10 grid grid-cols-[minmax(280px,1fr)_120px_120px_100px_36px] gap-2 border-b border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <span>Nome</span>
        <span>Responsável</span>
        <span>Data limite</span>
        <span>Estado</span>
        <span />
      </div>

      {ordenadas.map((secao, idx) => {
        const aberta = !colapsadas.has(secao.id);
        return (
          <div key={secao.id} className="border-b border-slate-100">
            <div className="flex w-full items-center gap-2 bg-slate-50/80 px-4 py-2.5 hover:bg-slate-100">
              <button
                type="button"
                onClick={() => alternar(secao.id)}
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
              >
                <span className="text-slate-400">{aberta ? "▾" : "▸"}</span>
                <span className="font-semibold text-slate-800">{secao.nome}</span>
                <span className="text-xs text-slate-400">{secao.objetivos.length}</span>
              </button>
              <SectionMenu
                secao={secao}
                isFirst={idx === 0}
                isLast={idx === ordenadas.length - 1}
                onRename={onRenameSection}
                onDelete={onDeleteSection}
                onMoveLeft={(id) => onMoveSection(id, "esquerda")}
                onMoveRight={(id) => onMoveSection(id, "direita")}
              />
            </div>

            {aberta && (
              <div>
                {secao.objetivos.map((obj) => (
                  <div
                    key={obj.id}
                    className={`group grid grid-cols-[minmax(280px,1fr)_120px_120px_100px_36px] items-center gap-2 border-t border-slate-50 px-4 py-2 ${T.hoverRowBg}`}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onToggleComplete(obj)}
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition ${
                          obj.estado === "CONCLUIDO"
                            ? "border-emerald-500 bg-emerald-500 text-[10px] text-white"
                            : "border-slate-300 hover:border-proj"
                        }`}
                      >
                        {obj.estado === "CONCLUIDO" && "✓"}
                      </button>
                      <button
                        type="button"
                        onClick={() => onSelect(obj)}
                        className={`min-w-0 flex-1 truncate text-left text-sm hover:text-proj ${
                          obj.estado === "CONCLUIDO" ? "text-slate-400 line-through" : "text-slate-800"
                        }`}
                      >
                        {obj.titulo}
                        {(obj.subtarefas_total ?? 0) > 0 && (
                          <span className="ml-2 text-[10px] text-slate-400">
                            ☑ {obj.subtarefas_concluidas}/{obj.subtarefas_total}
                          </span>
                        )}
                        {(obj.comentarios_total ?? 0) > 0 && (
                          <span className="ml-1 text-[10px] text-slate-400">💬 {obj.comentarios_total}</span>
                        )}
                      </button>
                    </div>
                    <div className="flex justify-center">
                      <Avatar nome={obj.responsavel_nome} />
                    </div>
                    <div>
                      {obj.data_limite ? (
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${estiloDataLimite(obj)}`}
                        >
                          {formatarData(obj.data_limite)}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </div>
                    <div>
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          ESTADOS_OBJ.find((e) => e.id === obj.estado)?.cor ?? "bg-slate-100"
                        }`}
                      >
                        {ESTADOS_OBJ.find((e) => e.id === obj.estado)?.label ?? obj.estado}
                      </span>
                    </div>
                    <div className="flex justify-center">
                      <button
                        type="button"
                        onClick={() => onSelect(obj)}
                        className="rounded px-1.5 py-0.5 text-slate-400 transition hover:bg-slate-200 hover:text-slate-600"
                        aria-label="Editar tarefa"
                        title="Editar tarefa"
                      >
                        ⋯
                      </button>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => onAddTask(secao.id)}
                  className={`flex w-full items-center gap-2 px-4 py-2 pl-10 text-left text-sm text-slate-500 ${T.hoverRow}`}
                >
                  <span>+</span>
                  <span>Adicionar tarefa…</span>
                </button>
              </div>
            )}
          </div>
        );
      })}

      <div className="px-4 py-3">
        <button type="button" onClick={onAddSection} className={T.btnGhost}>
          + Adicionar secção
        </button>
      </div>
    </div>
  );
}
