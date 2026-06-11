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
};

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
      const data = await apiFetch<SistemaInfo>("/api/admin/sistema", {
        method: "PATCH",
        body: JSON.stringify({
          backup: backupForm,
          manutencao: manutencaoForm,
        }),
      });
      setInfo(data);
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
