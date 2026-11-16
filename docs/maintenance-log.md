# Maintenance log

Date: 2026-11-15 (America/Sao_Paulo).

- Cloned the existing repository; no pre-existing local changes. Read AGENTS.md,
  ub-mode and security-reviewer. Kept changes within this project.
- Reproduced nine feedback boundary failures before changing production code.
  Fixed UTF-8 byte accounting, optional-field types, arbitrary-field persistence
  and storage-error disclosure. Added a failing streaming test, then stopped
  oversized bodies during reading. Split policy, parsing and persistence.
- Refreshed compatible dependency versions, upgraded the PWA plugin to v2,
  and overrode Zod/glob to patched releases. Did not force npm's proposed
  downgrades. Four low-severity development-tool advisories remain in deepmerge.
- Verified build on Node 26.13.1. Full coverage passed after the feedback changes.
  Crapper's highest score for the feedback core was 9.2; Dryer found no candidate
  duplication at 0.8 in that file. Mutation testing is recorded after completion.
- Reviewed all fetched branches/tags and scanned history/current files using
  Gitleaks. Examined GitHub surfaces and available Actions logs. Kept visibility
  private because 17 of 24 run logs have expired (HTTP 410), preventing complete
  review. See security-review.md for scope and remaining findings.

Final verification and publication are recorded below once completed.
