import type { Shape, MachineSettings } from "../types";
import { APP_VERSION, GIT_SHA, BUILD_DATE, versionLabel } from "./version";
import { PRODUCT, AUTHOR } from "../content/about";

export type FeedbackType = "sugestao" | "problema" | "outro";
export const FEEDBACK_TYPES: { id: FeedbackType; label: string }[] = [
  { id: "sugestao", label: "Sugestão de melhoria" },
  { id: "problema", label: "Problema / erro" },
  { id: "outro", label: "Outro" },
];

export interface FeedbackDraft {
  type: FeedbackType;
  title: string;
  message: string;
  email: string;
  includeDiagnostics: boolean;
  includeProject: boolean;
}

/** Last runtime errors captured (window.onerror / unhandledrejection), newest last. */
const errorBuffer: string[] = [];
const MAX_ERRORS = 5;
export function recordError(msg: string): void {
  errorBuffer.push(`${new Date().toISOString()} ${msg}`.slice(0, 500));
  if (errorBuffer.length > MAX_ERRORS) errorBuffer.shift();
}
export function lastErrors(): string[] { return [...errorBuffer]; }
export function clearErrors(): void { errorBuffer.length = 0; }
export function installErrorCapture(): void {
  if (typeof window === "undefined") return;
  window.addEventListener("error", (e) => recordError(`${e.message} @ ${e.filename}:${e.lineno}`));
  window.addEventListener("unhandledrejection", (e) => recordError(`unhandledrejection: ${String((e as PromiseRejectionEvent).reason).slice(0, 300)}`));
}

export interface Diagnostics {
  version: string; sha: string; buildDate: string;
  userAgent: string; language: string; viewport: string; devicePixelRatio: number;
  theme: string | null; standalone: boolean; online: boolean;
  project: { shapes: number; kinds: Record<string, number>; machine: string; stock: string; material: string; post: string; units: string; tools: number };
}

/** Anonymous facts that help reproduce a report — no personal data, no shape geometry. */
export function buildDiagnostics(shapes: Shape[], settings: MachineSettings): Diagnostics {
  const kinds: Record<string, number> = {};
  for (const s of shapes) kinds[s.kind] = (kinds[s.kind] ?? 0) + 1;
  const w = typeof window !== "undefined" ? window : undefined;
  return {
    version: APP_VERSION, sha: GIT_SHA, buildDate: BUILD_DATE,
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
    language: typeof navigator !== "undefined" ? navigator.language : "",
    viewport: w ? `${w.innerWidth}×${w.innerHeight}` : "",
    devicePixelRatio: w?.devicePixelRatio ?? 1,
    theme: typeof document !== "undefined" ? document.documentElement.getAttribute("data-theme") : null,
    standalone: !!w?.matchMedia?.("(display-mode: standalone)").matches,
    online: typeof navigator !== "undefined" ? navigator.onLine : true,
    project: {
      shapes: shapes.length, kinds,
      machine: `${settings.machinePreset} ${settings.workArea.width}×${settings.workArea.height}×${settings.workArea.zTravel}`,
      stock: `${settings.stock.width}×${settings.stock.height}×${settings.stock.thickness} @${settings.stock.offsetX},${settings.stock.offsetY} ${settings.stock.origin}`,
      material: settings.material, post: settings.post, units: settings.exportUnits, tools: settings.tools.length + 1,
    },
  };
}

export const MAX_PROJECT_BYTES = 512 * 1024;

export interface FeedbackRequest {
  type: FeedbackType; title: string; message: string; email?: string; website: string;
  diagnostics?: Diagnostics; project?: unknown; lastError?: string | null;
}

/** Build the request body from the form + app state. The honeypot `website` is always empty. */
export function buildPayload(draft: FeedbackDraft, shapes: Shape[], settings: MachineSettings): { payload: FeedbackRequest; projectTooBig: boolean } {
  const payload: FeedbackRequest = { type: draft.type, title: draft.title.trim(), message: draft.message.trim(), website: "" };
  if (draft.email.trim()) payload.email = draft.email.trim();
  if (draft.includeDiagnostics) {
    payload.diagnostics = buildDiagnostics(shapes, settings);
    const errs = lastErrors();
    payload.lastError = errs.length ? errs.join("\n") : null;
  }
  let projectTooBig = false;
  if (draft.includeProject) {
    const project = { shapes, settings };
    if (JSON.stringify(project).length <= MAX_PROJECT_BYTES) payload.project = project;
    else projectTooBig = true;
  }
  return { payload, projectTooBig };
}

export type SendResult =
  | { ok: true; id: string }
  | { ok: false; reason: "offline" | "unavailable" | "rejected" | "network" | "ratelimit"; message: string };

/** POST to /api/feedback with a timeout; maps HTTP outcomes to user-facing reasons. */
export async function sendFeedback(payload: FeedbackRequest, opts: { fetchFn?: typeof fetch; timeoutMs?: number; endpoint?: string } = {}): Promise<SendResult> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return { ok: false, reason: "offline", message: "Você está offline — conecte-se e tente de novo, ou envie por e-mail." };
  const f = opts.fetchFn ?? fetch;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 12_000);
  try {
    const res = await f(opts.endpoint ?? "/api/feedback", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload), signal: ctrl.signal });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; id?: string; error?: string };
    if (res.ok && data.ok && data.id) return { ok: true, id: data.id };
    if (res.status === 501 || res.status === 404) return { ok: false, reason: "unavailable", message: "O canal de envio ainda não está ativo — use o e-mail." };
    if (res.status === 429) return { ok: false, reason: "ratelimit", message: data.error ?? "Muitos envios — aguarde 1 minuto." };
    return { ok: false, reason: "rejected", message: data.error ?? `Falha ao enviar (HTTP ${res.status}).` };
  } catch {
    return { ok: false, reason: "network", message: "Não foi possível falar com o servidor — tente de novo ou envie por e-mail." };
  } finally {
    clearTimeout(timer);
  }
}

/** mailto: fallback with the same content (project omitted). */
export function mailtoFor(payload: FeedbackRequest): string {
  const typeLabel = FEEDBACK_TYPES.find((t) => t.id === payload.type)?.label ?? payload.type;
  const subject = `[${PRODUCT.name} ${versionLabel()}] ${typeLabel}: ${payload.title}`;
  const lines = [payload.message, "", "---", `Versão: ${versionLabel()} (${GIT_SHA})`];
  if (payload.diagnostics) lines.push(`Navegador: ${payload.diagnostics.userAgent}`, `Projeto: ${JSON.stringify(payload.diagnostics.project)}`);
  if (payload.lastError) lines.push(`Último erro: ${payload.lastError}`);
  return `mailto:${AUTHOR.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`;
}
