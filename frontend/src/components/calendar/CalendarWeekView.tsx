"use client";

import { addDays, format, isSameDay, startOfWeek } from "date-fns";
import { pt } from "date-fns/locale";
import { useEffect, useState } from "react";
import { CALENDARIO_HORAS } from "@/lib/calendarioHorario";
import { classeEventoCalendario, estiloTipoEvento, eventoCobreHora, eventoIntersectaDia } from "@/lib/eventos";
import { EventoCalendario } from "@/lib/types";

type Props = {
  baseDate: Date;
  eventos: EventoCalendario[];
  onSelectOccurrences: (occurrences: Array<{ inicio: Date; fim: Date }>) => void;
  onEventClick?: (evento: EventoCalendario) => void;
  disableSelection?: boolean;
};

export default function CalendarWeekView({
  baseDate,
  eventos,
  onSelectOccurrences,
  onEventClick,
  disableSelection = false,
}: Props) {
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

  const isPastDay = (day: Date) => {
    const d = new Date(day);
    d.setHours(0, 0, 0, 0);
    return d < todayStart;
  };

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
    )
      return false;
    const minDay = Math.min(dragStartDayIndex, dragCurrentDayIndex);
    const maxDay = Math.max(dragStartDayIndex, dragCurrentDayIndex);
    const minHour = Math.min(dragStartHour, dragCurrentHour);
    const maxHour = Math.max(dragStartHour, dragCurrentHour);
    return dayIndex >= minDay && dayIndex <= maxDay && hour >= minHour && hour <= maxHour;
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[70px_repeat(7,minmax(0,1fr))] gap-2">
        <div />
        {days.map((d) => (
          <div
            key={d.toISOString()}
            className={`rounded-lg border p-2 text-center ${
              isPastDay(d)
                ? "border-slate-300 bg-slate-100 text-slate-400"
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
            {days.map((d, dayIndex) => {
              const eventosNaHora = eventos.filter(
                (e) =>
                  eventoIntersectaDia(e.dataInicio, e.dataFim, d) &&
                  eventoCobreHora(e.dataInicio, e.dataFim, d, hour)
              );
              const estiloHora =
                eventosNaHora.length > 0 ? estiloTipoEvento(eventosNaHora[0].tipoCor) : undefined;

              return (
              <button
                key={`${d.toISOString()}-${hour}`}
                type="button"
                onMouseDown={() => {
                  if (disableSelection || isPastDay(d)) return;
                  setDragStartDayIndex(dayIndex);
                  setDragCurrentDayIndex(dayIndex);
                  setDragStartHour(hour);
                  setDragCurrentHour(hour);
                }}
                onMouseEnter={() => {
                  if (disableSelection || !isDragging) return;
                  setDragCurrentDayIndex(dayIndex);
                  setDragCurrentHour(hour);
                }}
                onMouseUp={() => {
                  if (!disableSelection) finalizeSelection(dayIndex, hour);
                }}
                disabled={disableSelection || isPastDay(d)}
                style={!isCellSelected(dayIndex, hour) ? estiloHora : undefined}
                className={`min-h-10 rounded border border-dashed px-2 py-1 text-left transition ${
                  disableSelection || isPastDay(d)
                    ? "cursor-not-allowed border-slate-300 bg-slate-100"
                    : isCellSelected(dayIndex, hour)
                      ? "border-blue-500 bg-blue-100"
                      : eventosNaHora.length > 0
                        ? "border-solid"
                        : "border-slate-200 hover:bg-blue-50"
                }`}
              >
                {eventosNaHora.map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      onClick={(ev) => {
                        ev.stopPropagation();
                        onEventClick?.(e);
                      }}
                      className={`mb-1 block w-full rounded border px-2 py-1 text-left text-xs ${classeEventoCalendario(
                        e.status,
                        e.title
                      )}`}
                      style={estiloTipoEvento(e.tipoCor)}
                    >
                      {e.title}
                    </button>
                  ))}
              </button>
            );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
