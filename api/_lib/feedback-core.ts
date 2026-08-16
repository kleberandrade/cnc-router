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

/** Validate a parsed body; returns a problem message or null. */
export function validate(p: unknown, maxBytes = MAX_BODY, size = 0): string | null {
  if (!p || typeof p !== "object") return "corpo inválido";
  const b = p as Partial<FeedbackPayload>;
  if (b.website) return "spam";
  if (!TYPES.has(b.type as string)) return "tipo inválido";
  if (typeof b.title !== "string" || b.title.trim().length < 3 || b.title.length > 140) return "título deve ter entre 3 e 140 caracteres";
  if (typeof b.message !== "string" || b.message.trim().length < 10 || b.message.length > 5000) return "mensagem deve ter entre 10 e 5000 caracteres";
  if (b.email !== undefined && b.email !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email)) return "e-mail inválido";
  if (size > maxBytes) return "corpo grande demais";
  return null;
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

export async function handleFeedback(req: Request, deps: Deps): Promise<Response> {
  const now = deps.now ?? (() => new Date());
  const origin = req.headers.get("origin");
  const allowed = !origin || (deps.origins ?? []).includes(origin);
  const cors: Record<string, string> = origin && allowed ? { "access-control-allow-origin": origin, vary: "Origin" } : {};
  if (req.method === "OPTIONS") return new Response(null, { status: allowed ? 204 : 403, headers: { ...cors, "access-control-allow-methods": "POST, OPTIONS", "access-control-allow-headers": "content-type" } });
  if (req.method !== "POST") return json(405, { error: "método não permitido" }, { allow: "POST, OPTIONS" });
  if (!allowed) return json(403, { error: "origem não permitida" });

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";
  if (!allow(ip, deps.ratePerMinute ?? 5, now().getTime())) return json(429, { error: "muitos envios — tente de novo em 1 minuto" }, { "retry-after": "60", ...cors });

  const raw = await req.text();
  if (raw.length > (deps.maxBodyBytes ?? MAX_BODY)) return json(413, { error: "corpo grande demais (máx. 1 MB)" }, cors);
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return json(400, { error: "JSON inválido" }, cors); }
  const problem = validate(body, deps.maxBodyBytes ?? MAX_BODY, raw.length);
  if (problem === "spam") return json(200, { ok: true, id: "ok" }, cors); // silently accept honeypot hits
  if (problem) return json(400, { error: problem }, cors);

  const p = body as FeedbackPayload;
  const id = (deps.id ?? shortId)();
  const receivedAt = now().toISOString();
  const stored: Stored = { ...p, id, receivedAt, ip, userAgent: req.headers.get("user-agent") ?? undefined };
  delete (stored as Partial<Stored>).website;
  const month = receivedAt.slice(0, 7);
  const pathname = `feedback/${month}/${receivedAt.replace(/[:.]/g, "-")}-${p.type}-${id}.json`;
  try {
    await deps.save(pathname, JSON.stringify(stored, null, 2));
  } catch (err) {
    return json(502, { error: "não foi possível guardar o envio", detail: (err as Error).message }, cors);
  }
  return json(200, { ok: true, id, receivedAt }, cors);
}
