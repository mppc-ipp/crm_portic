"use client";

import { addDays, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek } from "date-fns";
import { pt } from "date-fns/locale";
import { EventoCalendario } from "@/lib/types";

type Props = {
  baseDate: Date;
  eventos: EventoCalendario[];
  onSelectDay: (day: Date) => void;
};

export default function CalendarMonthView({ baseDate, eventos, onSelectDay }: Props) {
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
      {days.map((d) => (
        <button
          key={d.toISOString()}
          onClick={() => onSelectDay(d)}
          className={`min-h-28 rounded-xl border p-2 text-left ${
            !isSameMonth(d, baseDate)
              ? "border-slate-100 bg-slate-50 text-slate-400"
              : isSameDay(d, new Date())
                ? "border-blue-500 bg-blue-50"
                : "border-slate-200 bg-white"
          }`}
        >
          <div className={`mb-1 text-xs font-semibold uppercase ${isSameMonth(d, baseDate) ? "text-slate-500" : "text-slate-400"}`}>
            {format(d, "EEE", { locale: pt })}
          </div>
          <div className={`text-sm font-bold ${isSameMonth(d, baseDate) ? "text-slate-900" : "text-slate-400"}`}>
            {format(d, "dd/MM")}
          </div>
          <div className="mt-2 space-y-1">
            {eventos
              .filter((e) => isSameDay(new Date(e.dataInicio), d))
              .slice(0, 2)
              .map((e) => (
                <div
                  key={e.id}
                  className={`truncate rounded px-2 py-1 text-[11px] ${
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
          </div>
        </button>
      ))}
    </div>
  );
}
