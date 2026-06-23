"use client";

import { FormEvent, useEffect, useState } from "react";
import { SECTION_TEMPLATES, T, type TemplateSecoesId } from "./constants";
import MembroEmailList, { extrairEmailsValidos } from "./MembroEmailList";
import { buildThemeStyle, COR_PROJETO_PADRAO, normalizarCor, PALETA_CORES } from "./projectTheme";

export type NovoProjetoData = {
  nome: string;
  templateSecoes: TemplateSecoesId;
  cor: string;
  membrosEmails: string[];
};

type Props = {
  onClose: () => void;
  onCreate: (data: NovoProjetoData) => Promise<void>;
};

export default function CreateProjectModal({ onClose, onCreate }: Props) {
  const [nome, setNome] = useState("");
  const [template, setTemplate] = useState<TemplateSecoesId>("vazio");
  const [cor, setCor] = useState(COR_PROJETO_PADRAO);
  const [emailsMembros, setEmailsMembros] = useState<string[]>([""]);
  const [aGuardar, setAGuardar] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;
    setAGuardar(true);
    setErro("");
    try {
      await onCreate({
        nome: nome.trim(),
        templateSecoes: template,
        cor: normalizarCor(cor),
        membrosEmails: extrairEmailsValidos(emailsMembros),
      });
      onClose();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao criar projeto");
    } finally {
      setAGuardar(false);
    }
  }

  const corAtiva = normalizarCor(cor);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="projeto-themed w-full max-w-lg rounded-xl bg-white shadow-xl"
        style={buildThemeStyle(corAtiva)}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">Novo projeto</h2>
        </div>
        <form onSubmit={onSubmit} className="space-y-4 px-6 py-5">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Nome *</span>
            <input
              autoFocus
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome do projeto"
              className={`mt-1 w-full ${T.input}`}
            />
          </label>

          <fieldset>
            <legend className="text-sm font-medium text-slate-700">Cor do projeto</legend>
            <p className="mt-1 text-xs text-slate-500">Define botões, destaques e realces deste projeto.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {PALETA_CORES.map((p) => (
                <button
                  key={p.cor}
                  type="button"
                  title={p.label}
                  onClick={() => setCor(p.cor)}
                  className={`h-9 w-9 rounded-full border-2 transition ${
                    corAtiva.toLowerCase() === p.cor.toLowerCase()
                      ? "border-slate-900 ring-2 ring-offset-2 ring-slate-400"
                      : "border-white shadow-sm hover:scale-105"
                  }`}
                  style={{ backgroundColor: p.cor }}
                />
              ))}
            </div>
            <label className="mt-3 flex items-center gap-3">
              <span className="text-sm text-slate-600">Personalizada:</span>
              <input
                type="color"
                value={corAtiva}
                onChange={(e) => setCor(e.target.value)}
                className="h-9 w-12 cursor-pointer rounded border border-slate-200 bg-white p-0.5"
              />
              <span className="font-mono text-xs text-slate-500">{corAtiva}</span>
            </label>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-medium text-slate-700">Membros</legend>
            <p className="mt-1 text-xs text-slate-500">
              Pesquise por nome ou email. Podem ser atribuídas a tarefas mesmo sem cadastro na plataforma.
            </p>
            <div className="mt-3">
              <MembroEmailList emails={emailsMembros} onChange={setEmailsMembros} />
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-medium text-slate-700">Secções iniciais</legend>
            <div className="mt-2 space-y-2">
              {SECTION_TEMPLATES.map((t) => (
                <label
                  key={t.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${
                    template === t.id ? "border-proj bg-proj-5" : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="template"
                    value={t.id}
                    checked={template === t.id}
                    onChange={() => setTemplate(t.id)}
                    className="mt-0.5 accent-[var(--proj-primary)]"
                  />
                  <span>
                    <span className="block text-sm font-medium text-slate-800">{t.label}</span>
                    <span className="block text-xs text-slate-500">{t.descricao}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {erro && <p className="text-sm text-red-600">{erro}</p>}

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button type="submit" disabled={!nome.trim() || aGuardar} className={T.btnPrimary}>
              {aGuardar ? "A criar…" : "Criar projeto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
