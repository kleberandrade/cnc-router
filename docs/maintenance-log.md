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

Publication was authorized after passing relevant checks; the delivery message records the final remote commit and CI outcome.

- Added Node 26.13.1 LTS selection and broadened TypeScript checking to API, scripts,
  Playwright configuration and examples. This exposed an un-awaited asynchronous
  example build in landing thumbnail generation; corrected it rather than excluding it.
- First browser run: 140 passed, two skipped, four failures. The isolated INP check
  passed without changing its 200 ms budget. News now checks the current release
  version instead of assuming every patch is a numbered sprint.
- Reproduced stale numeric values and an erroneous 40100 mm dimension during
  browser editing. Replaced NumberField's effect synchronization with an explicit
  editing draft; added behavioral coverage and awaited visible dimension updates.
- Applied the requested English GitHub About description using authenticated API;
  verified the repository remains private. Added stack/license/live-CI badges.
- Added English active guides and an offline executable CAM example. Preserved
  Portuguese historical changelog/sprint records and the Portuguese product UI.
  Added MIT for original work, retained direct-runtime license notices, and added
  the missing Inter OFL notice identified by the font's embedded metadata.

- Prevented Git-triggered Vercel deployment with `git.deploymentEnabled: false`;
  checked its Git subsection against Vercel's official schema. This keeps the
  authorized source push separate from deployment; re-enabling is an owner action.
- Final local validation: 484 tests in 72 files passed. Coverage: statements 89.14%,
  branches 78.70%, functions 85.33%, lines 91.40%. An earlier run competing with
  browser/build work timed out in two tests; limiting Vitest to two workers and
  running the suites sequentially resolved this without raising timeouts or lowering gates.
- Full browser suite: 144 passed, two intentionally skipped mobile-only checks in
  the tablet project. Eight focused shape/assembly checks also passed after a
  behavior-preserving keyboard helper extraction. INP proxy retained the 200 ms
  limit with 4× CPU throttling. No physical/mobile-device/hardware tests were claimed.
- Production build and executable example/baseline commands passed. Lint: zero
  errors, 18 existing-code warnings (19 before the numeric-field correction).
  Audit gate at moderate passed; four low development-tree entries remain.
- Crapper: maximum 9.4 across feedback-core and NumberField; threshold 10 passed.
  Dryer: no duplication candidates at 0.8 in those two files. Mutator: all 92 unique
  sites killed across the runs (71 feedback, 21 numeric field), no survivors.
  Two default-argument sites missed by the coverage mapper were explicitly tested
  and mutated with `--no-coverage`; no whole-project mutation score is implied.
- Gitleaks 8.30.1 found no secrets in accessible history blobs, current tree or the
  available remote logs/metadata. Raw reports stayed in temporary local storage.
- README local links resolved; five static badge endpoints returned HTTP 200.
  The CI badge references the existing ci.yml/main workflow and has no embedded token.
  Manifest and lockfile version/license/engines match; fetched origin/main was an
  ancestor of the local changes. No force push, remote visibility change, manual
  hosting deployment or package publication was performed during preparation.

## Follow-up from remote validation — 2026-11-16

- Published the four prepared commits to main at ceb5d5e; verified About, six badges,
  private visibility, MIT detection and zero deployments at that head. CI run
  43795004914 completed successfully, but log review found the latency test only
  passed after two retries (768/744 ms opening the drawing workspace).
- Reproduced the issue locally using software WebGL and CPU profiling. The paused
  simulator continuously redrew its unchanged scene. A new real-WebGL regression
  failed as expected, observing 69 draw calls in an idle 200 ms window.
- Changed the existing render loop to draw only after camera/scene/playback/viewport
  invalidation; stopped repeating frame-derived work for unchanged paused scenes.
  The new test also requires drawing to resume when the camera changes.
- Retained the 200 ms budget and 4× CPU throttle; made the performance test use
  software WebGL consistently and disabled its outer retries. Did not lower gates
  or classify the initial flaky result as a clean first-attempt pass.

- Focused real-browser checks passed (10 tests), including software-WebGL latency,
  paused idle draws, playback/material removal, camera views and projection. The
  drawing-workspace transition measured 168 ms in that focused run; this is a local
  software-renderer observation, not a physical-device or production INP claim.
- Quality-tool scope for this follow-up: Dryer found no duplication candidates in
  Simulator at 0.8. Crapper reports existing Simulator complexity 79 (no unit
  coverage/CRAP score because the GPU component is explicitly unit-excluded).
  Mutator scanned 353 sites there; they were not executed against mocked rendering.
  The earlier 92 killed mutations apply only to feedback-core and NumberField.
  Real browser regression tests provide the evidence for this rendering correction;
  reducing the legacy component's overall complexity remains future work.

- Patch 0.35.3 final local validation: build passed without warnings; lint retained
  zero errors/18 existing warnings; 484 unit tests passed with the same coverage
  (91.40% lines). Full browser suite: 145 passed, two intentional tablet skips.
  The explicit software-WebGL latency test passed with outer retries disabled;
  its drawing-workspace measurement was 176 ms in this full local run.
