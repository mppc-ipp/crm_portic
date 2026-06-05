"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { API_URL, apiFetch, withAuthHeaders } from "@/lib/api";
import { SessaoUtilizador } from "@/lib/types";
import { Button, Card, Field, Input } from "@/components/ui/ui";
import ComunidadeNaoAcademicaSwitch from "@/components/rooms/ComunidadeNaoAcademicaSwitch";

const BLOCO_PREFIXO = "Bloco: ";
const PISO_PREFIXO = "Piso: ";
const limparPrefixo = (nome: string, prefixo: string) => (nome.startsWith(prefixo) ? nome.slice(prefixo.length).trim() : "");

export default function AdminSalaNova() {
  const router = useRouter();
  const [sessao, setSessao] = useState<SessaoUtilizador | null>(null);
  const [form, setForm] = useState({
    nome: "",
    capacidade: 10,
    descricao: "",
    bloco: "",
    piso: "",
    recursos: "",
    mobilidadeReduzida: false,
    status: "DISPONIVEL",
    unidadeId: "",
    abertaComunidadeNaoAcademica: false
  });
  const [msg, setMsg] = useState("");
  const [localizacoes, setLocalizacoes] = useState<Array<{ id: string; nome: string }>>([]);
  const [unidades, setUnidades] = useState<Array<{ id: string; nome: string }>>([]);

  const blocos = localizacoes.map((item) => limparPrefixo(item.nome, BLOCO_PREFIXO)).filter(Boolean);
  const pisos = localizacoes.map((item) => limparPrefixo(item.nome, PISO_PREFIXO)).filter(Boolean);

  const isAdminUnidade = sessao?.tipo === "ADMIN_UNIDADE";

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const me = await apiFetch<SessaoUtilizador>("/api/auth/me").catch(() => null);
      if (cancelled || !me) return;
      setSessao(me);

      const dataUnidades = await apiFetch<Array<{ id: string; nome: string }>>("/api/admin/unidades").catch(() => []);
      if (cancelled) return;
      setUnidades(dataUnidades);
      const uidDefault = dataUnidades[0]?.id ?? "";

      if (me.tipo === "ADMIN_UNIDADE") {
        if (!uidDefault) return;
        setForm((prev) => ({ ...prev, unidadeId: uidDefault }));
        const data = await apiFetch<Array<{ id: string; nome: string }>>(
          `/api/admin/localizacoes?unidadeId=${encodeURIComponent(uidDefault)}`
        ).catch(() => []);
        if (cancelled) return;
        setLocalizacoes(data);
        const primeiroBloco = data.map((item) => limparPrefixo(item.nome, BLOCO_PREFIXO)).find(Boolean) ?? "";
        const primeiroPiso = data.map((item) => limparPrefixo(item.nome, PISO_PREFIXO)).find(Boolean) ?? "";
        setForm((prev) => ({ ...prev, bloco: prev.bloco || primeiroBloco, piso: prev.piso || primeiroPiso }));
        return;
      }

      setForm((prev) => ({ ...prev, unidadeId: prev.unidadeId || uidDefault }));
      if (!uidDefault) return;
      const data = await apiFetch<Array<{ id: string; nome: string }>>(
        `/api/admin/localizacoes?unidadeId=${encodeURIComponent(uidDefault)}`
      ).catch(() => []);
      if (cancelled) return;
      setLocalizacoes(data);
      const primeiroBloco = data.map((item) => limparPrefixo(item.nome, BLOCO_PREFIXO)).find(Boolean) ?? "";
      const primeiroPiso = data.map((item) => limparPrefixo(item.nome, PISO_PREFIXO)).find(Boolean) ?? "";
      setForm((prev) => ({ ...prev, bloco: prev.bloco || primeiroBloco, piso: prev.piso || primeiroPiso }));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const carregarLocalizacoesSuper = async (uid: string) => {
    const data = await apiFetch<Array<{ id: string; nome: string }>>(
      `/api/admin/localizacoes?unidadeId=${encodeURIComponent(uid)}`
    ).catch(() => []);
    setLocalizacoes(data);
    const primeiroBloco = data.map((item) => limparPrefixo(item.nome, BLOCO_PREFIXO)).find(Boolean) ?? "";
    const primeiroPiso = data.map((item) => limparPrefixo(item.nome, PISO_PREFIXO)).find(Boolean) ?? "";
    setForm((prev) => ({
      ...prev,
      unidadeId: uid,
      bloco: primeiroBloco || prev.bloco,
      piso: primeiroPiso || prev.piso
    }));
  };

  return (
    <main className="mx-auto max-w-3xl p-4 md:p-8">
      <Card>
        <h1 className="text-3xl font-bold">Nova sala</h1>
        <div className="mt-3 grid gap-2">
          <Field label="Nome" horizontal>
            <Input placeholder="Nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </Field>
          <Field label="Capacidade" horizontal>
            <Input
              type="number"
              placeholder="Capacidade"
              value={form.capacidade}
              onChange={(e) => setForm({ ...form, capacidade: Number(e.target.value) })}
            />
          </Field>
          <Field label="Descrição" horizontal>
            <Input placeholder="Descrição" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
          </Field>
          {!isAdminUnidade && (
            <Field label="Unidade" horizontal>
              <select
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                value={form.unidadeId}
                onChange={(e) => {
                  void carregarLocalizacoesSuper(e.target.value);
                }}
              >
                {!unidades.length && <option value="">Nenhuma unidade disponível</option>}
                {unidades.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <ComunidadeNaoAcademicaSwitch
            ativo={form.abertaComunidadeNaoAcademica}
            onChange={(ativo) => setForm({ ...form, abertaComunidadeNaoAcademica: ativo })}
          />
          <Field label="Bloco" horizontal>
            <select
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              value={form.bloco}
              onChange={(e) => setForm({ ...form, bloco: e.target.value })}
            >
              {!blocos.length && <option value="">Nenhum bloco cadastrado</option>}
              {blocos.map((bloco) => (
                <option key={bloco} value={bloco}>
                  {bloco}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Piso" horizontal>
            <select
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              value={form.piso}
              onChange={(e) => setForm({ ...form, piso: e.target.value })}
            >
              {!pisos.length && <option value="">Nenhum piso cadastrado</option>}
              {pisos.map((piso) => (
                <option key={piso} value={piso}>
                  {piso}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Recursos" horizontal>
            <Input
              placeholder="Recursos separados por vírgula"
              value={form.recursos}
              onChange={(e) => setForm({ ...form, recursos: e.target.value })}
            />
          </Field>
          <Button
            disabled={!form.bloco || !form.piso || !form.unidadeId}
            onClick={async () => {
              const fd = new FormData();
              fd.append("nome", form.nome);
              fd.append("capacidade", String(form.capacidade));
              fd.append("descricao", form.descricao);
              fd.append("localizacao", `${form.bloco} - ${form.piso}`);
              fd.append("recursos", JSON.stringify(form.recursos.split(",").map((r) => r.trim()).filter(Boolean)));
              fd.append("mobilidadeReduzida", String(form.mobilidadeReduzida));
              fd.append("status", form.status);
              fd.append("unidadeId", form.unidadeId);
              fd.append("visibilidade", form.abertaComunidadeNaoAcademica ? "PUBLICO_GERAL" : "COMUNIDADE_ACADEMICA");
              const res = await fetch(`${API_URL}/api/admin/salas`, {
                method: "POST",
                credentials: "include",
                headers: withAuthHeaders(),
                body: fd
              });
              if (res.ok) {
                router.push("/admin/salas");
                router.refresh();
                return;
              }
              setMsg("Erro ao criar sala.");
            }}
          >
            Guardar
          </Button>
        </div>
        {msg && <p className="mt-2 text-sm">{msg}</p>}
      </Card>
    </main>
  );
}
