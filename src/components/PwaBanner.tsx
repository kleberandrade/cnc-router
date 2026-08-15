import { RefreshCw, X } from "lucide-react";
import { usePwaStore } from "../lib/pwa";

/** Update / install prompts for the PWA. Renders nothing when there is nothing to say. */
export function PwaBanner() {
  const needRefresh = usePwaStore((s) => s.needRefresh);
  const update = usePwaStore((s) => s.update);
  const dismiss = usePwaStore((s) => s.dismissRefresh);
  if (!needRefresh) return null;
  return (
    <div className="pwa-banner" role="status" data-testid="pwa-update">
      <RefreshCw size={16} aria-hidden="true" />
      <span>Nova versão disponível.</span>
      <button type="button" className="pwa-action" onClick={update}>Atualizar</button>
      <button type="button" className="icon-button" onClick={dismiss} aria-label="Depois"><X size={16} /></button>
    </div>
  );
}

