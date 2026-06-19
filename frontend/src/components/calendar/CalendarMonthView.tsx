"use client";

import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { pt } from "date-fns/locale";
import { classeEventoCalendario, estiloTipoEvento, eventoIntersectaDia } from "@/lib/eventos";
import { EventoCalendario } from "@/lib/types";

type Props = {
  baseDate: Date;
  eventos: EventoCalendario[];
  onSelectDay: (day: Date) => void;
  onEventClick?: (evento: EventoCalendario) => void;
};

export default function CalendarMonthView({ baseDate, eventos, onSelectDay, onEventClick }: Props) {
  const start = startOfWeek(startOfMonth(baseDate), { weekStartsOn: 0 });
  const end = endOfWeek(endOfMonth(baseDate), { weekStartsOn: 0 });
  const days: Date[] = [];
  let day = start;
  while (day <= end) {
    days.push(day);
    day = addDays(day, 1);
  }

  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map((d) => {
        const dayEvents = eventos.filter((e) => eventoIntersectaDia(e.dataInicio, e.dataFim, d));
        return (
          <div
            key={d.toISOString()}
            className={`min-h-28 rounded-xl border p-2 text-left ${
              !isSameMonth(d, baseDate)
                ? "border-slate-100 bg-slate-50 text-slate-400"
                : isSameDay(d, new Date())
                  ? "border-blue-500 bg-blue-50"
                  : "border-slate-200 bg-white"
            }`}
          >
            <button
              type="button"
              onClick={() => onSelectDay(d)}
              className="mb-1 w-full text-left"
            >
              <div
                className={`text-xs font-semibold uppercase ${
                  isSameMonth(d, baseDate) ? "text-slate-500" : "text-slate-400"
                }`}
              >
                {format(d, "EEE", { locale: pt })}
              </div>
              <div
                className={`text-sm font-bold ${isSameMonth(d, baseDate) ? "text-slate-900" : "text-slate-400"}`}
              >
                {format(d, "dd/MM")}
              </div>
            </button>
            <div className="mt-1 space-y-1">
              {dayEvents.slice(0, 3).map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={(ev) => {
                    ev.stopPropagation();
                    onEventClick?.(e);
                  }}
                  className={`block w-full truncate rounded border px-2 py-1 text-left text-[11px] ${classeEventoCalendario(
                    e.status,
                    e.title
                  )}`}
                  style={estiloTipoEvento(e.tipoCor)}
                >
                  {e.title}
                </button>
              ))}
              {dayEvents.length > 3 && (
                <span className="block px-1 text-[10px] text-slate-500">+{dayEvents.length - 3} mais</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
