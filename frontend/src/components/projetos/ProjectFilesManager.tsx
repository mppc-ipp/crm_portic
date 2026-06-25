"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { AnexoProjeto } from "./types";
import { formatarTamanho } from "./utils";

type Props = {
  projetoId: number;
};

export default function ProjectFilesManager({ projetoId }: Props) {
  const [aberto, setAberto] = useState(false);
  const [anexos, setAnexos] = useState<AnexoProjeto[]>([]);
  const [aCarregar, setACarregar] = useState(false);

  const carregar = useCallback(async () => {
    setACarregar(true);
    try {
      const data = await apiFetch<AnexoProjeto[]>(`/api/projetos/${projetoId}/anexos`);
      setAnexos(data ?? []);
    } finally {
      setACarregar(false);
    }
  }, [projetoId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function eliminar(id: number) {
    await apiFetch(`/api/projetos/anexos/${id}`, { method: "DELETE" });
    await carregar();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
      >
        Arquivos ({anexos.length})
      </button>

      {aberto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          onClick={() => setAberto(false)}
        >
          <div
            className="flex max-h-[80vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b px-5 py-3">
              <h3 className="text-base font-semibold text-slate-900">
                Arquivos do projeto
                <span className="ml-2 text-sm font-normal text-slate-400">{anexos.length}</span>
              </h3>
              <button
                type="button"
                onClick={() => setAberto(false)}
                className="text-sm text-slate-500 hover:text-slate-800"
              >
                ✕ Fechar
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {aCarregar ? (
                <p className="text-sm text-slate-500">A carregar…</p>
              ) : anexos.length === 0 ? (
                <p className="text-sm text-slate-500">Ainda não há arquivos neste projeto.</p>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b text-xs uppercase tracking-wide text-slate-400">
                      <th className="py-2 pr-3 font-medium">Ficheiro</th>
                      <th className="py-2 pr-3 font-medium">Seção</th>
                      <th className="py-2 pr-3 font-medium">Tarefa</th>
                      <th className="py-2 pr-3 font-medium">Data</th>
                      <th className="py-2 pr-3 font-medium text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {anexos.map((a) => (
                      <tr key={a.id} className="border-b border-slate-100">
                        <td className="py-2 pr-3">
                          <a
                            href={a.url ?? "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={a.nome_original}
                            className="text-slate-700 hover:text-proj hover:underline"
                            title={a.nome_original}
                          >
                            {a.nome_original}
                          </a>
                          <span className="ml-2 text-xs text-slate-400">{formatarTamanho(a.tamanho)}</span>
                        </td>
                        <td className="py-2 pr-3 text-slate-600">{a.secao_nome}</td>
                        <td className="py-2 pr-3 text-slate-600">{a.objetivo_titulo}</td>
                        <td className="py-2 pr-3 text-slate-500">
                          {new Date(a.created_at).toLocaleString("pt-PT")}
                        </td>
                        <td className="py-2 pr-3">
                          <div className="flex items-center justify-end gap-3">
                            <a
                              href={a.url ?? "#"}
                              target="_blank"
                              rel="noopener noreferrer"
                              download={a.nome_original}
                              className="text-xs text-slate-500 hover:text-proj"
                              title="Descarregar"
                            >
                              ↓ Download
                            </a>
                            <button
                              type="button"
                              onClick={() => void eliminar(a.id)}
                              className="text-xs text-rose-500 hover:text-rose-700"
                              title="Eliminar"
                            >
                              ✕ Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
