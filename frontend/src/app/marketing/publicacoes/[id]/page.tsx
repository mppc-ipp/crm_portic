"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import PostEditor from "@/components/marketing/PostEditor";
import PlatformBadge from "@/components/marketing/PlatformBadge";
import type { ContaSocial, Plataforma, Publicacao } from "@/components/marketing/types";
import { listarContas, obterPublicacao } from "@/lib/marketing-api";

export default function PublicacaoDetalhePage() {
  const params = useParams();
  const id = Number(params.id);
  const [publicacao, setPublicacao] = useState<Publicacao | null>(null);
  const [contas, setContas] = useState<ContaSocial[]>([]);
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro("");
    try {
      const [pub, cts] = await Promise.all([obterPublicacao(id), listarContas()]);
      setPublicacao(pub);
      setContas(cts);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!Number.isNaN(id)) carregar();
  }, [id, carregar]);

  if (loading) return <p className="text-sm text-slate-500">A carregar…</p>;
  if (erro || !publicacao) return <p className="text-sm text-red-600">{erro || "Não encontrado"}</p>;

  return (
    <div>
      <Link href="/marketing/publicacoes" className="mb-4 inline-block text-sm text-portic hover:underline">
        ← Publicações
      </Link>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-medium">{publicacao.titulo_interno}</h2>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{publicacao.estado}</span>
        {publicacao.destinos.map((d) => (
          <PlatformBadge key={d.id} plataforma={d.plataforma as Plataforma} />
        ))}
      </div>

      {publicacao.destinos.some((d) => d.erro) && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {publicacao.destinos
            .filter((d) => d.erro)
            .map((d) => (
              <p key={d.id}>
                {d.plataforma_nome}: {d.erro}
              </p>
            ))}
        </div>
      )}

      <PostEditor
        contas={contas}
        publicacao={publicacao}
        onGuardado={(pub) => setPublicacao(pub)}
      />
    </div>
  );
}
