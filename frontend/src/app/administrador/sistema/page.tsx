"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { apiFetch, getStoredUser } from "@/lib/api";

type SistemaInfo = {
  versao: string;
  ambiente: string;
  debug: boolean;
  seguranca: {
    jwt_access_horas: number;
    jwt_refresh_dias: number;
    validadores_senha: string[];
    cors_origins: string[];
    autenticacao_email: boolean;
    grupos_crm: string[];
  };
  backup: {
    frequencia: string;
    retencao_dias: number;
    localizacao: string;
    automatico: boolean;
    ultimo: string | null;
    notas: string;
  };
  manutencao: {
    notas: string;
    politica_seguranca_notas: string;
    atualizado_em: string;
  };
  infraestrutura: {
    base_dados: string;
    nome_bd: string;
    media_root: string;
    utilizadores_ativos: number;
    comando_backup: string;
  };
  marketing: {
    meta_app_id: string;
    meta_app_secret_configured: boolean;
    meta_redirect_uri: string;
    linkedin_client_id: string;
    linkedin_client_secret_configured: boolean;
    linkedin_redirect_uri: string;
    tiktok_client_key: string;
    tiktok_client_secret_configured: boolean;
    tiktok_redirect_uri: string;
    media_public_base_url: string;
    dry_run: boolean;
    configurado_na_bd: boolean;
  };
};

const SECRET_PLACEHOLDER = "********";

const FREQUENCIAS = [
  { value: "diaria", label: "Diária" },
  { value: "semanal", label: "Semanal" },
  { value: "mensal", label: "Mensal" },
];

