"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type Viatura = {
  id: string;
  nome: string;
  matricula: string;
  localizacao: string;
  capacidade: number;
};

export default function ViaturasPage() {
  const [viaturas, setViaturas] = useState<Viatura[]>([]);

  useEffect(() => {
    apiFetch<Viatura[]>("/api/viaturas").then(setViaturas).catch(console.error);
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4 text-viaturas">Viaturas</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {viaturas.map((v) => (
          <Link
            key={v.id}
            href={`/espacos/viaturas/${v.id}/calendario`}
            className="bg-white rounded-xl border p-4 hover:border-viaturas"
          >
            <h2 className="font-semibold">{v.nome}</h2>
            <p className="text-sm text-slate-600">{v.matricula}</p>
          </Link>
        ))}
      </div>
      {viaturas.length === 0 && <p className="text-slate-500">Nenhuma viatura registada.</p>}
    </div>
  );
}
