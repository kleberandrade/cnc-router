import { useMemo, useState } from "react";
import { Send, Mail, CheckCircle2 } from "lucide-react";
import { useProjectStore } from "../state/store";
import { FEEDBACK_TYPES, buildPayload, sendFeedback, mailtoFor, type FeedbackDraft, type SendResult } from "../lib/feedback";
import { AUTHOR } from "../content/about";

const EMPTY: FeedbackDraft = { type: "sugestao", title: "", message: "", email: "", includeDiagnostics: true, includeProject: false };

/** "Sugestões e problemas" form: sends to /api/feedback (Vercel Blob) with e-mail fallback. */
export function FeedbackDialog({ onDone }: { onDone: () => void }) {
  const shapes = useProjectStore((s) => s.shapes);
  const settings = useProjectStore((s) => s.settings);
  const [draft, setDraft] = useState<FeedbackDraft>(EMPTY);
  const [state, setState] = useState<{ status: "idle" | "sending" | "sent" | "error"; result?: SendResult }>({ status: "idle" });
  const set = <K extends keyof FeedbackDraft>(k: K, v: FeedbackDraft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const { payload, projectTooBig } = useMemo(() => buildPayload(draft, shapes, settings), [draft, shapes, settings]);
  const valid = payload.title.length >= 3 && payload.message.length >= 10 && (!draft.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email));
  const preview = payload.diagnostics ? `${payload.diagnostics.version} · ${payload.diagnostics.project.shapes} ${payload.diagnostics.project.shapes === 1 ? "peça" : "peças"} · ${payload.diagnostics.viewport} · ${payload.diagnostics.userAgent.split(") ")[0]})` : "";

  const submit = async () => {
    setState({ status: "sending" });
    const result = await sendFeedback(payload);
    setState({ status: result.ok ? "sent" : "error", result });
  };

  if (state.status === "sent" && state.result?.ok) {
    return (
      <div className="feedback" data-testid="feedback-sent">
        <h2><CheckCircle2 size={20} aria-hidden="true" /> Obrigado!</h2>
        <p>Recebido. Referência <code data-testid="feedback-id">{state.result.id}</code>{draft.email ? " — respondo pelo e-mail informado quando fizer sentido." : "."}</p>
        <button type="button" className="rb primary" onClick={onDone}>Fechar</button>
      </div>
    );
  }

  return (
    <form className="feedback" data-testid="feedback-form" onSubmit={(e) => { e.preventDefault(); if (valid && state.status !== "sending") void submit(); }}>
      <h2>Sugestões e problemas</h2>
      <p className="hint">Conte o que melhoraria ou o que deu errado. Vai direto para o autor ({AUTHOR.name}); nada é público.</p>
      <label className="pref-row">
        Tipo
        <select value={draft.type} onChange={(e) => set("type", e.target.value as FeedbackDraft["type"])} data-testid="fb-type">
          {FEEDBACK_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
      </label>
      <label>
        Título
        <input type="text" value={draft.title} onChange={(e) => set("title", e.target.value)} maxLength={140} placeholder="Ex.: rebaixo circular deixa material no centro" data-testid="fb-title" required />
      </label>
      <label>
        Mensagem
        <textarea value={draft.message} onChange={(e) => set("message", e.target.value)} rows={5} maxLength={5000} placeholder={draft.type === "problema" ? "O que você fez, o que esperava e o que aconteceu." : "Descreva a ideia e por que ajudaria."} data-testid="fb-message" required />
      </label>
      <label>
        E-mail (opcional, para resposta)
        <input type="email" value={draft.email} onChange={(e) => set("email", e.target.value)} placeholder="voce@exemplo.com" data-testid="fb-email" />
      </label>
      {/* honeypot */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hp" value="" onChange={() => {}} />
      <label className="checkbox">
        <input type="checkbox" checked={draft.includeDiagnostics} onChange={(e) => set("includeDiagnostics", e.target.checked)} data-testid="fb-diag" />
        Anexar diagnóstico <span className="field-hint">(versão, navegador, tamanho da tela, resumo do projeto, último erro)</span>
      </label>
      {draft.includeDiagnostics && <p className="hint mono" data-testid="fb-preview">{preview}</p>}
      <label className="checkbox">
        <input type="checkbox" checked={draft.includeProject} onChange={(e) => set("includeProject", e.target.checked)} data-testid="fb-project" />
        Anexar o projeto atual <span className="field-hint">(formas e configurações — ajuda a reproduzir; máx. 512 kB)</span>
      </label>
      {projectTooBig && <p className="hint hint-warn">Projeto grande demais para anexar — salve o .json e envie por e-mail se precisar.</p>}
      {state.status === "error" && state.result && !state.result.ok && (
        <p className="hint hint-warn" role="alert" data-testid="fb-error">
          {state.result.message}{" "}
          <a href={mailtoFor(payload)} data-testid="fb-mailto"><Mail size={12} aria-hidden="true" /> Enviar por e-mail</a>
        </p>
      )}
      <div className="feedback-actions">
        <button type="submit" className="rb primary" disabled={!valid || state.status === "sending"} data-testid="fb-send">
          <Send size={14} aria-hidden="true" /> {state.status === "sending" ? "Enviando…" : "Enviar"}
        </button>
        <a className="link" href={mailtoFor(payload)} data-testid="fb-mailto-alt">ou enviar por e-mail</a>
      </div>
    </form>
  );
}
