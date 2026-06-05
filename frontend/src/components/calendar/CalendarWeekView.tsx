"use client";

import { addDays, format, isSameDay, startOfWeek } from "date-fns";
import { pt } from "date-fns/locale";
import { useEffect, useState } from "react";
import { CALENDARIO_HORAS } from "@/lib/calendarioHorario";
import { EventoCalendario } from "@/lib/types";

type Props = {
  baseDate: Date;
  eventos: EventoCalendario[];
  onSelectOccurrences: (occurrences: Array<{ inicio: Date; fim: Date }>) => void;
};

export default function CalendarWeekView({ baseDate, eventos, onSelectOccurrences }: Props) {
  const weekStart = startOfWeek(baseDate, { weekStartsOn: 0 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const hours = CALENDARIO_HORAS;
  const [dragStartDayIndex, setDragStartDayIndex] = useState<number | null>(null);
  const [dragCurrentDayIndex, setDragCurrentDayIndex] = useState<number | null>(null);
  const [dragStartHour, setDragStartHour] = useState<number | null>(null);
  const [dragCurrentHour, setDragCurrentHour] = useState<number | null>(null);
  const isDragging = dragStartDayIndex !== null && dragStartHour !== null;

  const finalizeSelection = (dayIndex?: number, hour?: number) => {
    if (!isDragging || dragStartDayIndex === null || dragStartHour === null) return;
    const endDay = dayIndex ?? dragCurrentDayIndex ?? dragStartDayIndex;
    const endHour = hour ?? dragCurrentHour ?? dragStartHour;

    const minDay = Math.min(dragStartDayIndex, endDay);
    const maxDay = Math.max(dragStartDayIndex, endDay);
    const minHour = Math.min(dragStartHour, endHour);
    const maxHour = Math.max(dragStartHour, endHour) + 1;

    const occurrences = [];
    for (let i = minDay; i <= maxDay; i += 1) {
      const day = days[i];
      if (isPastDay(day)) continue;
      const inicio = new Date(day);
      inicio.setHours(minHour, 0, 0, 0);
      const fim = new Date(day);
      fim.setHours(maxHour, 0, 0, 0);
      occurrences.push({ inicio, fim });
    }
    if (occurrences.length > 0) onSelectOccurrences(occurrences);

    setDragStartDayIndex(null);
    setDragCurrentDayIndex(null);
    setDragStartHour(null);
    setDragCurrentHour(null);
  };

  useEffect(() => {
    const onUp = () => {
      if (!isDragging) return;
      finalizeSelection();
    };
    window.addEventListener("mouseup", onUp);
    return () => window.removeEventListener("mouseup", onUp);
  });

  const isCellSelected = (dayIndex: number, hour: number) => {
    if (
      !isDragging ||
      dragStartDayIndex === null ||
      dragCurrentDayIndex === null ||
      dragStartHour === null ||
      dragCurrentHour === null
    ) return false;
    const minDay = Math.min(dragStartDayIndex, dragCurrentDayIndex);
    const maxDay = Math.max(dragStartDayIndex, dragCurrentDayIndex);
    const minHour = Math.min(dragStartHour, dragCurrentHour);
    const maxHour = Math.max(dragStartHour, dragCurrentHour);
    return dayIndex >= minDay && dayIndex <= maxDay && hour >= minHour && hour <= maxHour;
  };

  const isPastDay = (day: Date) => {
    const d = new Date(day);
    d.setHours(0, 0, 0, 0);
    return d < todayStart;
  };

  const resetDrag = () => {
    if (!isDragging) return;
    setDragStartDayIndex(null);
    setDragCurrentDayIndex(null);
    setDragStartHour(null);
    setDragCurrentHour(null);
  };

  useEffect(() => {
    window.addEventListener("mouseleave", resetDrag);
    return () => window.removeEventListener("mouseleave", resetDrag);
  }, [isDragging]);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[70px_repeat(7,minmax(0,1fr))] gap-2">
        <div />
        {days.map((d) => (
          <div
            key={d.toISOString()}
            className={`rounded-lg border p-2 text-center ${
              isPastDay(d)
                ? "border-slate-300 bg-[repeating-linear-gradient(135deg,#f1f5f9,#f1f5f9_6px,#e2e8f0_6px,#e2e8f0_12px)] text-slate-400"
                : isSameDay(d, new Date())
                  ? "border-blue-500 bg-blue-50"
                  : "border-slate-200 bg-white"
            }`}
          >
            <div className="text-xs uppercase text-slate-500">{format(d, "EEE", { locale: pt })}</div>
            <div className="text-sm font-bold">{format(d, "dd/MM")}</div>
          </div>
        ))}
      </div>
      <div className="space-y-1">
        {hours.map((hour) => (
          <div key={hour} className="grid grid-cols-[70px_repeat(7,minmax(0,1fr))] gap-2">
            <div className="text-xs text-slate-500">{String(hour).padStart(2, "0")}:00</div>
            {days.map((d, dayIndex) => (
              <button
                key={`${d.toISOString()}-${hour}`}
                onMouseDown={() => {
                  if (isPastDay(d)) return;
                  setDragStartDayIndex(dayIndex);
                  setDragCurrentDayIndex(dayIndex);
                  setDragStartHour(hour);
                  setDragCurrentHour(hour);
                }}
                onMouseEnter={() => {
                  if (!isDragging) return;
                  setDragCurrentDayIndex(dayIndex);
                  setDragCurrentHour(hour);
                }}
                onMouseUp={() => finalizeSelection(dayIndex, hour)}
                disabled={isPastDay(d)}
                className={`min-h-10 rounded border border-dashed px-2 py-1 text-left transition ${
                  isPastDay(d)
                    ? "cursor-not-allowed border-slate-300 bg-[repeating-linear-gradient(135deg,#f8fafc,#f8fafc_6px,#e2e8f0_6px,#e2e8f0_12px)]"
                    : isCellSelected(dayIndex, hour)
                      ? "border-blue-500 bg-blue-100"
                      : "border-slate-200 hover:bg-blue-50"
                }`}
              >
                {eventos
                  .filter((e) => {
                    const inicio = new Date(e.dataInicio);
                    const fim = new Date(e.dataFim);
                    if (!isSameDay(inicio, d)) return false;
                    const startHour = inicio.getHours();
                    const endHour = fim.getHours();
                    const endMinutes = fim.getMinutes();
                    const lastHour = endMinutes > 0 ? endHour : endHour - 1;
                    return hour >= startHour && hour <= lastHour;
                  })
                  .map((e) => (
                    <div
                      key={e.id}
                      className={`rounded px-2 py-1 text-xs ${
                        e.status === "PENDENTE"
                          ? "bg-amber-100 text-amber-800"
                          : e.title === "Ocupado"
                            ? "bg-slate-200"
                            : "bg-blue-100"
                      }`}
                    >
                      {e.title}
                    </div>
                  ))}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