export default function SistemaPage() {
  const sessao = getStoredUser();
  const [info, setInfo] = useState<SistemaInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState(false);
  const [backupForm, setBackupForm] = useState({
    frequencia: "diaria",
    retencao_dias: 30,
    localizacao: "",
    automatico: false,
    notas: "",
  });
  const [manutencaoForm, setManutencaoForm] = useState({
    notas: "",
    politica_seguranca_notas: "",
  });
  const [marketingForm, setMarketingForm] = useState({
    meta_app_id: "",
    meta_app_secret: "",
    meta_redirect_uri: "",
    linkedin_client_id: "",
    linkedin_client_secret: "",
    linkedin_redirect_uri: "",
    tiktok_client_key: "",
    tiktok_client_secret: "",
    tiktok_redirect_uri: "",
    media_public_base_url: "",
    dry_run: true,
  });

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<SistemaInfo>("/api/admin/sistema");
      setInfo(data);
      setBackupForm({
        frequencia: data.backup.frequencia,
        retencao_dias: data.backup.retencao_dias,
        localizacao: data.backup.localizacao,
        automatico: data.backup.automatico,
        notas: data.backup.notas,
      });
      setManutencaoForm({
        notas: data.manutencao.notas,
        politica_seguranca_notas: data.manutencao.politica_seguranca_notas,
      });
      setMarketingForm({
        meta_app_id: data.marketing.meta_app_id,
        meta_app_secret: data.marketing.meta_app_secret_configured ? SECRET_PLACEHOLDER : "",
        meta_redirect_uri: data.marketing.meta_redirect_uri,
        linkedin_client_id: data.marketing.linkedin_client_id,
        linkedin_client_secret: data.marketing.linkedin_client_secret_configured
          ? SECRET_PLACEHOLDER
          : "",
        linkedin_redirect_uri: data.marketing.linkedin_redirect_uri,
        tiktok_client_key: data.marketing.tiktok_client_key,
        tiktok_client_secret: data.marketing.tiktok_client_secret_configured
          ? SECRET_PLACEHOLDER
          : "",
        tiktok_redirect_uri: data.marketing.tiktok_redirect_uri,
        media_public_base_url: data.marketing.media_public_base_url,
        dry_run: data.marketing.dry_run,
      });
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErro("");
    setOk(false);
    try {
      const marketingPayload = {
        meta_app_id: marketingForm.meta_app_id,
        meta_redirect_uri: marketingForm.meta_redirect_uri,
        linkedin_client_id: marketingForm.linkedin_client_id,
        linkedin_redirect_uri: marketingForm.linkedin_redirect_uri,
        tiktok_client_key: marketingForm.tiktok_client_key,
        tiktok_redirect_uri: marketingForm.tiktok_redirect_uri,
        media_public_base_url: marketingForm.media_public_base_url,
        dry_run: marketingForm.dry_run,
      } as Record<string, string | boolean>;
      if (
        marketingForm.meta_app_secret &&
        marketingForm.meta_app_secret !== SECRET_PLACEHOLDER
      ) {
        marketingPayload.meta_app_secret = marketingForm.meta_app_secret;
      }
      if (
        marketingForm.linkedin_client_secret &&
        marketingForm.linkedin_client_secret !== SECRET_PLACEHOLDER
      ) {
        marketingPayload.linkedin_client_secret = marketingForm.linkedin_client_secret;
      }
      if (
        marketingForm.tiktok_client_secret &&
        marketingForm.tiktok_client_secret !== SECRET_PLACEHOLDER
      ) {
        marketingPayload.tiktok_client_secret = marketingForm.tiktok_client_secret;
      }

      const data = await apiFetch<SistemaInfo>("/api/admin/sistema", {
        method: "PATCH",
        body: JSON.stringify({
          backup: backupForm,
          manutencao: manutencaoForm,
          marketing: marketingPayload,
        }),
      });
      setInfo(data);
      setMarketingForm({
        meta_app_id: data.marketing.meta_app_id,
        meta_app_secret: data.marketing.meta_app_secret_configured ? SECRET_PLACEHOLDER : "",
        meta_redirect_uri: data.marketing.meta_redirect_uri,
        linkedin_client_id: data.marketing.linkedin_client_id,
        linkedin_client_secret: data.marketing.linkedin_client_secret_configured
          ? SECRET_PLACEHOLDER
          : "",
        linkedin_redirect_uri: data.marketing.linkedin_redirect_uri,
        tiktok_client_key: data.marketing.tiktok_client_key,
        tiktok_client_secret: data.marketing.tiktok_client_secret_configured
          ? SECRET_PLACEHOLDER
          : "",
        tiktok_redirect_uri: data.marketing.tiktok_redirect_uri,
        media_public_base_url: data.marketing.media_public_base_url,
        dry_run: data.marketing.dry_run,
      });
      setOk(true);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao guardar");
    } finally {
      setSaving(false);
    }
  }

  async function registarBackupAgora() {
    setSaving(true);
    try {
      const agora = new Date().toISOString();
      const data = await apiFetch<SistemaInfo>("/api/admin/sistema", {
        method: "PATCH",
        body: JSON.stringify({ backup: { ...backupForm, ultimo: agora } }),
      });
      setInfo(data);
      setOk(true);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-slate-500">A carregar…</p>;
  if (!info) return <p className="text-sm text-red-600">{erro || "Sem dados"}</p>;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Sistema e segurança</h2>
        <p className="mt-1 text-sm text-slate-600">
          Estado do CRM, políticas de segurança activas e configuração de backup.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="Versão" value={info.versao} />
        <Card title="Ambiente" value={info.ambiente} warn={info.debug} />
        <Card title="Utilizadores activos" value={String(info.infraestrutura.utilizadores_ativos)} />
        <Card
          title="Último backup"
          value={
            info.backup.ultimo
              ? new Date(info.backup.ultimo).toLocaleString("pt-PT")
              : "Não registado"
          }
        />
      </section>

      <section className="rounded-xl border bg-white p-5">
        <h3 className="mb-3 font-semibold">Política de segurança (activa)</h3>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <Item label="Sessão JWT (acesso)" value={`${info.seguranca.jwt_access_horas} horas`} />
          <Item label="Refresh token" value={`${info.seguranca.jwt_refresh_dias} dias`} />
          <Item label="Autenticação" value="Email + palavra-passe" />
          <Item label="Base de dados" value={`${info.infraestrutura.base_dados} (${info.infraestrutura.nome_bd})`} />
        </dl>
        <div className="mt-4">
          <p className="text-xs font-medium uppercase text-slate-500">Validadores de palavra-passe</p>
          <ul className="mt-1 list-inside list-disc text-sm text-slate-700">
            {info.seguranca.validadores_senha.map((v) => (
              <li key={v}>{v}</li>
            ))}
          </ul>
        </div>
        <div className="mt-4">
          <p className="text-xs font-medium uppercase text-slate-500">Origens CORS permitidas</p>
          <ul className="mt-1 text-sm text-slate-700">
            {info.seguranca.cors_origins.map((o) => (
              <li key={o}>• {o}</li>
            ))}
          </ul>
        </div>
        <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm">
          <p><strong>Sessão actual:</strong> {sessao?.nome} ({sessao?.email ?? sessao?.username})</p>
          <p className="mt-1"><strong>Grupos:</strong> {sessao?.grupos?.join(", ") || "—"}</p>
        </div>
      </section>

      <form onSubmit={guardar} className="space-y-8">
        <section className="rounded-xl border bg-white p-5">
          <h3 className="mb-3 font-semibold">Política de backup</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm text-slate-600">
              Frequência
              <select
                value={backupForm.frequencia}
                onChange={(e) => setBackupForm((f) => ({ ...f, frequencia: e.target.value }))}
                className="mt-1 w-full rounded-lg border px-3 py-2"
              >
                {FREQUENCIAS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm text-slate-600">
              Retenção (dias)
              <input
                type="number"
                min={1}
                value={backupForm.retencao_dias}
                onChange={(e) =>
                  setBackupForm((f) => ({ ...f, retencao_dias: parseInt(e.target.value, 10) || 30 }))
                }
                className="mt-1 w-full rounded-lg border px-3 py-2"
              />
            </label>
            <label className="block text-sm text-slate-600 sm:col-span-2">
              Localização / destino
              <input
                value={backupForm.localizacao}
                onChange={(e) => setBackupForm((f) => ({ ...f, localizacao: e.target.value }))}
                className="mt-1 w-full rounded-lg border px-3 py-2"
                placeholder="Ex.: servidor de ficheiros, S3, volume Docker…"
              />
            </label>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={backupForm.automatico}
                onChange={(e) => setBackupForm((f) => ({ ...f, automatico: e.target.checked }))}
              />
              Rotina automática configurada no servidor
            </label>
            <label className="block text-sm text-slate-600 sm:col-span-2">
              Notas de backup
              <textarea
                value={backupForm.notas}
                onChange={(e) => setBackupForm((f) => ({ ...f, notas: e.target.value }))}
                rows={3}
                className="mt-1 w-full rounded-lg border px-3 py-2"
                placeholder="Procedimentos, responsáveis, horários…"
              />
            </label>
          </div>
          <div className="mt-4 rounded-lg border border-dashed bg-slate-50 p-3">
            <p className="text-xs font-medium text-slate-500">Comando manual (PostgreSQL)</p>
            <code className="mt-1 block break-all text-xs text-slate-700">
              {info.infraestrutura.comando_backup}
            </code>
            <button
              type="button"
              onClick={() => void registarBackupAgora()}
              disabled={saving}
              className="mt-3 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-white disabled:opacity-50"
            >
              Registar backup efectuado agora
            </button>
          </div>
        </section>

        <section className="rounded-xl border bg-white p-5">
          <h3 className="mb-1 font-semibold">Integrações de marketing (redes sociais)</h3>
          <p className="mb-4 text-sm text-slate-600">
            Chaves da Meta (Facebook/Instagram), LinkedIn e TikTok. Guardadas na base de dados e
            utilizadas pelo módulo Marketing. Deixe o secret em branco para manter o actual.
          </p>
          {info.marketing.configurado_na_bd && (
            <p className="mb-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
              Integrações configuradas na base de dados (têm prioridade sobre o ficheiro .env).
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm text-slate-600 sm:col-span-2">
              Meta App ID
              <input
                value={marketingForm.meta_app_id}
                onChange={(e) =>
                  setMarketingForm((f) => ({ ...f, meta_app_id: e.target.value }))
                }
                className="mt-1 w-full rounded-lg border px-3 py-2 font-mono text-sm"
                placeholder="ID da app em developers.facebook.com"
              />
            </label>
            <label className="block text-sm text-slate-600 sm:col-span-2">
              Meta App Secret
              <input
                type="password"
                value={marketingForm.meta_app_secret}
                onChange={(e) =>
                  setMarketingForm((f) => ({ ...f, meta_app_secret: e.target.value }))
                }
                className="mt-1 w-full rounded-lg border px-3 py-2 font-mono text-sm"
                placeholder={
                  info.marketing.meta_app_secret_configured
                    ? "******** (preencha só para alterar)"
                    : "App Secret da Meta"
                }
              />
            </label>
            <label className="block text-sm text-slate-600 sm:col-span-2">
              Meta Redirect URI
              <input
                value={marketingForm.meta_redirect_uri}
                onChange={(e) =>
                  setMarketingForm((f) => ({ ...f, meta_redirect_uri: e.target.value }))
                }
                className="mt-1 w-full rounded-lg border px-3 py-2 font-mono text-sm"
              />
            </label>
            <label className="block text-sm text-slate-600 sm:col-span-2">
              LinkedIn Client ID
              <input
                value={marketingForm.linkedin_client_id}
                onChange={(e) =>
                  setMarketingForm((f) => ({ ...f, linkedin_client_id: e.target.value }))
                }
                className="mt-1 w-full rounded-lg border px-3 py-2 font-mono text-sm"
              />
            </label>
            <label className="block text-sm text-slate-600 sm:col-span-2">
              LinkedIn Client Secret
              <input
                type="password"
                value={marketingForm.linkedin_client_secret}
                onChange={(e) =>
                  setMarketingForm((f) => ({ ...f, linkedin_client_secret: e.target.value }))
                }
                className="mt-1 w-full rounded-lg border px-3 py-2 font-mono text-sm"
                placeholder={
                  info.marketing.linkedin_client_secret_configured
                    ? "******** (preencha só para alterar)"
                    : "Client Secret do LinkedIn"
                }
              />
            </label>
            <label className="block text-sm text-slate-600 sm:col-span-2">
              LinkedIn Redirect URI
              <input
                value={marketingForm.linkedin_redirect_uri}
                onChange={(e) =>
                  setMarketingForm((f) => ({ ...f, linkedin_redirect_uri: e.target.value }))
                }
                className="mt-1 w-full rounded-lg border px-3 py-2 font-mono text-sm"
              />
            </label>
            <label className="block text-sm text-slate-600 sm:col-span-2">
              TikTok Client Key
              <input
                value={marketingForm.tiktok_client_key}
                onChange={(e) =>
                  setMarketingForm((f) => ({ ...f, tiktok_client_key: e.target.value }))
                }
                className="mt-1 w-full rounded-lg border px-3 py-2 font-mono text-sm"
                placeholder="Client Key em developers.tiktok.com"
              />
            </label>
            <label className="block text-sm text-slate-600 sm:col-span-2">
              TikTok Client Secret
              <input
                type="password"
                value={marketingForm.tiktok_client_secret}
                onChange={(e) =>
                  setMarketingForm((f) => ({ ...f, tiktok_client_secret: e.target.value }))
                }
                className="mt-1 w-full rounded-lg border px-3 py-2 font-mono text-sm"
                placeholder={
                  info.marketing.tiktok_client_secret_configured
                    ? "******** (preencha só para alterar)"
                    : "Client Secret do TikTok"
                }
              />
            </label>
            <label className="block text-sm text-slate-600 sm:col-span-2">
              TikTok Redirect URI
              <input
                value={marketingForm.tiktok_redirect_uri}
                onChange={(e) =>
                  setMarketingForm((f) => ({ ...f, tiktok_redirect_uri: e.target.value }))
                }
                className="mt-1 w-full rounded-lg border px-3 py-2 font-mono text-sm"
              />
            </label>
            <label className="block text-sm text-slate-600 sm:col-span-2">
              URL pública de media (Instagram / TikTok)
              <input
                value={marketingForm.media_public_base_url}
                onChange={(e) =>
                  setMarketingForm((f) => ({ ...f, media_public_base_url: e.target.value }))
                }
                className="mt-1 w-full rounded-lg border px-3 py-2 font-mono text-sm"
                placeholder="https://seu-dominio.com"
              />
            </label>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={marketingForm.dry_run}
                onChange={(e) =>
                  setMarketingForm((f) => ({ ...f, dry_run: e.target.checked }))
                }
              />
              Modo simulação (dry run) — não publica nas redes reais
            </label>
          </div>
        </section>

        <section className="rounded-xl border bg-white p-5">
          <h3 className="mb-3 font-semibold">Notas de manutenção e segurança</h3>
          <label className="mb-4 block text-sm text-slate-600">
            Política de segurança (documentação interna)
            <textarea
              value={manutencaoForm.politica_seguranca_notas}
              onChange={(e) =>
                setManutencaoForm((f) => ({ ...f, politica_seguranca_notas: e.target.value }))
              }
              rows={4}
              className="mt-1 w-full rounded-lg border px-3 py-2"
              placeholder="Regras de acesso, MFA planeado, política de passwords…"
            />
          </label>
          <label className="block text-sm text-slate-600">
            Notas de manutenção
            <textarea
              value={manutencaoForm.notas}
              onChange={(e) => setManutencaoForm((f) => ({ ...f, notas: e.target.value }))}
              rows={3}
              className="mt-1 w-full rounded-lg border px-3 py-2"
              placeholder="Janelas de manutenção, contactos de suporte…"
            />
          </label>
        </section>

        {erro && <p className="text-sm text-red-600">{erro}</p>}
        {ok && <p className="text-sm text-green-700">Configuração guardada.</p>}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-portic px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? "A guardar…" : "Guardar políticas"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Card({ title, value, warn }: { title: string; value: string; warn?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${warn ? "border-amber-300 bg-amber-50" : "bg-white"}`}>
      <p className="text-xs uppercase text-slate-500">{title}</p>
      <p className="mt-1 font-semibold capitalize">{value}</p>
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
