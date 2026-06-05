"use client";

import Link from "next/link";

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <p className="text-slate-600 mb-4">Resumo do CRM Portic.</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/projetos" className="p-4 bg-white border rounded-xl hover:border-portic">
          Projetos
        </Link>
        <Link href="/salas" className="p-4 bg-white border rounded-xl hover:border-portic">
          Salas
        </Link>
        <Link href="/minhas-reservas" className="p-4 bg-white border rounded-xl hover:border-portic">
          Minhas reservas
        </Link>
        <Link href="/admin/reservas" className="p-4 bg-white border rounded-xl hover:border-portic">
          Aprovar reservas
        </Link>
      </div>
    </div>
  );
}
