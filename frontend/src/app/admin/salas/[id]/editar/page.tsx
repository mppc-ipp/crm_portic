"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { API_URL, apiFetch, withAuthHeaders } from "@/lib/api";
import { SessaoUtilizador } from "@/lib/types";
import { Button, Card, Field, Input } from "@/components/ui/ui";
import ComunidadeNaoAcademicaSwitch from "@/components/rooms/ComunidadeNaoAcademicaSwitch";

const BLOCO_PREFIXO = "Bloco: ";
const PISO_PREFIXO = "Piso: ";

const limparPrefixo = (nome: string, prefixo: string) => (nome.startsWith(prefixo) ? nome.slice(prefixo.length).trim() : "");
const separarLocalizacao = (localizacao: string | null | undefined) => {
  const valor = (localizacao ?? "").trim();
  if (!valor) return { bloco: "", piso: "" };
  const [bloco = "", piso = ""] = valor.split(" - ").map((parte) => parte.trim());
  return { bloco, piso };
};

export default function AdminSalaEditar() {
  const params = useParams<{ id: string }>();
  const salaId = String(params.id);
  const [sessao, setSessao] = useState<SessaoUtilizador | null>(null);
  const [form, setForm] = useState<any>(null);
  const [localizacoes, setLocalizacoes] = useState<Array<{ id: string; nome: string }>>([]);
  const [unidades, setUnidades] = useState<Array<{ id: string; nome: string }>>([]);
  const [msg, setMsg] = useState("");
  const [foto, setFoto] = useState<File | null>(null);

  const blocos = localizacoes.map((item) => limparPrefixo(item.nome, BLOCO_PREFIXO)).filter(Boolean);
  const pisos = localizacoes.map((item) => limparPrefixo(item.nome, PISO_PREFIXO)).filter(Boolean);

  const isAdminUnidade = sessao?.tipo === "ADMIN_UNIDADE";

  const carregarLocalizacoes = async (unidadeId: string) => {
    const loc = await apiFetch<Array<{ id: string; nome: string }>>(
      `/api/admin/localizacoes?unidadeId=${encodeURIComponent(unidadeId)}`
    ).catch(() => []);
    setLocalizacoes(loc);
  };

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [sala, me, listaUnidades] = await Promise.all([
        apiFetch<any>(`/api/salas/${salaId}`).catch(() => null),
        apiFetch<SessaoUtilizador>("/api/auth/me").catch(() => null),
        apiFetch<Array<{ id: string; nome: string }>>("/api/admin/unidades").catch(() => [])
      ]);
      if (cancelled || !sala || !me) return;
      const { bloco, piso } = separarLocalizacao(sala.localizacao);
      setForm({ ...sala, bloco, piso });
      setSessao(me);
      setUnidades(listaUnidades);
      await carregarLocalizacoes(String(sala.unidadeId));
    })();
    return () => {
      cancelled = true;
    };
  }, [salaId]);

  if (!form) return <main className="p-8">A carregar...</main>;

  return (
    <main className="mx-auto max-w-3xl p-4 md:p-8">
      <Card>
        <h1 className="text-3xl font-bold">Editar sala</h1>
        <div className="mt-3 grid gap-2">
          <Field label="Nome" horizontal>
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </Field>
          <Field label="Capacidade" horizontal>
            <Input type="number" value={form.capacidade} onChange={(e) => setForm({ ...form, capacidade: Number(e.target.value) })} />
          </Field>
          <Field label="Descrição" horizontal>
            <Input value={form.descricao ?? ""} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
          </Field>
          <Field label="Bloco" horizontal>
            <select
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              value={form.bloco ?? ""}
              onChange={(e) => setForm({ ...form, bloco: e.target.value })}
            >
              {[...new Set([form.bloco, ...blocos].filter(Boolean))].map((bloco) => (
                <option key={bloco} value={bloco}>
                  {bloco}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Piso" horizontal>
            <select
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              value={form.piso ?? ""}
              onChange={(e) => setForm({ ...form, piso: e.target.value })}
            >
              {[...new Set([form.piso, ...pisos].filter(Boolean))].map((piso) => (
                <option key={piso} value={piso}>
                  {piso}
                </option>
              ))}
            </select>
          </Field>
          {!isAdminUnidade && (
            <Field label="Unidade" horizontal>
              <select
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                value={form.unidadeId ?? ""}
                onChange={(e) => {
                  const uid = e.target.value;
                  setForm({ ...form, unidadeId: uid });
                  void carregarLocalizacoes(uid);
                }}
              >
                {unidades.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <ComunidadeNaoAcademicaSwitch
            ativo={form.visibilidade === "PUBLICO_GERAL"}
            onChange={(ativo) =>
              setForm({
                ...form,
                visibilidade: ativo ? "PUBLICO_GERAL" : "COMUNIDADE_ACADEMICA"
              })
            }
          />
          <Field label="Foto" horizontal>
            <Input type="file" accept="image/*" onChange={(e) => setFoto(e.target.files?.[0] ?? null)} />
          </Field>
          <Button
            onClick={async () => {
              const fd = new FormData();
              fd.append("nome", form.nome);
              fd.append("capacidade", String(form.capacidade));
              fd.append("descricao", form.descricao);
              fd.append("localizacao", `${form.bloco} - ${form.piso}`);
              fd.append("recursos", JSON.stringify(form.recursos ?? []));
              fd.append("mobilidadeReduzida", String(form.mobilidadeReduzida));
              fd.append("status", form.status);
              fd.append("unidadeId", form.unidadeId ?? "");
              fd.append("visibilidade", form.visibilidade ?? "COMUNIDADE_ACADEMICA");
              if (foto) fd.append("foto", foto);
              const res = await fetch(`${API_URL}/api/admin/salas/${salaId}`, {
                method: "PUT",
                credentials: "include",
                headers: withAuthHeaders(),
                body: fd
              });
              setMsg(res.ok ? "Sala atualizada." : "Erro ao atualizar.");
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
