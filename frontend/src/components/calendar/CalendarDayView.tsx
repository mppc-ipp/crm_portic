"use client";

import { format } from "date-fns";
import { useCallback, useEffect, useState } from "react";
import { CALENDARIO_HORAS } from "@/lib/calendarioHorario";
import { EventoCalendario } from "@/lib/types";

type Props = {
  baseDate: Date;
  eventos: EventoCalendario[];
  onSelectOccurrences: (occurrences: Array<{ inicio: Date; fim: Date }>) => void;
  onEventClick?: (evento: EventoCalendario) => void;
  disableSelection?: boolean;
};

export default function CalendarDayView({
  baseDate,
  eventos,
  onSelectOccurrences,
  onEventClick,
  disableSelection = false
}: Props) {
  const hours = CALENDARIO_HORAS;
  const dayEvents = eventos.filter((e) => new Date(e.dataInicio).toDateString() === baseDate.toDateString());
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartHour, setDragStartHour] = useState<number | null>(null);
  const [dragEndHour, setDragEndHour] = useState<number | null>(null);

  const finalizeSelection = useCallback((endHour?: number) => {
    if (!isDragging || dragStartHour === null) return;
    const resolvedEnd = endHour ?? dragEndHour ?? dragStartHour;
    const startHour = Math.min(dragStartHour, resolvedEnd);
    const finishHour = Math.max(dragStartHour, resolvedEnd) + 1;

    const inicio = new Date(baseDate);
    inicio.setHours(startHour, 0, 0, 0);
    const fim = new Date(baseDate);
    fim.setHours(finishHour, 0, 0, 0);

    onSelectOccurrences([{ inicio, fim }]);
    setIsDragging(false);
    setDragStartHour(null);
    setDragEndHour(null);
  }, [baseDate, dragEndHour, dragStartHour, isDragging, onSelectOccurrences]);

  useEffect(() => {
    const handleMouseUp = () => finalizeSelection();
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, [finalizeSelection]);

  const isHourSelected = (hour: number) => {
    if (!isDragging || dragStartHour === null || dragEndHour === null) return false;
    const min = Math.min(dragStartHour, dragEndHour);
    const max = Math.max(dragStartHour, dragEndHour);
    return hour >= min && hour <= max;
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="mb-3 text-sm font-semibold text-slate-700">
        Clique e arraste nas horas para marcar em {format(baseDate, "dd/MM/yyyy")}
      </div>
      <div className="grid grid-cols-[80px_1fr] gap-2">
        {hours.map((hour) => (
          <div key={hour} className="contents">
            <div className="text-xs text-slate-500">{String(hour).padStart(2, "0")}:00</div>
            <div
              onMouseDown={() => {
                if (disableSelection) return;
                setIsDragging(true);
                setDragStartHour(hour);
                setDragEndHour(hour);
              }}
              onMouseEnter={() => {
                if (disableSelection) return;
                if (isDragging) setDragEndHour(hour);
              }}
              onMouseUp={() => {
                if (disableSelection) return;
                finalizeSelection(hour);
              }}
              className={`min-h-10 select-none rounded border border-dashed px-2 py-1 text-left transition hover:border-blue-400 ${
                disableSelection
                  ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                  : isHourSelected(hour)
                    ? "border-blue-500 bg-blue-100"
                    : "border-slate-200 hover:bg-blue-50"
              }`}
            >
              {dayEvents
                .filter((e) => {
                  const inicio = new Date(e.dataInicio);
                  const fim = new Date(e.dataFim);
                  const startHour = inicio.getHours();
                  const endHour = fim.getHours();
                  const endMinutes = fim.getMinutes();
                  const lastHour = endMinutes > 0 ? endHour : endHour - 1;
                  return hour >= startHour && hour <= lastHour;
                })
                .map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onEventClick?.(e);
                    }}
                    className={`rounded px-2 py-1 text-xs ${
                      e.status === "PENDENTE"
                        ? "bg-amber-100 text-amber-800"
                        : e.title === "Ocupado"
                          ? "bg-slate-200"
                          : "bg-blue-100"
                    }`}
                  >
                    {e.title}
                  </button>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
