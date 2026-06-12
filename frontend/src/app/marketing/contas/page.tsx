"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import PlatformBadge from "@/components/marketing/PlatformBadge";
import type { ContaSocial, LinkedInOrganizacao, MetaPagina, Plataforma } from "@/components/marketing/types";
import {
  desligarConta,
  iniciarOAuthLinkedIn,
  iniciarOAuthMeta,
  ligarContaLinkedIn,
  ligarContaMeta,
  listarContas,
  listarOrgsLinkedIn,
  listarPaginasMeta,
} from "@/lib/marketing-api";

function formatarExpira(value: string | null) {
  if (!value) return "Sem expiração definida";
  return new Date(value).toLocaleString("pt-PT");
}

function MarketingContasContent() {
  const searchParams = useSearchParams();
  const [contas, setContas] = useState<ContaSocial[]>([]);
  const [paginasMeta, setPaginasMeta] = useState<MetaPagina[]>([]);
  const [orgsLinkedIn, setOrgsLinkedIn] = useState<LinkedInOrganizacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      setContas(await listarContas());
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar contas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  useEffect(() => {
    const oauth = searchParams.get("oauth");
    const erroParam = searchParams.get("erro");
    if (erroParam) {
      setErro(`Erro na ligação OAuth (${erroParam})`);
      return;
    }
    if (oauth === "meta") {
      listarPaginasMeta()
        .then((d) => setPaginasMeta(d.paginas))
        .catch(() => setErro("Sessão Meta expirada — tente ligar novamente"));
      setMensagem("Seleccione a página Facebook ou Instagram a ligar.");
    }
    if (oauth === "linkedin") {
      listarOrgsLinkedIn()
        .then((d) => setOrgsLinkedIn(d.organizacoes))
        .catch(() => setErro("Sessão LinkedIn expirada — tente ligar novamente"));
      setMensagem("Seleccione a organização LinkedIn a ligar.");
    }
  }, [searchParams]);

  async function ligarFacebook(pagina: MetaPagina) {
    try {
      await ligarContaMeta({
        tipo: "FACEBOOK",
        page_id: pagina.id,
        page_name: pagina.name,
        page_token: pagina.access_token,
      });
      setPaginasMeta([]);
      setMensagem("Página Facebook ligada com sucesso.");
      carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao ligar");
    }
  }

  async function ligarInstagram(pagina: MetaPagina) {
    const ig = pagina.instagram_business_account;
    if (!ig?.id) {
      setErro("Esta página não tem Instagram Business ligado.");
      return;
    }
    try {
      await ligarContaMeta({
        tipo: "INSTAGRAM",
        page_id: pagina.id,
        page_name: pagina.name,
        page_token: pagina.access_token,
        ig_user_id: ig.id,
        ig_username: ig.username ?? pagina.name,
      });
      setPaginasMeta([]);
      setMensagem("Instagram ligado com sucesso.");
      carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao ligar");
    }
  }

  async function ligarLinkedIn(org: LinkedInOrganizacao) {
    try {
      await ligarContaLinkedIn({
        org_id: org.id,
        org_urn: org.urn,
        org_nome: org.nome,
        access_token: "",
      });
      setOrgsLinkedIn([]);
      setMensagem("Organização LinkedIn ligada com sucesso.");
      carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao ligar");
    }
  }

  async function desligar(id: number) {
    if (!confirm("Desligar esta conta?")) return;
    try {
      await desligarConta(id);
      carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao desligar");
    }
  }

  const porPlataforma = (p: Plataforma) => contas.filter((c) => c.plataforma === p);

  return (
    <div>
      {mensagem && (
        <p className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
          {mensagem}
        </p>
      )}
      {erro && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {erro}
        </p>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => iniciarOAuthMeta()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white"
        >
          Ligar Meta (Facebook / Instagram)
        </button>
        <button
          type="button"
          onClick={() => iniciarOAuthLinkedIn()}
          className="rounded-lg bg-sky-800 px-4 py-2 text-sm text-white"
        >
          Ligar LinkedIn
        </button>
      </div>

      {paginasMeta.length > 0 && (
        <div className="mb-6 rounded-xl border bg-white p-4">
          <h3 className="mb-3 font-medium">Páginas disponíveis (Meta)</h3>
          <div className="space-y-2">
            {paginasMeta.map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2"
              >
                <span className="text-sm font-medium">{p.name}</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="rounded border px-2 py-1 text-xs hover:bg-slate-50"
                    onClick={() => ligarFacebook(p)}
                  >
                    Facebook
                  </button>
                  {p.instagram_business_account && (
                    <button
                      type="button"
                      className="rounded border px-2 py-1 text-xs hover:bg-slate-50"
                      onClick={() => ligarInstagram(p)}
                    >
                      Instagram
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {orgsLinkedIn.length > 0 && (
        <div className="mb-6 rounded-xl border bg-white p-4">
          <h3 className="mb-3 font-medium">Organizações LinkedIn</h3>
          <div className="space-y-2">
            {orgsLinkedIn.map((org) => (
              <div
                key={org.id}
                className="flex items-center justify-between rounded-lg border px-3 py-2"
              >
                <span className="text-sm">{org.nome}</span>
                <button
                  type="button"
                  className="rounded border px-2 py-1 text-xs hover:bg-slate-50"
                  onClick={() => ligarLinkedIn(org)}
                >
                  Ligar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">A carregar…</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {(["FACEBOOK", "INSTAGRAM", "LINKEDIN"] as Plataforma[]).map((plataforma) => (
            <div key={plataforma} className="rounded-xl border bg-white p-4">
              <div className="mb-3">
                <PlatformBadge plataforma={plataforma} />
              </div>
              {porPlataforma(plataforma).length === 0 ? (
                <p className="text-sm text-slate-500">Nenhuma conta ligada.</p>
              ) : (
                <ul className="space-y-3">
                  {porPlataforma(plataforma).map((conta) => (
                    <li key={conta.id} className="rounded-lg border p-3 text-sm">
                      <p className="font-medium">{conta.nome_exibicao}</p>
                      <p className="text-xs text-slate-500">
                        Expira: {formatarExpira(conta.token_expira_em)}
                        {conta.token_expirado && (
                          <span className="ml-1 text-amber-600">(expirado)</span>
                        )}
                      </p>
                      <p className="text-xs text-slate-500">Por: {conta.ligada_por_nome}</p>
                      <button
                        type="button"
                        className="mt-2 text-xs text-red-600 hover:underline"
                        onClick={() => desligar(conta.id)}
                      >
                        Desligar
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MarketingContasPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">A carregar…</p>}>
      <MarketingContasContent />
    </Suspense>
  );
}
