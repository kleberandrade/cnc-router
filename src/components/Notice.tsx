import { useEffect, useState } from "react";
import { X, Info, AlertTriangle, OctagonAlert } from "lucide-react";

export type NoticeKind = "info" | "warning" | "error";

export interface NoticeData {
  kind: NoticeKind;
  title: string;
  /** Optional detail lines (e.g. validation problems). */
  details?: string[];
}

interface NoticeProps {
  notice: NoticeData | null;
  onDismiss: () => void;
  /** Auto-dismiss after this many ms (info only). 0 disables. */
  autoHideMs?: number;
  /** One-line layout: title + expandable details (used in the side panel). */
  compact?: boolean;
}

/**
 * Inline, non-blocking notice used instead of `window.alert`.
 * Rendered with role="alert" so screen readers announce it.
 */
export function Notice({ notice, onDismiss, autoHideMs = 4000, compact = false }: NoticeProps) {
  const [open, setOpen] = useState(false);
  useEffect(() => { setOpen(false); }, [notice]);
  useEffect(() => {
    if (!notice || notice.kind !== "info" || autoHideMs <= 0) return;
    const t = setTimeout(onDismiss, autoHideMs);
    return () => clearTimeout(t);
  }, [notice, autoHideMs, onDismiss]);

  if (!notice) return null;

  return (
    <div className={`notice notice-${notice.kind}${compact ? " notice-compact" : ""}`} role="alert" data-testid="notice">
      <span className="notice-icon" aria-hidden="true">
        {notice.kind === "info" ? <Info size={16} /> : notice.kind === "warning" ? <AlertTriangle size={16} /> : <OctagonAlert size={16} />}
      </span>
      <div className="notice-body">
        <strong>{notice.title}</strong>
        {compact && notice.kind !== "error" && notice.details && notice.details.length > 0 && !open && (
          <button type="button" className="link notice-more" onClick={() => setOpen(true)} data-testid="notice-more">detalhes ({notice.details.length})</button>
        )}
        {notice.details && notice.details.length > 0 && (!compact || open || notice.kind === "error") && (
          <ul>
            {notice.details.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        )}
      </div>
      <button
        type="button"
        className="notice-close"
        onClick={onDismiss}
        aria-label="Fechar aviso"
      >
        <X size={14} />
      </button>
    </div>
  );
}
