# Oficina CNC — agent guide

Product: **Oficina CNC**. npm repository: `cnc-router`. Author: Kleber Andrade
(`pdjkleber@gmail.com`). Existing production URL: `https://oficina-cnc.vercel.app`.

Historical sprint plans/Definition of Done: `docs/sprints/README.md`. Current setup:
README and `docs/development.md`. Layout: `docs/design-tokens.md`. Optional feedback:
`docs/feedback.md`. Publication review: `docs/security-review.md`.

## Stack and architecture

Vite + React + TypeScript, using **npm** and `package-lock.json` (do not add a pnpm
lockfile). Zustand manages project/UI/simulation state; zundo provides undo. Konva
renders the 2D editor, Three.js the lazy-loaded simulator, Clipper offsets/booleans,
opentype.js text outlines. `api/feedback.ts` optionally wires a Vercel Function to
private Blob storage. Use the supported Node version from `.nvmrc`.

The top bar (`TopBar.tsx`) contains app actions, workspaces/context tabs and ribbon.
Ribbon actions are `RibbonGroupDef[]` data rendered by `OverflowRibbon` in
`Ribbon.tsx`: groups have key/title/priority/items and items define
icon/label/onClick/testId/shortcut/description/featured/menu/custom. Never add a
standalone ribbon button. The ribbon fits, compacts to icons, then sends lower
priority groups to **Mais**; it never scrolls. Group labels open vertical menus
with `<id>-gm` test IDs. The 1280 px layout is near its width budget. Run
`e2e/ribbon-fusion.spec.ts` before adding ribbon actions. Occasional shape-specific
actions belong in their side-panel section.

Tooltips use a brief `description` plus `shortcut`; do not duplicate with `title`.
The side panel has shape/machine/cut/post tabs. Legacy navigator/stock/material/tools
section IDs map through `uiStore.setSection`. Use Group and NumberField (with hints),
short select labels, and `title` for any truncated text.

Use `components/Dialog.tsx`, `confirmDialog`/`promptDialog` and the mounted AskHost
for dialogs. Native `window.alert/confirm/prompt` are prohibited and tested.
Non-blocking feedback uses Notice/setNotice. Stock origin has five visual points
in OriginPicker; `originPoint()` in `lib/toolpath.ts` owns coordinate conversion.
Simulator materials come from `materialLook` in `lib/materials.ts`.

## Domain and implementation conventions

- Internal units are **mm**; UI fields show units. Pure logic belongs in `src/lib/`;
  components orchestrate it. Validate external input once at its boundary.
- Derived validation/toolpath/timing comes from `useDerived(selector)` in
  `state/derived.ts`, calculated in `workers/derived.worker.ts`. Do not call
  buildToolpath/validateProject in component renders or handlers. Structural work
  runs in the FEM worker. Keep UI latency low; `e2e/inp.spec.ts` tests a 200 ms
  interaction budget under 4× CPU throttling.
- Regenerate thumbnails (`npm run gen:thumbs`) after changing gallery examples;
  tests check their hashes. The build also generates landing thumbnails.
- DXF/SVG imports always enter through ImportVectorDialog (`uiStore.vectorFile`)
  and show a preview. Import heuristics need a visible escape (like infer-holes).
  User fonts stay in IndexedDB, not project JSON/share URLs; use exploded outlines
  for portable text.
- Project state is in useProjectStore. Shape/settings changes require appropriate
  PROJECT_SCHEMA_VERSION/migrateProject updates. UI and simulator state stay separate.
- Primary operations live in shape.operation/side/tabs/depth; extraOps expand via
  lib/expand.ts. Text also expands there; toolpath/export/simulation consume the
  expanded representation without special cases.
- UI text remains **pt-BR**, identifiers and current contributor documentation are
  English. Use short, concrete workshop language, without bureaucratic error prose,
  decorative emoji or new jargon. Do not silently translate the product interface.
- Use typography/spacing/control tokens in src/index.css and density/text attributes
  on html. Do not add fixed font sizes in components. Icons use lucide-react;
  BrandMark and Bricolage Grotesque define the product mark.
- Legal policies live in src/content/legal.ts, identity/author in content/about.ts,
  examples in content/examples.ts. Original code is MIT; retain third-party rights
  and notices. Do not replace historical attribution with the root license.
- Version comes from package.json through Vite defines and appears in UI, G-code and
  PWA. A completed sprint increments the minor (0.NN.0); fixes increment patch.
  Add a CHANGELOG entry (`## [version — theme] — date`), which supplies in-app news.

## Tests and Definition of Done

Unit/component tests live beside code under `__tests__`; feedback core tests are
in `api/__tests__`. E2E tests live in `e2e/`. Reuse helpers (`ribbonClick`,
`alignClick`, workspace navigation), preserve existing test IDs and cover new UI
flows. Playwright marks the first-run tour/storage notice done; clear the relevant
keys inside tests specifically covering onboarding. New screens enter the axe
accessibility suite, with zero serious/critical violations including contrast.

For each completed change:

1. A clean production build, including the TypeScript API/script/sample checks,
   with no new warnings; lint passes.
2. Coverage passes the configured 82% statements/lines, 80% functions, 77% branches.
   New src/lib or state logic has behavioral unit coverage.
3. Chromium E2E passes, plus mobile/tablet when layout changes. Validate the basic
   add shape → adjust → simulate → export flow. Await visible state in browser tests.
4. Toolpath/G-code changes include sample review for header, units, multi-pass motion
   and safe height. Never substitute tests for physical machining validation.
5. Update README/guides, JSDoc for new types, changelog and version as applicable.
6. Do not add console logging, any, native dialogs, duplicate tooltip titles or
   clipped text without an accessible full label.
7. On closing a numbered sprint, update its checklist/status/date and index and add
   screenshots when UI changes. Tag completed sprint releases as requested; patch
   maintenance is not a new numbered sprint.

Prefer an observed failing regression test before the correction; refactor only
with behavior pinned. Avoid tests that merely mirror the implementation or fake
canvas/WebGL correctness. No machine movement, G-code execution, serial connections
or production feedback writes belong in test validation.

## Git and publication

Commit only when requested; small commits explain why, what and validation.
Do not push unless requested. Preserve others' local changes. Never force-push or
rewrite history without explicit authorization. Repository visibility is a separate
conditional action: remain private while security/privacy/rights findings or
relevant review gaps remain. Keep tokens, feedback/customer data and raw review
logs out of Git. Do not manually deploy or publish packages without a request.
