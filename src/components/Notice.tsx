import { useEffect } from "react";

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
}

/**
 * Inline, non-blocking notice used instead of `window.alert`.
 * Rendered with role="alert" so screen readers announce it.
 */
export function Notice({ notice, onDismiss, autoHideMs = 4000 }: NoticeProps) {
  useEffect(() => {
    if (!notice || notice.kind !== "info" || autoHideMs <= 0) return;
    const t = setTimeout(onDismiss, autoHideMs);
    return () => clearTimeout(t);
  }, [notice, autoHideMs, onDismiss]);

  if (!notice) return null;

  return (
    <div className={`notice notice-${notice.kind}`} role="alert" data-testid="notice">
      <div className="notice-body">
        <strong>{notice.title}</strong>
        {notice.details && notice.details.length > 0 && (
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
        ×
      </button>
    </div>
  );
}
