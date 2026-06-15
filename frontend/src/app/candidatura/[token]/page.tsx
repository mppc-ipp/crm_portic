"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8002";

type Campo = {
  id: number;
  ordem: number;
  nome: string;
  tipo: string;
  obrigatorio: boolean;
  opcoes: string[];
};

type FormularioPublico = {
  titulo: string;
  campos: Campo[];
};

const inputClass = "mt-1 w-full rounded-lg border px-3 py-2";

export default function CandidaturaPublicaPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [formulario, setFormulario] = useState<FormularioPublico | null>(null);
  const [valores, setValores] = useState<Record<string, string>>({});
  const [submetido, setSubmetido] = useState(false);
  const [erro, setErro] = useState("");
  const [aEnviar, setAEnviar] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch(`${API}/api/startups/candidatura-publica/${token}`)
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error ?? "Formulário indisponível");
        }
        return res.json() as Promise<FormularioPublico>;
      })
      .then(setFormulario)
      .catch((e) => setErro(e instanceof Error ? e.message : "Erro ao carregar"))
      .finally(() => setLoading(false));
  }, [token]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErro("");
    setAEnviar(true);
    try {
      const res = await fetch(`${API}/api/startups/candidatura-publica/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ respostas: valores }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Falha ao submeter");
      }
      setSubmetido(true);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível submeter.");
    } finally {
      setAEnviar(false);
    }
  }

  function renderCampo(campo: Campo) {
    const value = valores[String(campo.id)] ?? "";
    const onChange = (v: string) =>
      setValores((prev) => ({ ...prev, [String(campo.id)]: v }));

    if (campo.tipo === "TEXTAREA") {
      return (
        <textarea
          required={campo.obrigatorio}
          rows={4}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        />
      );
    }
    if (campo.tipo === "CHOICE") {
      return (
        <select
          required={campo.obrigatorio}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        >
          <option value="">—</option>
          {campo.opcoes.map((op) => (
            <option key={op} value={op}>
              {op}
            </option>
          ))}
        </select>
      );
    }
    const inputType =
      campo.tipo === "EMAIL" ? "email" : campo.tipo === "NUMBER" ? "number" : "text";
    return (
      <input
        type={inputType}
        required={campo.obrigatorio}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      />
    );
  }

  if (submetido) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
        <div className="max-w-md rounded-xl bg-white p-8 text-center shadow">
          <h1 className="text-xl font-bold text-green-700">Candidatura submetida</h1>
          <p className="mt-2 text-slate-600">Obrigado. Entraremos em contacto em breve.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
        <p className="text-slate-500">A carregar formulário…</p>
      </div>
    );
  }

  if (erro && !formulario) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
        <div className="max-w-md rounded-xl bg-white p-8 text-center shadow">
          <h1 className="text-xl font-bold text-red-700">Formulário indisponível</h1>
          <p className="mt-2 text-slate-600">{erro}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-lg space-y-4 rounded-xl bg-white p-8 shadow"
      >
        <div>
          <h1 className="text-xl font-bold">{formulario?.titulo ?? "Candidatura"}</h1>
        </div>

        {erro && <p className="text-sm text-red-600">{erro}</p>}

        {formulario?.campos
          .slice()
          .sort((a, b) => a.ordem - b.ordem)
          .map((campo) => (
            <label key={campo.id} className="block text-sm">
              {campo.nome}
              {campo.obrigatorio ? " *" : ""}
              {renderCampo(campo)}
            </label>
          ))}

        <button
          type="submit"
          disabled={aEnviar}
          className="w-full rounded-lg bg-portic py-2 font-medium text-white disabled:opacity-50"
        >
          {aEnviar ? "A submeter…" : "Submeter candidatura"}
        </button>
      </form>
    </div>
  );
}
