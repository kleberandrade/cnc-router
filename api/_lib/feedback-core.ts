/**
 * Framework-free core of the feedback endpoint (Web Request/Response), so it can be unit-tested
 * and reused. `api/feedback.ts` wires it to Vercel.
 */

export interface FeedbackPayload {
  type: "sugestao" | "problema" | "outro";
  title: string;
  message: string;
  email?: string;
  /** Honeypot: must stay empty. */
  website?: string;
  diagnostics?: Record<string, unknown>;
  project?: unknown;
  lastError?: string | null;
}

export interface Stored extends FeedbackPayload {
  id: string;
  receivedAt: string;
  ip?: string;
  userAgent?: string;
}

export interface Deps {
  /** Store the JSON and return its pathname/url. */
  save: (pathname: string, body: string) => Promise<{ url: string }>;
  now?: () => Date;
  id?: () => string;
  /** Allowed origins (exact) — defaults to same-origin (no Origin header) + these. */
  origins?: string[];
  maxBodyBytes?: number;
  /** requests per minute per IP */
  ratePerMinute?: number;
}

const TYPES = new Set(["sugestao", "problema", "outro"]);
const MAX_BODY = 1024 * 1024;

const rate = new Map<string, number[]>();

function json(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers } });
}

export function shortId(): string {
  return Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function textInRange(value: unknown, min: number, max: number): boolean {
  return typeof value === "string" && value.trim().length >= min && value.length <= max;
}

function validEmail(value: unknown): boolean {
  if (value === undefined || value === "") return true;
  return typeof value === "string" && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function optionalProblem(b: Record<string, unknown>): string | null {
  if (b.diagnostics !== undefined && !isRecord(b.diagnostics)) return "diagnóstico inválido";
  if (b.lastError !== undefined && b.lastError !== null && typeof b.lastError !== "string") return "último erro inválido";
  if (!validEmail(b.email)) return "e-mail inválido";
  return null;
}

function requiredProblem(b: Record<string, unknown>): string | null {
  if (!TYPES.has(b.type as string)) return "tipo inválido";
  if (!textInRange(b.title, 3, 140)) return "título deve ter entre 3 e 140 caracteres";
  if (!textInRange(b.message, 10, 5000)) return "mensagem deve ter entre 10 e 5000 caracteres";
  return null;
}

/** Validate untrusted JSON once at the boundary; returns a problem message or null. */
export function validate(p: unknown, maxBytes = MAX_BODY, size = 0): string | null {
  if (!isRecord(p)) return "corpo inválido";
  if (size > maxBytes) return "corpo grande demais";
  if (p.website !== undefined && typeof p.website !== "string") return "campo website inválido";
  if (p.website) return "spam";
  return optionalProblem(p) ?? requiredProblem(p);
}

/** Read at most the configured byte budget, independent of Content-Length. */
async function readBody(req: Request, maxBytes: number): Promise<string | null> {
  if (!req.body) return "";
  const reader = req.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let text = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) return text + decoder.decode();
      size += value.byteLength;
      if (size > maxBytes) { await reader.cancel(); return null; }
      text += decoder.decode(value, { stream: true });
    }
  } finally { reader.releaseLock(); }
}

/** Sliding-window limiter (in-memory per function instance — good enough against accidents, not attacks). */
export function allow(ip: string, perMinute: number, now: number): boolean {
  const list = (rate.get(ip) ?? []).filter((t) => now - t < 60_000);
  if (list.length >= perMinute) { rate.set(ip, list); return false; }
  list.push(now);
  rate.set(ip, list);
  return true;
}
export function resetRate(): void { rate.clear(); }

function requestPolicy(req: Request, deps: Deps): { cors: Record<string, string>; response?: Response } {
  const origin = req.headers.get("origin");
  const allowed = !origin || (deps.origins ?? []).includes(origin);
  const cors: Record<string, string> = origin && allowed ? { "access-control-allow-origin": origin, vary: "Origin" } : {};
  if (req.method === "OPTIONS") return { cors, response: new Response(null, { status: allowed ? 204 : 403, headers: { ...cors, "access-control-allow-methods": "POST, OPTIONS", "access-control-allow-headers": "content-type" } }) };
  if (req.method !== "POST") return { cors, response: json(405, { error: "método não permitido" }, { allow: "POST, OPTIONS" }) };
  if (!allowed) return { cors, response: json(403, { error: "origem não permitida" }) };

  return { cors };
}

export async function handleFeedback(req: Request, deps: Deps): Promise<Response> {
  const { cors, response } = requestPolicy(req, deps);
  if (response) return response;
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";
  const time = (deps.now ?? (() => new Date()))();
  if (!allow(ip, deps.ratePerMinute ?? 5, time.getTime())) return json(429, { error: "muitos envios — tente de novo em 1 minuto" }, { "retry-after": "60", ...cors });
  return acceptBody(req, deps, cors, ip, time);
}

async function acceptBody(req: Request, deps: Deps, cors: Record<string, string>, ip: string, time: Date): Promise<Response> {
  let body: unknown;
  try {
    const raw = await readBody(req, deps.maxBodyBytes ?? MAX_BODY);
    if (raw === null) return json(413, { error: "corpo grande demais" }, cors);
    body = JSON.parse(raw);
  } catch { return json(400, { error: "JSON inválido" }, cors); }
  const problem = validate(body);
  if (problem === "spam") return json(200, { ok: true, id: "ok" }, cors);
  if (problem) return json(400, { error: problem }, cors);
  return storeFeedback(body as FeedbackPayload, req, deps, cors, ip, time);
}

async function storeFeedback(p: FeedbackPayload, req: Request, deps: Deps, cors: Record<string, string>, ip: string, time: Date): Promise<Response> {
  const id = (deps.id ?? shortId)();
  const receivedAt = time.toISOString();
  const stored: Stored = {
    type: p.type, title: p.title, message: p.message,
    email: p.email, diagnostics: p.diagnostics, project: p.project, lastError: p.lastError,
    id, receivedAt, ip, userAgent: req.headers.get("user-agent") ?? undefined,
  };
  const month = receivedAt.slice(0, 7);
  const pathname = `feedback/${month}/${receivedAt.replace(/[:.]/g, "-")}-${p.type}-${id}.json`;
  try {
    await deps.save(pathname, JSON.stringify(stored, null, 2));
  } catch {
    return json(502, { error: "não foi possível guardar o envio" }, cors);
  }
  return json(200, { ok: true, id, receivedAt }, cors);
}
