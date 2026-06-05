"use client";

import { useState } from "react";
import SelectedOccurrencesList, { OccInput } from "./SelectedOccurrencesList";

export default function ReservationModal({
  salaId,
  recursoField = "salaId",
  pendingOccurrences,
  onClose,
  onSubmit
}: {
  salaId: string;
  recursoField?: "salaId" | "viaturaId";
  pendingOccurrences: Array<{ inicio: Date; fim: Date }>;
  onClose: () => void;
  onSubmit: (payload: { titulo: string; descricao: string; numeroPessoas: number; ocorrencias: OccInput[] }) => Promise<void>;
}) {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [numeroPessoas, setNumeroPessoas] = useState(1);
  const [erro, setErro] = useState("");
  const [ocorrencias, setOcorrencias] = useState<OccInput[]>(
    pendingOccurrences.map((o) => ({
      ...(recursoField === "viaturaId" ? { viaturaId: salaId } : { salaId }),
      dataInicio: o.inicio.toISOString(),
      dataFim: o.fim.toISOString()
    }))
  );

  return (
    <div className="fixed inset-0 z-20 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-xl rounded-xl bg-white p-5">
        <h3 className="text-lg font-semibold">Adicionar ao pedido</h3>
        <div className="mt-3">
          <label className="mb-1 block text-sm font-medium text-slate-700">Título</label>
          <input className="w-full rounded border px-3 py-2" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        </div>
        <div className="mt-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">Finalidade/descrição</label>
          <textarea className="w-full rounded border px-3 py-2" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        </div>
        <div className="mt-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">Quantidade de pessoas</label>
          <input className="w-full rounded border px-3 py-2" type="number" min={1} value={numeroPessoas} onChange={(e) => setNumeroPessoas(Number(e.target.value))} />
        </div>
        {erro && <p className="mt-2 text-sm text-red-600">{erro}</p>}
        <div className="mt-2 flex gap-2">
          <button
            onClick={() => {
              if (ocorrencias.length === 0) {
                setErro("Selecione pelo menos um período antes de enviar.");
                return;
              }
              setErro("");
              onSubmit({ titulo, descricao, numeroPessoas, ocorrencias });
            }}
            className="rounded bg-blue-600 px-3 py-2 text-white"
          >
            Enviar pedido
          </button>
          <button onClick={onClose} className="rounded bg-slate-100 px-3 py-2">Fechar</button>
        </div>
        <div className="mt-3">
          <SelectedOccurrencesList ocorrencias={ocorrencias} onRemove={(index) => setOcorrencias((prev) => prev.filter((_, i) => i !== index))} />
        </div>
      </div>
    </div>
  );
}
