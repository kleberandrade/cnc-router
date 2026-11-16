# Optional feedback service

## Behavior

The app's **Sugestões e problemas…** dialog sends `POST /api/feedback`. The optional
Vercel Function stores JSON with `access: "private"` in Vercel Blob. The editor,
CAM engine and simulation do not require this service. Vite/preview does not serve
`/api`; missing configuration returns 501 in the Vercel wrapper and the UI offers
a pre-filled email fallback. Network failures/offline use are handled in the UI.

The core uses Web Request/Response and an injected storage function for unit tests.
It accepts `type` (`sugestao`, `problema`, `outro`), title (3–140 characters), message
(10–5000), optional email (string, up to 254), optional diagnostics object, project
JSON and lastError string/null. `website` is a honeypot. Unknown top-level fields
are discarded. Non-string optional fields are rejected rather than coerced.

The request stream is read up to **1 MiB in bytes**, independent of Content-Length,
and cancelled when that budget is exceeded. UTF-8 split across chunks is decoded
incrementally. Errors use 400/403/405/413/429/502; storage provider details never go
in the response. Success returns `{ ok, id, receivedAt }`; the reference ID is not
an authentication token. Stored paths are
`feedback/YYYY-MM/<timestamp>-<type>-<id>.json`.

## Configuration

Copy `.env.example` to `.env.local` only when configuring the optional backend.
Keep `BLOB_READ_WRITE_TOKEN` server-side and never prefix it with `VITE_`. Connect
a private Blob store to a Vercel project through its storage integration, then
supply the generated token through server environment settings. No deployment is
needed for local drawing/export; maintenance does not deploy this service.

Allowed browser origins are listed in `api/feedback.ts`, with optional Vercel
preview/production host variables. No-Origin requests are accepted. This is an
origin policy, not authentication. The limiter permits five requests per minute
per IP **per warm function instance** and returns `Retry-After: 60`; it resets on
restart and is not a distributed abuse defense. Trust forwarded IPs only behind
the hosting proxy. Use hosting-level quotas/controls for a public endpoint.

## Privacy and operations

Feedback can contain email, project geometry and diagnostics at the user's option;
IP/user-agent are recorded by the endpoint. Keep Blob objects, report exports and
tokens private. Review access and delete records according to the in-app retention
policy (up to 12 months). Cleanup is currently manual; there is no retention job.
Do not put real submissions or report output into Git, examples, CI artifacts or logs.

Read records in the storage dashboard or use the existing report script with a
token already injected into the environment:

```bash
node --import tsx scripts/feedback-report.ts 2026-11
```

The script can print personal data; use it only in a private terminal. `--json`
emits records for private inspection. It does not send email or delete anything.
Pricing/quotas depend on the hosting account and must be checked by its operator.

## Tests

```bash
npm test -- api/__tests__/feedback-core.test.ts src/lib/__tests__/feedback.test.ts
```

Tests inject storage and cover validation, byte limits/stream cancellation, method,
origin, honeypot, sliding-window limits and storage failures. `e2e/feedback.spec.ts`
mocks the HTTP route; it does not validate a live Blob service or real submissions.
