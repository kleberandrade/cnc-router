# Repository visibility and security review

Review date: 2026-11-15, America/Sao_Paulo. Scope: `kleberandrade/cnc-router` only.
Authorization covers repository/code inspection, tests/simulation, local changes,
main-branch publication after tests and conditional visibility change. No production
penetration testing, credential revocation, history rewriting or machine movement
was performed. **Decision: keep private.** The publication condition is not met.

## Evidence and scope

- Fetched full accessible Git history: 34 original commits, one branch (`main`),
  18 tags; clone was not shallow. Historical/current tracked source and asset paths
  were reviewed; no pre-existing local edits were overwritten.
- Checksum-verified official Gitleaks 8.30.1 binary: `git --log-opts=--all`, current tree,
  all 967 reachable text blobs (84 binary blobs inventoried separately), and available
  remote logs/metadata. No secret findings in these scans. The diff scan reported
  33 scanned commits; the independent complete-blob scan covered reachable contents.
- GitHub API: no issues, PRs, issue/commit comments, releases, Actions artifacts or
  webhooks. One production environment, 24 deployments, no GitHub Pages or discussions.
  Wiki is enabled but the authenticated wiki Git remote returned repository-not-found;
  wiki absence/content could not be confirmed independently.
- Actions: 24 historical runs; 28 log files were retrievable from seven runs. Logs
  for **17 runs returned HTTP 410**. Available logs and deployment/environment
  metadata were scanned locally, without publishing raw contents or credentials.
- Manual review covered feedback input/storage/origin/rate limits, browser project
  import/share boundaries, local storage, outbound integrations and asset notices.
  Author name/contact in existing code and commit metadata are intentional product
  attribution; no customer dataset was identified in reviewed text.
- Existing plans identify current fox drawings as original. Fonts/dependency
  licenses and bundled font metadata were checked. Historical artwork and screenshot
  rights cannot be established solely from scanner output or commit authorship.

## Findings and resolution

### Medium — byte budget did not constrain incoming bytes (fixed)

`api/_lib/feedback-core.ts`, formerly `handleFeedback`: body text was fully buffered
and limited by JavaScript character count. Multi-byte payloads exceeded the intended
budget, and an unfinished stream was read without an early byte cap. The new
`readBody` counts incoming bytes, cancels over-budget streams and incrementally
handles UTF-8. Regression tests reproduced both failures before the fixes.

### Low — invalid optional fields and arbitrary fields persisted (fixed)

`validate` accepted coerced email values and malformed diagnostics/error/honeypot
fields; spreading the input persisted arbitrary fields. Validation now checks types
and persistence selects recognized fields. Attachments remain untrusted JSON.

### Low — storage error details returned to clients (fixed)

The storage catch previously included provider error text. It now returns only a
stable generic 502 response. A regression test checks the complete response object.

### Low — development dependency advisory (open)

`vite-plugin-pwa -> workbox-build -> @rollup/plugin-node-resolve -> deepmerge` still
produces four low-severity npm audit entries from one root advisory:
[GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4).
The current published deepmerge 4.3.1 is affected; npm proposes downgrading the
PWA stack instead of a compatible patched deepmerge release. No forced downgrade
or vulnerability suppression was applied. This is a build-time tree, not a browser
runtime import. Avoid untrusted build configuration and reevaluate an upstream fix.
The audit gate rejects moderate-or-higher advisories while reporting these lows.

Patched Zod and glob transitive versions eliminate prior high/moderate alerts; the
full build, unit and browser suites are required to validate those overrides.

### Informational — endpoint abuse controls have limits (open operational constraint)

Feedback intentionally has no authentication; CORS is not access control and direct
clients can omit Origin. The in-memory per-IP limiter is instance-local and can grow
with distinct IPs. Trusted proxy headers, hosting quotas, private storage access and
manual retention are operator responsibilities. See feedback.md and limitations.md.

### Publication blockers — incomplete remote history and artwork provenance (open)

Expired Actions logs and unconfirmed wiki content prevent the requested full review
of surfaces that would become public. Earlier plans reference club marks/artwork;
rights to every historical image cannot be inferred from original-code MIT
permission. Resolve these gaps with the owner/platform before changing visibility.
Do not delete history or logs, revoke credentials or force-push as a workaround.
The new Inter OFL notice fixes the current notice mismatch while preserving the
existing Expo notice; it does not rewrite historical distribution records.

## Limitations

Secret scanners miss context, binary metadata and unknown credential formats. Binary
assets were inventoried with targeted font/source checks, not proven free of hidden
content or rights claims. Private feedback Blob contents, Vercel account data and
customer submissions are outside this repository review and were not retrieved.
No live storage writes, hosting deployment, physical machining or structural load
tests were performed. Absence of scanner findings is not a guarantee of safety.
