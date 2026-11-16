# Development

## Toolchain

Use `.nvmrc` (Node 26.13.1) and npm 11+. Node 24.22.3+ is also accepted within the
v24 LTS line. `npm ci` reproduces the lockfile. React 19, TypeScript 6, Vite 8,
Vitest 4 and PWA plugin 2 are the validated major versions. Refresh compatible
versions with `npm update`; review migrations and peer requirements before major
upgrades. Zod and glob overrides select patched transitive versions. `deepmerge`
has a remaining low-severity advisory with no patched current release; see the
security review rather than applying npm's unrelated forced downgrades.

## Data flow and glossary

A **shape** is a geometric part with machining operations. A **stock** is the sheet
on the machine table. The **work origin** determines the exported coordinate offset.
A **pass** removes part of the depth; a **segment** is one toolpath movement. A
**post-processor** emits controller-specific program syntax. A **tab** holds a
cut-out part to its stock. A **pocket** removes an interior region.

Internal dimensions use millimetres and table coordinates. Keep pure logic in
`src/lib/`; components orchestrate it. Project state persists in localStorage,
UI/simulation state have separate stores, and undo uses zundo. Derived validation,
toolpath and timing run in `derived.worker.ts`; structural jobs run in `fem.worker.ts`.
Use selectors rather than recalculating derived data in component renders.

At import boundaries, `projectFile.ts` migrates versioned JSON, vector dialogs
preview SVG/DXF and image dialogs preview raster tracing/relief. User fonts live
in IndexedDB; shared files must use exploded outlines to be portable.

## Validation workflow

1. Write a behavioral regression test and observe its expected failure for a fix.
2. Make the smallest correction, then separate policy/parsing from pure logic.
3. Run the focused test, lint, full coverage and production build.
4. Run Chromium E2E; use the mobile/tablet projects after layout changes.
5. For CAM changes, inspect generated sample units, multi-pass motion, safe height
   and controller syntax. No automated result certifies physical machining.

`npm run build` includes TypeScript checks for application, API, scripts, Playwright
configuration and executable samples. `prebuild` regenerates gallery/landing
thumbnails; commit generated differences only when the underlying examples change.
`npm run gen:thumbs` and `npm run gen:landing` run those separately.

The `test:coverage` script uses V8 with HTML/LCOV output. Its actual thresholds are
82% statements/lines, 80% functions and 77% branches. `Editor.tsx`, `Simulator.tsx`
and the thin Vercel wrapper are excluded explicitly; browser tests and feedback-core
unit tests provide complementary evidence. Avoid mocking canvas output as proof
of rendering correctness.

Optional local quality tools (not project dependencies):

```bash
crapper --use-existing-coverage api/_lib/feedback-core.ts
dryer --threshold 0.8 api/_lib/feedback-core.ts
mutator --use-existing-coverage --max-workers 2 --test-command 'node_modules/.bin/vitest run api/__tests__/feedback-core.test.ts' api/_lib/feedback-core.ts
```

The simulator invalidates its GPU frame when geometry, playback, projection,
viewport or camera changes; a paused unchanged scene does not draw continuously.
`e2e/simulator-idle.spec.ts` counts real WebGL calls without replacing rendering.
The INP proxy uses SwiftShader software WebGL, the original 200 ms limit and 4× CPU
throttling on both local and CI runs. That test has no workflow retries; its three
internal samples retain the original measurement policy.

Generated reports belong in ignored `.metrics/`, coverage and `target/` folders.
The maintenance log records the scope/results; a score on one file is not a
whole-project quality claim.

## Contribution boundaries

Preserve the Portuguese workshop interface and existing test IDs. Use the shared
Dialog and Notice components; avoid native alert/confirm/prompt. Ribbon actions
are data in TopBar and must fit its overflow rules. Use design tokens for layout.
Add tests next to pure logic and components, browser flows under `e2e/`. Do not
connect hardware as part of automated validation. Never commit `.env` files,
private feedback, customer geometry or credentials. Review changes before pushing.

## Deployment boundary

`vercel.json` sets `git.deploymentEnabled: false`: pushing this maintenance work
runs GitHub CI but must not update the hosted app. This is the official Vercel
[Git configuration](https://vercel.com/docs/project-configuration/git-configuration).
The owner can explicitly re-enable automatic deployment when deployment is intended.
No Vercel CLI deployment or package publication is part of this maintenance.
