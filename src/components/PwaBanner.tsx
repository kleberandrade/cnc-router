import { useState } from "react";
import { RefreshCw, X } from "lucide-react";
import { usePwaStore } from "../lib/pwa";
import { versionLabel } from "../lib/version";

const STORAGE_KEY = "oficina-cnc:storage-notice";
function readSeen(): boolean { try { return localStorage.getItem(STORAGE_KEY) === "1"; } catch { return true; } }

/** First-visit note: no tracking cookies, project stays on this device (Sprint 23-H). */
export function StorageNotice({ onLegal }: { onLegal: () => void }) {
  const [seen, setSeen] = useState(readSeen);
  if (seen) return null;
  const dismiss = () => { try { localStorage.setItem(STORAGE_KEY, "1"); } catch { /* ignore */ } setSeen(true); };
  return (
    <div className="pwa-banner storage-notice" role="status" data-testid="storage-notice">
      <span>Sem cookies de rastreio. Seu projeto fica só neste navegador. <button type="button" className="link" onClick={onLegal} data-testid="storage-notice-more">Privacidade</button></span>
      <button type="button" className="pwa-action" onClick={dismiss} data-testid="storage-notice-ok">Entendi</button>
    </div>
  );
}

/** Update / install prompts for the PWA. Renders nothing when there is nothing to say. */
export function PwaBanner() {
  const needRefresh = usePwaStore((s) => s.needRefresh);
  const update = usePwaStore((s) => s.update);
  const dismiss = usePwaStore((s) => s.dismissRefresh);
  if (!needRefresh) return null;
  return (
    <div className="pwa-banner" role="status" data-testid="pwa-update">
      <RefreshCw size={16} aria-hidden="true" />
      <span>Saiu uma versão nova — você está na {versionLabel()}.</span>
      <button type="button" className="pwa-action" onClick={update}>Atualizar</button>
      <button type="button" className="icon-button" onClick={dismiss} aria-label="Depois"><X size={16} /></button>
    </div>
  );
}

