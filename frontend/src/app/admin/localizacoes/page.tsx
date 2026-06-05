"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Button, Card, Field, Input } from "@/components/ui/ui";

type Localizacao = { id: string; nome: string; ativo: boolean };
const BLOCO_PREFIXO = "Bloco: ";
const PISO_PREFIXO = "Piso: ";

const extrairNome = (nome: string, prefixo: string) => (nome.startsWith(prefixo) ? nome.slice(prefixo.length).trim() : null);

export default function AdminLocalizacoesPage() {
  const [items, setItems] = useState<Localizacao[]>([]);
  const [unidades, setUnidades] = useState<Array<{ id: string; nome: string }>>([]);
  const [unidadeId, setUnidadeId] = useState("");
  const [showBlocoForm, setShowBlocoForm] = useState(false);
  const [showPisoForm, setShowPisoForm] = useState(false);
  const [nomeBloco, setNomeBloco] = useState("");
  const [nomePiso, setNomePiso] = useState("");
  const [erro, setErro] = useState("");

  useEffect(() => {
    apiFetch<Array<{ id: string; nome: string }>>("/api/admin/unidades")
      .then((list) => {
        setUnidades(list);
        setUnidadeId((prev) => prev || list[0]?.id || "");
      })
      .catch(() => setUnidades([]));
  }, []);

  const load = () =>
    unidadeId
      ? apiFetch<Localizacao[]>(`/api/admin/localizacoes?unidadeId=${encodeURIComponent(unidadeId)}`)
          .then(setItems)
          .catch(() => setItems([]))
      : Promise.resolve(setItems([]));

  useEffect(() => {
    if (!unidadeId) return;
    void load();
  }, [unidadeId]);

  const blocos = items
    .map((item) => ({ ...item, valor: extrairNome(item.nome, BLOCO_PREFIXO) }))
    .filter((item): item is Localizacao & { valor: string } => Boolean(item.valor));

  const pisos = items
    .map((item) => ({ ...item, valor: extrairNome(item.nome, PISO_PREFIXO) }))
    .filter((item): item is Localizacao & { valor: string } => Boolean(item.valor));

  return (
    <main className="mx-auto max-w-5xl p-4 md:p-8">
      <h1 className="text-3xl font-bold">Localização</h1>

      {unidades.length > 1 && (
        <div className="mt-4 max-w-md">
          <Field label="Unidade" horizontal>
            <select
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              value={unidadeId}
              onChange={(e) => {
                setUnidadeId(e.target.value);
                setErro("");
              }}
            >
              {unidades.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                </option>
              ))}
            </select>
          </Field>
        </div>
      )}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">Registo de bloco</p>
            <Button
              className="bg-blue-700 hover:bg-blue-600 focus:ring-blue-300"
              onClick={() => {
                setShowBlocoForm((prev) => !prev);
                setErro("");
              }}
            >
              +
            </Button>
          </div>

          {showBlocoForm && (
            <div className="mt-2 flex gap-2">
              <Input value={nomeBloco} onChange={(e) => setNomeBloco(e.target.value)} placeholder="Ex.: Bloco A" />
              <Button
                disabled={!unidadeId}
                onClick={async () => {
                  setErro("");
                  try {
                    await apiFetch("/api/admin/localizacoes", {
                      method: "POST",
                      body: JSON.stringify({ nome: `${BLOCO_PREFIXO}${nomeBloco.trim()}`, unidadeId })
                    });
                    setNomeBloco("");
                    setShowBlocoForm(false);
                    await load();
                  } catch (e) {
                    setErro(e instanceof Error ? e.message : "Erro ao registar bloco");
                  }
                }}
              >
                Guardar
              </Button>
            </div>
          )}

          <div className="mt-3 grid gap-2">
            {blocos.map((item) => (
              <Card key={item.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{item.valor}</p>
                  {!item.ativo && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                      Desativado
                    </span>
                  )}
                </div>
                <Button
                  variant="secondary"
                  onClick={async () => {
                    try {
                      await apiFetch(
                        item.ativo ? `/api/admin/localizacoes/${item.id}` : `/api/admin/localizacoes/${item.id}/ativar`,
                        { method: item.ativo ? "DELETE" : "PATCH" }
                      );
                      await load();
                    } catch (e) {
                      setErro(e instanceof Error ? e.message : "Erro ao atualizar bloco");
                    }
                  }}
                >
                  {item.ativo ? "Desativar" : "Ativar"}
                </Button>
              </Card>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">Registo de piso</p>
            <Button
              className="bg-blue-700 hover:bg-blue-600 focus:ring-blue-300"
              onClick={() => {
                setShowPisoForm((prev) => !prev);
                setErro("");
              }}
            >
              +
            </Button>
          </div>

          {showPisoForm && (
            <div className="mt-2 flex gap-2">
              <Input value={nomePiso} onChange={(e) => setNomePiso(e.target.value)} placeholder="Ex.: Piso 1" />
              <Button
                disabled={!unidadeId}
                onClick={async () => {
                  setErro("");
                  try {
                    await apiFetch("/api/admin/localizacoes", {
                      method: "POST",
                      body: JSON.stringify({ nome: `${PISO_PREFIXO}${nomePiso.trim()}`, unidadeId })
                    });
                    setNomePiso("");
                    setShowPisoForm(false);
                    await load();
                  } catch (e) {
                    setErro(e instanceof Error ? e.message : "Erro ao registar piso");
                  }
                }}
              >
                Guardar
              </Button>
            </div>
          )}

          <div className="mt-3 grid gap-2">
            {pisos.map((item) => (
              <Card key={item.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{item.valor}</p>
                  {!item.ativo && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                      Desativado
                    </span>
                  )}
                </div>
                <Button
                  variant="secondary"
                  onClick={async () => {
                    try {
                      await apiFetch(
                        item.ativo ? `/api/admin/localizacoes/${item.id}` : `/api/admin/localizacoes/${item.id}/ativar`,
                        { method: item.ativo ? "DELETE" : "PATCH" }
                      );
                      await load();
                    } catch (e) {
                      setErro(e instanceof Error ? e.message : "Erro ao atualizar piso");
                    }
                  }}
                >
                  {item.ativo ? "Desativar" : "Ativar"}
                </Button>
              </Card>
            ))}
          </div>
        </Card>
      </div>
      {erro && <p className="mt-3 text-sm text-rose-600">{erro}</p>}
    </main>
  );
}
