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
  private pending wiki/image review; the initial assessment also incorrectly treated
  17 expired run logs as a blocker. The completed review below supersedes that decision.

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

- CI run 43797129030 passed its latency gate on the first attempt (drawing workspace
  80 ms), but log review found a different camera-view test flaky: its fixed 500 ms
  sleep expired before a software-rendered animation reached the top view. Replaced
  fixed waits with assertions polling the rendered camera orientation, and added
  `failOnFlakyTests` in CI so a passing retry cannot silently approve any flaky test.

- After camera-readiness assertions and strict flaky handling, the full local
  browser suite passed again: 145 passed, two platform-specific skips. TypeScript
  and focused lint checks passed. Vite development startup on isolated localhost
  port 5187 returned HTTP 200 for /app/; that temporary server was then stopped.
  This final change affects tests/configuration/documentation, not machining logic.

## Editor latency follow-up — 2026-11-16

- Strict CI run 43798370073 correctly failed instead of retrying away a 216 ms
  rectangle-add interaction. Camera readiness and the drawing-workspace transition
  passed (64 ms); no latency budget was raised.
- Found that the nominally static editor layer still recreated every grid element
  and points array on selection/part updates, causing Konva to repaint it. A new
  real-canvas test failed as expected: background clears increased from 9 to 11
  after adding a circle, although the table/grid/stock were unchanged.
- Isolated that existing layer behind a memoized component whose inputs are only
  viewport/stock/theme data. The regression also requires a zoom to redraw it.

- A local performance run overlapped unrelated Java/Android work (host load 36.61,
  later 22.74); did not stop those processes or claim its 1608 ms reading as an
  isolated application measurement. Confirmed heavy Java processes belonged to
  other directories. Functional background assertions reached the zoom step;
  corrected the test to hover the interactive editor container, not its inert canvas.
- Reviewed the proxy premise after repeated noisy gates: it combined hover events
  and delayed entries without action timestamps. Aligned attribution with Event
  Timing: nonzero interactionId, startTime within the measured action, a paint before
  collection, and draining pending observer records. Preserved 200 ms/4× CPU,
  software WebGL, three samples and no outer retries; documented sub-16 ms zeros.

- Corrected-proxy browser run passed with rectangle add at 80 ms and drawing
  workspace at 48 ms; the functional background/zoom regression also passed.
  Shared the editor's stable coordinate converter with the memoized layer rather
  than keeping two copies of that conversion rule. No unrelated process was stopped.

- The tool-diameter timing action now uses actual selection/typing/Enter key events
  instead of programmatic fill, so Event Timing can attribute the edit itself.
  Editor static analysis reports legacy complexity 128 with coverage/CRAP N/A;
  Dryer found no duplication candidates at 0.8. Canvas behavior remains verified
  in real browser tests rather than assigned fabricated unit/mutation coverage.

- Final 0.35.4 local checks: 484 unit tests passed with unchanged coverage, production
  build passed, and all 146 browser checks passed (two intentional tablet skips).
  Rechecked the final timing file after closing edits: its largest reported
  best-of-three value was 120 ms, rectangle add 96 ms, drawing workspace 32 ms,
  with real numeric-key events, the original budget and no outer retry.
  TypeScript and lint passed; no new production warnings or dependency changes.

## Publication review completion — 2026-11-16

- Confirmed the authenticated GitHub wiki is empty (first-page creation screen).
  Enumerated all 41 reachable commits/1,125 unique blobs at `9f70285`: 1,041 text
  blobs and 84 binary assets. Reviewed all 103 image/font/SVG blobs, including
  removed files and older versions; committed a path/blob provenance inventory.
- Visually inspected all 82 raster images using labelled overviews/targeted originals,
  OCR-processed 80 PNG/WebP originals, inspected SVG source, raster containers and
  existing font metadata/licenses. No sensitive image content or identified
  unauthorized third-party artwork remained. Club screenshots document own geometric
  teaching examples; historical sources explicitly distinguish them from official art.
- Matched five historical starter assets byte for byte with pinned official Vite
  template blobs and retained its MIT notice. Preserved all original images/history.
- Refreshed GitHub surfaces: 28 runs, 89 available log files, eight artifacts. Expanded
  embedded Playwright report data/traces; visually reviewed and OCR-processed 71
  unique raster resources/frames. Trace requests are localhost-only, without auth
  or cookie headers. Complete text/history scans found no source secrets; the sole
  remote scanner hit was a temporary clone token in the private owner API response,
  absent from source/logs/artifacts/images and never committed.
- Corrected the report: 17 unavailable HTTP-410 logs are an evidence limitation,
  not a publication blocker. No logs, artifacts, commits or tags were removed.
  Baseline CI 43801228360 passed 484 unit tests and 146 E2E checks (two intentional
  tablet skips), with no accepted flaky retry. This follow-up changes documentation
  and attribution only; runtime and deployment configuration remain unchanged.

- Pushed review/attribution commit `ef52be7`; CI 43804676927 passed 484 unit tests
  and 146 browser checks, with two intentional skips and zero flaky/unexpected
  results. Refreshed all relevant GitHub surfaces: 29 runs/ten artifacts; reviewed
  the new 27 log files and two artifacts, including embedded report JSON. The four
  new raster resource files match previously reviewed coverage assets by SHA-256.
- Applied the authorized visibility change to public on 2026-11-16. Anonymous
  GitHub API access confirms `private: false`, `visibility: public`, and a null
  temporary clone-token field. All 41 baseline commits and 18 tag object hashes
  remain intact; no force push or deletions. Existing deployments remained 24;
  Git-triggered deployment stays disabled. This final receipt changes only docs.

## Requested production deployment — 2026-11-16

- The owner explicitly authorized a manual Vercel production deployment and README
  images after the repository publication. Added references to the already-reviewed
  editor/simulator WebP assets, without changing their contents.
- Authenticated dashboard inspection identified the existing `cnc-router` project
  and `cnc-router-ten.vercel.app` production domain; the previously documented
  `oficina-cnc.vercel.app` returned HTTP 404. Corrected active product/SEO/share/sheet
  links and the explicit feedback origin for patch 0.35.5. Historical sprint records
  and sample program headers retain their original references.
- Keep Git-triggered deployment disabled and use the project's manual deployment
  action. No new project, domain purchase, credential change or feedback submission
  is part of this deployment validation.
- Local validation for 0.35.5: Node 26.13.1 production build passed; lint retained
  zero errors/18 existing warnings. The build reports the two existing unbundled
  Vercel analytics script notices from the static landing page. All 484 unit tests
  passed with coverage gates (91.40% lines), and 13 focused browser checks passed
  for product metadata, SEO, persistence, simulation, sheets and G-code export.

- The first production deployment (`fd5b1cc`, 0.35.5) reached Ready and passed the
  live editor/simulator/export checks, but GET/OPTIONS on feedback returned 504.
  Vercel runtime logs explicitly reported that a plain default `(req, res)` handler
  ignores returned Web `Response` objects. Three new entry-point regression checks
  failed with `default.fetch is not a function` before the fix.
- Patch 0.35.6 uses the documented `export default { fetch }` entry contract;
  the core validation/stream/storage rules remain unchanged. Regression tests mock
  Blob storage and verify no writes for configuration, method and preflight checks.
- Local 0.35.6 checks passed: build, lint (18 existing warnings), all 487 unit tests
  in 73 files with unchanged passing coverage, and all 13 focused browser checks.
  The 0.35.5 full CI also passed while this production-only integration issue was
  reproduced; a local preview cannot exercise Vercel's function entry contract.
