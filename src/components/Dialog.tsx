import { useEffect, useRef, type ReactNode } from "react";
import { create } from "zustand";
import { X } from "lucide-react";

/** Modal shell used by every dialog in the app (backdrop, focus trap, Esc, close button). Never use window.alert/confirm/prompt. */
export function Dialog({ open, onClose, title, children, size = "md", testId = "dialog", closeLabel = "Fechar", footer }: {
  open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; size?: "sm" | "md" | "lg"; testId?: string; closeLabel?: string; footer?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const el = ref.current;
    const focusables = () => Array.from(el?.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') ?? []).filter((f) => !f.hasAttribute("disabled"));
    (focusables()[0] ?? el)?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); onClose(); }
      if (e.key === "Tab") {
        const f = focusables();
        if (f.length === 0) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener("keydown", key, true);
    return () => { window.removeEventListener("keydown", key, true); prev?.focus?.(); };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="dialog-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }} role="presentation">
      <div ref={ref} className={`dialog dialog-${size}`} role="dialog" aria-modal="true" tabIndex={-1} data-testid={testId}>
        {title && <div className="dialog-head"><h2>{title}</h2><button type="button" className="icon-button" onClick={onClose} aria-label={closeLabel} data-testid={`${testId}-x`}><X size={14} /></button></div>}
        <div className="dialog-body">{children}</div>
        {footer !== undefined ? footer : <div className="dialog-actions"><button type="button" className="dialog-close" onClick={onClose}>{closeLabel}</button></div>}
      </div>
    </div>
  );
}

// ---- confirm / prompt as promises (replaces window.confirm / window.prompt) ----
interface Ask {
  kind: "confirm" | "prompt";
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  defaultValue?: string;
  placeholder?: string;
  resolve: (v: boolean | string | null) => void;
}
interface AskState { current: Ask | null; value: string; ask: (a: Omit<Ask, "resolve">) => Promise<boolean | string | null>; setValue: (v: string) => void; done: (v: boolean | string | null) => void }
export const useAskStore = create<AskState>((set, get) => ({
  current: null,
  value: "",
  ask: (a) => new Promise((resolve) => set({ current: { ...a, resolve }, value: a.defaultValue ?? "" })),
  setValue: (value) => set({ value }),
  done: (v) => { get().current?.resolve(v); set({ current: null }); },
}));

/** `await confirmDialog({...})` → boolean. Usable outside React (store actions, hooks). */
export function confirmDialog(opts: { title: string; message?: ReactNode; confirmLabel?: string; cancelLabel?: string; danger?: boolean }): Promise<boolean> {
  return useAskStore.getState().ask({ kind: "confirm", ...opts }).then((v) => v === true);
}
/** `await promptDialog({...})` → string | null. */
export function promptDialog(opts: { title: string; message?: ReactNode; defaultValue?: string; placeholder?: string; confirmLabel?: string }): Promise<string | null> {
  return useAskStore.getState().ask({ kind: "prompt", ...opts }).then((v) => (typeof v === "string" ? v : null));
}

/** Mount once (App). Renders the pending confirm/prompt. */
export function AskHost() {
  const current = useAskStore((s) => s.current);
  const value = useAskStore((s) => s.value);
  const setValue = useAskStore((s) => s.setValue);
  const done = useAskStore((s) => s.done);
  if (!current) return null;
  const ok = () => done(current.kind === "prompt" ? value : true);
  const cancel = () => done(current.kind === "prompt" ? null : false);
  return (
    <Dialog open onClose={cancel} title={current.title} size="sm" testId="ask-dialog" footer={
      <div className="dialog-actions">
        <button type="button" className="dialog-close" onClick={cancel} data-testid="ask-cancel">{current.cancelLabel ?? "Cancelar"}</button>
        <button type="button" className={`rb primary${current.danger ? " danger" : ""}`} onClick={ok} data-testid="ask-ok">{current.confirmLabel ?? "OK"}</button>
      </div>
    }>
      {current.message && <p>{current.message}</p>}
      {current.kind === "prompt" && (
        <input className="ask-input" type="text" value={value} placeholder={current.placeholder} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") ok(); }} aria-label={current.title} data-testid="ask-input" autoFocus />
      )}
    </Dialog>
  );
}
