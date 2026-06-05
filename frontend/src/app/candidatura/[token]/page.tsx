"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function CandidaturaPublicaPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [submetido, setSubmetido] = useState(false);
  const [erro, setErro] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro("");
    const form = e.currentTarget;
    const fd = new FormData(form);
    try {
      const res = await fetch(`${API}/startups/candidatura/${token}/`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) throw new Error("Falha ao submeter");
      setSubmetido(true);
    } catch {
      setErro("Não foi possível submeter. O formulário pode estar fechado.");
    }
  }

  if (submetido) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="bg-white rounded-xl p-8 max-w-md text-center shadow">
          <h1 className="text-xl font-bold text-green-700">Candidatura submetida</h1>
          <p className="text-slate-600 mt-2">Obrigado. Entraremos em contacto em breve.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <form onSubmit={onSubmit} className="bg-white rounded-xl p-8 max-w-lg w-full shadow space-y-4">
        <h1 className="text-xl font-bold">Candidatura</h1>
        <p className="text-sm text-slate-600">Preencha os dados da sua startup.</p>
        {erro && <p className="text-red-600 text-sm">{erro}</p>}
        <label className="block text-sm">
          Nome da startup *
          <input name="nome_startup" required className="mt-1 w-full border rounded-lg px-3 py-2" />
        </label>
        <label className="block text-sm">
          Email de contacto *
          <input name="email_contacto" type="email" required className="mt-1 w-full border rounded-lg px-3 py-2" />
        </label>
        <button type="submit" className="w-full bg-portic text-white py-2 rounded-lg font-medium">
          Submeter
        </button>
        <p className="text-xs text-slate-400">
          Formulário público — ainda em migração para API completa. Use o Django Admin para campos dinâmicos.
        </p>
      </form>
    </div>
  );
}
