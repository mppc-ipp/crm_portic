"use client";

import { useState } from "react";
import { downloadCsvFromApi, downloadCsvFromRows, type CsvColumn } from "@/lib/exportCsv";

type Props<T extends Record<string, unknown>> = {
  label?: string;
  filename: string;
  apiPath?: string;
  rows?: T[];
  columns?: CsvColumn<T>[];
  className?: string;
};

export default function ExportCsvButton<T extends Record<string, unknown>>({
  label = "Exportar CSV",
  filename,
  apiPath,
  rows,
  columns,
  className = "",
}: Props<T>) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      if (apiPath) {
        const sep = apiPath.includes("?") ? "&" : "?";
        await downloadCsvFromApi(`${apiPath}${sep}format=csv`, filename);
      } else if (rows && columns) {
        downloadCsvFromRows(filename, rows, columns);
      }
    } catch {
      alert("Não foi possível exportar o CSV.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={loading || (!apiPath && !(rows && columns))}
      className={
        className
          ? `rounded-lg border bg-white px-3 py-1.5 hover:bg-slate-50 disabled:opacity-50 ${className}`
          : "rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      }
    >
      {loading ? "A exportar…" : label}
    </button>
  );
}
