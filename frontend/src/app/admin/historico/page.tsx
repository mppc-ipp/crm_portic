"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Button, Card } from "@/components/ui/ui";
import { endOfDay, format } from "date-fns";

export default function AdminHistoricoPage() {
  const [items, setItems] = useState<any[]>([]);
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; message: string } | null>(null);
  const [statusFilter, setStatusFilter] = useState<"TODOS" | "APROVADO" | "REJEITADO">("TODOS");
  const [dateFilter, setDateFilter] = useState("");
  const [roomFilter, setRoomFilter] = useState("TODAS");

  useEffect(() => {
    apiFetch<any[]>("/api/admin/historico")
      .then(setItems)
      .catch(() => setItems([]));
  }, []);

  const getStatusTagStyle = (status: string) => {
    if (status === "APROVADO") return "bg-emerald-100 text-emerald-700 border border-emerald-200";
    if (status === "REJEITADO") return "bg-rose-100 text-rose-700 border border-rose-200";
    return "bg-slate-100 text-slate-700 border border-slate-200";
  };

  const getStatusLabel = (status: string) => {
    if (status === "APROVADO") return "Aprovado";
    if (status === "REJEITADO") return "Rejeitado";
    return status;
  };

  const formatPeriodoReserva = (ocorrencias: any[] = []) => {
    if (!ocorrencias.length) return "Sem período definido";
    const sorted = [...ocorrencias].sort(
      (a, b) => new Date(a.dataInicio).getTime() - new Date(b.dataInicio).getTime()
    );
    const inicio = new Date(sorted[0].dataInicio);
    const fim = new Date(sorted[sorted.length - 1].dataFim);
    return `${format(inicio, "dd/MM/yyyy HH:mm")} - ${format(fim, "dd/MM/yyyy HH:mm")}`;
  };

  const formatLocalizacao = (ocorrencias: any[] = []) => {
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

  const canRejectApproved = (item: any) => {
    if (item.status !== "APROVADO") return false;
    if (!item.ocorrencias?.length) return false;
    const primeiraOcorrencia = item.ocorrencias.reduce((menor: Date, atual: any) => {
      const inicioAtual = new Date(atual.dataInicio);
      return inicioAtual.getTime() < menor.getTime() ? inicioAtual : menor;
    }, new Date(item.ocorrencias[0].dataInicio));
    return Date.now() <= endOfDay(primeiraOcorrencia).getTime();
  };

  const handleReject = async (id: string) => {
    setFeedback(null);
    try {
      await apiFetch(`/api/admin/reservas/${id}/rejeitar`, { method: "PATCH" });
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, status: "REJEITADO" } : item)));
      setFeedback({ type: "success", message: "Reserva alterada para rejeitada com sucesso." });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao rejeitar a reserva.";
      setFeedback({ type: "error", message });
    }
  };

  const roomOptions = useMemo(() => {
    const optionsMap = new Map<string, string>();
    items.forEach((item) => {
      item.ocorrencias?.forEach((oc: any) => {
        if (oc.sala?.id) {
          const label = oc.sala?.nome ?? "Sala sem nome";
          optionsMap.set(oc.sala.id, label);
        }
      });
    });
    return Array.from(optionsMap.entries())
      .map(([id, nome]) => ({ id, nome }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const statusOk = statusFilter === "TODOS" || item.status === statusFilter;
      if (!statusOk) return false;

      const roomOk =
        roomFilter === "TODAS" ||
        item.ocorrencias?.some((oc: any) => oc.sala?.id === roomFilter);
      if (!roomOk) return false;

      const dateOk =
        !dateFilter ||
        item.ocorrencias?.some((oc: any) => String(oc.dataInicio).slice(0, 10) === dateFilter);
      return Boolean(dateOk);
    });
  }, [items, statusFilter, roomFilter, dateFilter]);

  return (
    <main className="mx-auto max-w-6xl p-4 md:p-8">
      <h1 className="text-3xl font-bold">Histórico de reservas</h1>
      {feedback && (
        <div
          role="alert"
          className={`mt-4 flex items-start justify-between gap-3 rounded-lg border px-3 py-2 text-sm ${
            feedback.type === "error"
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="text-xs font-medium underline">
            Fechar
          </button>
        </div>
      )}
      <div className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-3">
        <label className="grid gap-1 text-sm text-slate-700">
          <span className="font-medium">Estado</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "TODOS" | "APROVADO" | "REJEITADO")}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          >
            <option value="TODOS">Todos</option>
            <option value="APROVADO">Aprovado</option>
            <option value="REJEITADO">Rejeitado</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm text-slate-700">
          <span className="font-medium">Data</span>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
        </label>
        <label className="grid gap-1 text-sm text-slate-700">
          <span className="font-medium">Sala</span>
          <select
            value={roomFilter}
            onChange={(e) => setRoomFilter(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          >
            <option value="TODAS">Todas</option>
            {roomOptions.map((room) => (
              <option key={room.id} value={room.id}>
                {room.nome}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="mt-4 space-y-4">
        {filteredItems.map((item) => (
          <Card key={item.id} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-lg font-semibold text-slate-900">{item.titulo}</p>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${getStatusTagStyle(item.status)}`}>
                    {getStatusLabel(item.status)}
                  </span>
                </div>
                <p className="text-sm text-slate-700">{item.descricao}</p>
                <p className="text-sm text-slate-700">
                  <span className="font-medium">Utilizador do pedido:</span> {item.usuario?.nome ?? "Não informado"}
                </p>
                <p className="text-sm text-slate-700">
                  <span className="font-medium">Quantidade de pessoas:</span> {item.numeroPessoas}
                </p>
                <p className="text-sm text-slate-700">
                  <span className="font-medium">Período de reserva:</span> {formatPeriodoReserva(item.ocorrencias)}
                </p>
                <p className="text-sm text-slate-700">
                  <span className="font-medium">Localização:</span> {formatLocalizacao(item.ocorrencias)}
                </p>
              </div>
              <div className="flex gap-2">
                {canRejectApproved(item) && (
                  <Button
                    variant="danger"
                    onClick={() => handleReject(item.id)}
                    title="Trocar para rejeitado"
                    aria-label="Trocar para rejeitado"
                  >
                    X
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
        {!filteredItems.length && <p className="text-sm text-slate-600">Não há reservas para os filtros selecionados.</p>}
      </div>
    </main>
  );
}
