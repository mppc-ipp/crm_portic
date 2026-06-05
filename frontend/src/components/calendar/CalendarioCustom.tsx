"use client";

import { addDays, addMonths, addWeeks, format, startOfWeek } from "date-fns";
import { pt } from "date-fns/locale";
import { useEffect, useMemo, useState } from "react";
import { EventoCalendario } from "@/lib/types";
import CalendarDayView from "./CalendarDayView";
import CalendarMonthView from "./CalendarMonthView";
import CalendarWeekView from "./CalendarWeekView";

export type CalendarViewMode = "week" | "month" | "day";

type Props = {
  eventos: EventoCalendario[];
  onSelectOccurrences: (occurrences: Array<{ inicio: Date; fim: Date }>) => void;
  viewMode?: CalendarViewMode;
  selectedDay?: Date;
  onSelectDay?: (day: Date) => void;
  onBackToMonth?: () => void;
  onBaseDateChange?: (nextDate: Date) => void;
  onEventClick?: (evento: EventoCalendario) => void;
  disableDayInteractions?: boolean;
};

export default function CalendarioCustom({
  eventos,
  onSelectOccurrences,
  viewMode = "week",
  selectedDay,
  onSelectDay,
  onBackToMonth,
  onBaseDateChange,
  onEventClick,
  disableDayInteractions = false
}: Props) {
  const [baseDate, setBaseDate] = useState(new Date());
  const activeDay = selectedDay ?? baseDate;
  const currentWeekStart = useMemo(() => startOfWeek(new Date(), { weekStartsOn: 0 }), []);
  const canGoPrevWeek = startOfWeek(baseDate, { weekStartsOn: 0 }) > currentWeekStart;

  useEffect(() => {
    onBaseDateChange?.(baseDate);
  }, [baseDate, onBaseDateChange]);

  const calendarContent = useMemo(() => {
    if (viewMode === "month") {
      return <CalendarMonthView baseDate={baseDate} eventos={eventos} onSelectDay={(day) => onSelectDay?.(day)} />;
    }
    if (viewMode === "day") {
      return (
        <CalendarDayView
          baseDate={activeDay}
          eventos={eventos}
          onSelectOccurrences={onSelectOccurrences}
          onEventClick={onEventClick}
          disableSelection={disableDayInteractions}
        />
      );
    }
    return <CalendarWeekView baseDate={baseDate} eventos={eventos} onSelectOccurrences={onSelectOccurrences} />;
  }, [activeDay, baseDate, disableDayInteractions, eventos, onEventClick, onSelectDay, onSelectOccurrences, viewMode]);

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center gap-2">
        {viewMode === "month" ? (
          <>
            <button
              onClick={() => setBaseDate((d) => addMonths(d, -1))}
              className="rounded border bg-white px-2 py-1 text-sm hover:bg-slate-100"
            >
              {"<"}
            </button>
            <div className="text-sm font-semibold text-slate-700">{format(baseDate, "MMMM yyyy", { locale: pt })}</div>
            <button
              onClick={() => setBaseDate((d) => addMonths(d, 1))}
              className="rounded border bg-white px-2 py-1 text-sm hover:bg-slate-100"
            >
              {">"}
            </button>
          </>
        ) : viewMode === "day" ? (
          <>
            <button
              onClick={() => onSelectDay?.(addDays(activeDay, -1))}
              className="rounded border bg-white px-2 py-1 text-sm hover:bg-slate-100"
            >
              {"<"}
            </button>
            <div className="text-sm font-semibold text-slate-700">Dia - {format(activeDay, "dd/MM/yyyy")}</div>
            <button
              onClick={() => onSelectDay?.(addDays(activeDay, 1))}
              className="rounded border bg-white px-2 py-1 text-sm hover:bg-slate-100"
            >
              {">"}
            </button>
            {onBackToMonth && (
              <button
                onClick={onBackToMonth}
                className="ml-auto rounded border bg-white px-2 py-1 text-sm hover:bg-slate-100"
              >
                Voltar ao mês
              </button>
            )}
          </>
        ) : (
          <>
            <button
              disabled={!canGoPrevWeek}
              onClick={() => {
                if (!canGoPrevWeek) return;
                setBaseDate((d) => addWeeks(d, -1));
              }}
              className={`rounded border px-2 py-1 text-sm ${canGoPrevWeek ? "bg-white hover:bg-slate-100" : "cursor-not-allowed bg-slate-100 text-slate-400"}`}
            >
              {"<"}
            </button>
            <div className="text-sm font-semibold text-slate-700">Semana - {format(baseDate, "dd/MM/yyyy")}</div>
            <button
              onClick={() => setBaseDate((d) => addWeeks(d, 1))}
              className="rounded border bg-white px-2 py-1 text-sm hover:bg-slate-100"
            >
              {">"}
            </button>
          </>
        )}
      </div>
      {calendarContent}
    </div>
  );
}
