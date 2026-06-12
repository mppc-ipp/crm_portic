"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import PostEditor from "@/components/marketing/PostEditor";
import type { ContaSocial, Publicacao } from "@/components/marketing/types";
import { listarContas } from "@/lib/marketing-api";

export default function NovaPublicacaoPage() {
  const router = useRouter();
  const [contas, setContas] = useState<ContaSocial[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    setContas(await listarContas());
    setLoading(false);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  function onGuardado(pub: Publicacao) {
    router.push(`/marketing/publicacoes/${pub.id}`);
  }

  if (loading) return <p className="text-sm text-slate-500">A carregar…</p>;

  return (
    <div>
      <h2 className="mb-4 text-lg font-medium">Nova publicação</h2>
      <PostEditor contas={contas} onGuardado={onGuardado} />
    </div>
  );
}
