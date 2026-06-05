"use client";

import clsx from "clsx";
import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Button, Card } from "@/components/ui/ui";
import { Sala } from "@/lib/types";
import { format } from "date-fns";

type Reserva = {
  id: string;
  titulo: string;
  descricao: string;
  numeroPessoas: number;
  status: string;
  criadoEm: string;
  ocorrencias: Array<{
    id: string;
    dataInicio: string;
    dataFim: string;
    sala?: { nome?: string; localizacao?: string } | null;
  }>;
};

export default function MinhasReservasPage() {
  const [items, setItems] = useState<Reserva[]>([]);
  const [salas, setSalas] = useState<Sala[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [unidadesAbertas, setUnidadesAbertas] = useState<Set<string>>(() => new Set());
  const [leavingIds, setLeavingIds] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<"TODOS" | "APROVADO" | "PENDENTE" | "REJEITADO">("TODOS");
  useEffect(() => { apiFetch<Reserva[]>("/api/minhas-reservas").then(setItems).catch(() => setItems([])); }, []);
  useEffect(() => { apiFetch<Sala[]>("/api/salas").then(setSalas).catch(() => setSalas([])); }, []);

  const formatPeriodoReserva = (ocorrencias: Reserva["ocorrencias"] = []) => {
    if (!ocorrencias.length) return "Sem período definido";
    const sorted = [...ocorrencias].sort(
      (a, b) => new Date(a.dataInicio).getTime() - new Date(b.dataInicio).getTime()
    );
    const inicio = new Date(sorted[0].dataInicio);
    const fim = new Date(sorted[sorted.length - 1].dataFim);
    return `${format(inicio, "dd/MM/yyyy HH:mm")} - ${format(fim, "dd/MM/yyyy HH:mm")}`;
  };

  const formatLocalizacao = (ocorrencias: Reserva["ocorrencias"] = []) => {
    if (!ocorrencias.length) return "Sem localização definida";
    const locais = Array.from(
      new Set(
        ocorrencias.map((o) => {
          const salaNome = o.sala?.nome ?? "Sala não informada";
          const localizacaoSala = o.sala?.localizacao ?? "Bloco/Piso não informados";
          return `${salaNome} - ${localizacaoSala}`;
        })
      )
    );
    return locais.join(" | ");
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Deseja cancelar esta reserva?")) return;
    try {
      await apiFetch(`/api/reservas/${id}/cancelar`, { method: "PATCH" });
      setLeavingIds((prev) => [...prev, id]);
      window.setTimeout(() => {
        setItems((prev) => prev.filter((item) => item.id !== id));
        setLeavingIds((prev) => prev.filter((itemId) => itemId !== id));
      }, 220);
    } catch {
      // AppShell handles unauthenticated redirects.
    }
  };

  const canDeleteReserva = (reserva: Reserva) => {
    const statusPermite = reserva.status === "PENDENTE" || reserva.status === "APROVADO";
    if (!statusPermite) return false;
    if (!reserva.ocorrencias?.length) return false;

    const primeiraOcorrencia = reserva.ocorrencias.reduce((menor, atual) => {
      const inicioAtual = new Date(atual.dataInicio);
      return inicioAtual.getTime() < menor.getTime() ? inicioAtual : menor;
    }, new Date(reserva.ocorrencias[0].dataInicio));

    const diffMs = primeiraOcorrencia.getTime() - Date.now();
    const vinteQuatroHorasMs = 24 * 60 * 60 * 1000;
    return diffMs > vinteQuatroHorasMs;
  };

  const getStatusTagStyle = (status: string) => {
    if (status === "APROVADO") {
      return "bg-emerald-100 text-emerald-700 border border-emerald-200";
    }
    if (status === "REJEITADO") {
      return "bg-rose-100 text-rose-700 border border-rose-200";
    }
    return "bg-amber-100 text-amber-700 border border-amber-200";
  };

  const filteredItems = items.filter((item) => statusFilter === "TODOS" || item.status === statusFilter);

  const salasPorUnidade = salas.reduce<Record<string, { nome: string; rooms: Sala[] }>>((acc, sala) => {
    const uid = sala.unidade?.id ?? sala.unidadeId ?? "_sem";
    const unome = sala.unidade?.nome ?? "Sem unidade";
    if (!acc[uid]) acc[uid] = { nome: unome, rooms: [] };
    acc[uid].rooms.push(sala);
    return acc;
  }, {});

  const unidadeEntries = Object.entries(salasPorUnidade).sort((a, b) => a[1].nome.localeCompare(b[1].nome));

  const alternarUnidadePicker = (uid: string) => {
    setUnidadesAbertas((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };

  return (
    <main className="mx-auto max-w-5xl p-4 md:p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Minhas reservas</h1>
        <Button className="bg-blue-700 hover:bg-blue-600 focus:ring-blue-300" onClick={() => setShowPicker(true)}>+</Button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {[
          { key: "TODOS", label: "Todos" },
          { key: "APROVADO", label: "Aprovado" },
          { key: "PENDENTE", label: "Pendente" },
          { key: "REJEITADO", label: "Rejeitado" }
        ].map((filter) => {
          const selected = statusFilter === filter.key;
          const baseStyle =
            filter.key === "APROVADO"
              ? getStatusTagStyle("APROVADO")
              : filter.key === "REJEITADO"
                ? getStatusTagStyle("REJEITADO")
                : filter.key === "PENDENTE"
                  ? getStatusTagStyle("PENDENTE")
                  : "bg-slate-100 text-slate-700 border border-slate-200";
          return (
            <button
              key={filter.key}
              onClick={() => setStatusFilter(filter.key as "TODOS" | "APROVADO" | "PENDENTE" | "REJEITADO")}
              className={`rounded-full px-3 py-1 text-sm font-semibold transition ${
                selected ? `${baseStyle} ring-2 ring-slate-300` : `${baseStyle} opacity-80 hover:opacity-100`
              }`}
            >
              {filter.label}
            </button>
          );
        })}
      </div>
      <div className="mt-4 space-y-4">
        {filteredItems.map((r) => (
          <Card
            key={r.id}
            className={`p-5 transition-all duration-200 ${
              leavingIds.includes(r.id) ? "translate-x-full opacity-0" : "translate-x-0 opacity-100"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-lg font-semibold text-slate-900">{r.titulo}</p>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${getStatusTagStyle(r.status)}`}>
                    {r.status === "APROVADO" ? "Aprovado" : r.status === "REJEITADO" ? "Rejeitado" : "Pendente"}
                  </span>
                </div>
                <p className="text-sm text-slate-700">{r.descricao}</p>
                <p className="text-sm text-slate-700">
                  <span className="font-medium">Quantidade de pessoas:</span> {r.numeroPessoas}
                </p>
                <p className="text-sm text-slate-700">
                  <span className="font-medium">Período de reserva:</span> {formatPeriodoReserva(r.ocorrencias)}
                </p>
                <p className="text-sm text-slate-700">
                  <span className="font-medium">Localização:</span> {formatLocalizacao(r.ocorrencias)}
                </p>
              </div>
              <div className="flex gap-2">
                {canDeleteReserva(r) && (
                  <Button
                    variant="danger"
                    onClick={() => handleDelete(r.id)}
                    title="Eliminar reserva"
                    aria-label="Eliminar reserva"
                  >
                    🗑
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
        {!filteredItems.length && (
          <p className="text-sm text-slate-600">
            {items.length ? "Não há reservas com este estado." : "Ainda não tem reservas."}
          </p>
        )}
      </div>
      {showPicker && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-lg">
            <h2 className="text-xl font-semibold">Escolher sala para reservar</h2>
            <div className="mt-3 grid max-h-[60vh] gap-2 overflow-y-auto pr-1">
              {unidadeEntries.map(([uid, { nome, rooms }]) => {
                const aberta = unidadesAbertas.has(uid);
                return (
                  <div key={uid} className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50/80">
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 px-3 py-3 text-left font-semibold text-slate-800 transition-colors hover:bg-slate-100/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
                      aria-expanded={aberta}
                      onClick={() => alternarUnidadePicker(uid)}
                    >
                      <span
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600"
                        aria-hidden
                      >
                        <svg
                          className={clsx(
                            "h-4 w-4 transition-transform duration-300 ease-out motion-reduce:transition-none",
                            aberta && "-rotate-180"
                          )}
                          viewBox="0 0 20 20"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                        >
                          <path d="M5 7.5L10 12.5L15 7.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                      <span className="min-w-0 flex-1 truncate">{nome}</span>
                      <span className="shrink-0 text-xs font-normal text-slate-500">{rooms.length} sala(s)</span>
                    </button>
                    <div
                      className={clsx(
                        "grid transition-[grid-template-rows] duration-300 ease-in-out motion-reduce:transition-none",
                        aberta ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                      )}
                    >
                      <div className="min-h-0 overflow-hidden">
                        <div className="border-t border-slate-200 px-2 pb-3 pt-1">
                          <div className="grid gap-2">
                            {[...rooms].sort((a, b) => a.capacidade - b.capacidade).map((s) => (
                              <div
                                key={s.id}
                                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3"
                              >
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="font-semibold">{s.nome}</p>
                                    <span
                                      className="inline-flex h-5 w-5 cursor-help items-center justify-center rounded-full border border-slate-300 text-xs text-slate-600"
                                      title={s.descricao}
                                    >
                                      i
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-500">Máx. pessoas: {s.capacidade}</p>
                                </div>
                                <Link
                                  href={`/salas/${s.id}/calendario`}
                                  className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white"
                                >
                                  Fazer reserva
                                </Link>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <Button variant="secondary" className="mt-3" onClick={() => setShowPicker(false)}>Fechar</Button>
          </Card>
        </div>
      )}
    </main>
  );
}
