"use client";

import { useEffect, useState } from "react";
import RoomCard from "@/components/rooms/RoomCard";
import { apiFetch } from "@/lib/api";
import { Sala } from "@/lib/types";

export default function SalasPage() {
  const [salas, setSalas] = useState<Sala[]>([]);
  const [erro, setErro] = useState("");

  useEffect(() => {
    apiFetch<Sala[]>("/api/salas").then(setSalas).catch((e) => setErro(e.message));
  }, []);

  return (
    <main className="mx-auto max-w-6xl p-8">
      <h1 className="text-3xl font-bold">Salas</h1>
      {erro && <p className="mt-2 text-sm text-red-600">{erro}</p>}
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {salas.map((s) => <RoomCard key={s.id} sala={s} />)}
      </div>
    </main>
  );
}
