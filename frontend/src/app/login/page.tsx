"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { login } from "@/lib/api";
import { rotaAposLogin } from "@/lib/routes";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@admin.com");
  const [password, setPassword] = useState("admin123");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErro("");
    try {
      const { user } = await login(email, password);
      router.push(rotaAposLogin(user.modulos, user.admin_geral));
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao entrar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <form
        onSubmit={onSubmit}
        className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md space-y-4"
      >
        <h1 className="text-2xl font-bold text-portic">CRM Portic</h1>
        <p className="text-slate-600 text-sm">Entre com o seu email e palavra-passe</p>
        {erro && <p className="text-red-600 text-sm">{erro}</p>}
        <label className="block">
          <span className="text-sm">Email</span>
          <input
            type="email"
            required
            className="mt-1 w-full border rounded-lg px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </label>
        <label className="block">
          <span className="text-sm">Palavra-passe</span>
          <input
            type="password"
            className="mt-1 w-full border rounded-lg px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-portic text-white py-2 rounded-lg font-medium hover:bg-portic-light disabled:opacity-50"
        >
          {loading ? "A entrar…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
