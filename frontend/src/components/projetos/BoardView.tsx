"use client";

import { useState } from "react";
import Avatar from "./Avatar";
import { T } from "./constants";
import SectionMenu from "./SectionMenu";
import type { Objetivo, Secao } from "./types";
import { estiloDataLimite, formatarData } from "./utils";

type Props = {
  secoes: Secao[];
  onSelect: (obj: Objetivo) => void;
  onMove: (obj: Objetivo, secaoId: number) => Promise<void>;
  onAddTask: (secaoId: number) => void;
  onAddSection: () => void;
  onRenameSection: (id: number, nome: string) => Promise<void>;
  onDeleteSection: (id: number) => Promise<void>;
  onMoveSection: (id: number, direcao: "esquerda" | "direita") => void;
};

export default function BoardView({
  secoes,
  onSelect,
  onMove,
  onAddTask,
  onAddSection,
  onRenameSection,
  onDeleteSection,
  onMoveSection,
}: Props) {
  const [arrastando, setArrastando] = useState<number | null>(null);
  const ordenadas = [...secoes].sort((a, b) => a.ordem - b.ordem);

  return (
    <div className="flex flex-1 gap-4 overflow-x-auto pb-4">
      {ordenadas.map((secao, idx) => (
        <div
          key={secao.id}
          className="flex w-72 shrink-0 flex-col rounded-xl bg-slate-100/70"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const id = Number(e.dataTransfer.getData("objId"));
            const obj = secoes.flatMap((s) => s.objetivos).find((o) => o.id === id);
            if (obj && obj.secao_id !== secao.id) void onMove(obj, secao.id);
            setArrastando(null);
          }}
        >
          <div className="flex items-center justify-between gap-1 px-3 py-3">
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-semibold text-slate-700">{secao.nome}</h3>
              <span className="text-xs text-slate-400">{secao.objetivos.length} tarefas</span>
            </div>
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

          <div
            className="flex flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2"
            style={{ maxHeight: "calc(100vh - 220px)" }}
          >
            {secao.objetivos.map((obj) => (
              <div
                key={obj.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("objId", String(obj.id));
                  setArrastando(obj.id);
                }}
                onDragEnd={() => setArrastando(null)}
                onClick={() => onSelect(obj)}
                className={`cursor-pointer rounded-lg border bg-white p-3 shadow-sm transition hover:shadow-md ${
                  arrastando === obj.id ? "opacity-50" : ""
                } ${obj.estado === "CONCLUIDO" ? "opacity-70" : ""}`}
              >
                <p
                  className={`text-sm font-medium ${
                    obj.estado === "CONCLUIDO" ? "text-slate-400 line-through" : "text-slate-800"
                  }`}
                >
                  {obj.titulo}
                  {obj.urgente && (
                    <span className="ml-2 inline-block rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                      urgente
                    </span>
                  )}
                </p>
                {((obj.subtarefas_total ?? 0) > 0 || (obj.comentarios_total ?? 0) > 0) && (
                  <p className="mt-1 text-[10px] text-slate-400">
                    {(obj.subtarefas_total ?? 0) > 0 && `☑ ${obj.subtarefas_concluidas}/${obj.subtarefas_total}`}
                    {(obj.comentarios_total ?? 0) > 0 && ` 💬${obj.comentarios_total}`}
                  </p>
                )}
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {obj.data_limite && (
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${estiloDataLimite(obj)}`}
                      >
                        {formatarData(obj.data_limite)}
                      </span>
                    )}
                  </div>
                  <Avatar nome={obj.responsavel_nome} />
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() => onAddTask(secao.id)}
              className="mt-1 flex w-full items-center gap-1 rounded-lg px-2 py-2 text-left text-xs text-slate-500 hover:bg-white/80 hover:text-proj"
            >
              <span>+</span>
              <span>Adicionar tarefa</span>
            </button>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={onAddSection}
        className="flex h-fit w-56 shrink-0 flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 p-6 text-sm text-slate-500 transition hover:border-proj hover:text-proj"
      >
        <span className="text-2xl">+</span>
        <span className="mt-1 font-medium">Nova coluna</span>
      </button>
    </div>
  );
}
