# Design tokens and layout rules

The source of truth is `src/index.css` (`:root`), including dark-theme semantic
overrides and density/text preferences. These notes describe the current desktop
base; responsive rules can override sizes.

- Spacing `--s1` through `--s6`: 4, 8, 12, 16, 24, 32 px. Containers use at least
  `--s3` padding; use the scale for field gaps and panel spacing.
- Controls: `--control-h` 30 px, `--control-h-sm` 26 px, `--topbar-h` 60 px.
  Mobile inputs use 16 px text to avoid iOS zoom and larger touch targets.
- Type: `--fs-xs` 10.5 px, `--fs-sm` 11 px, `--fs-md` 12 px, `--fs-base` 13 px,
  `--fs-lg` 14 px. New component styles use tokens rather than fixed font sizes.
- Radius: `--radius` 10 px and `--radius-sm` 6 px.
- Semantic colors: `--bg`, `--surface`, `--surface-2`, `--text`, `--text-muted`,
  `--border`, `--border-strong`, `--danger`, `--success`, `--accent`, `--blueprint`,
  `--warn`. Dark mode changes semantics rather than individual components.
- Fonts: Fraunces (`--font-display`), Bricolage Grotesque (`--font-brand`), Inter
  (`--font-body`), JetBrains Mono (`--font-mono`). Preserve OFL notices.

Use Lucide icons: typically 18 px in ribbon actions, 16 px in menus/notices and
13–14 px in status text. Do not add decorative emoji or Unicode glyphs.

The ribbon is rendered from data in TopBar through OverflowRibbon. It must fit
without horizontal scrolling: compact to icons, then move low-priority groups into
**Mais**. The 1280 px viewport is already close to its budget. Put occasional
shape-specific controls in the side panel rather than adding another ribbon button.

Numeric fields use NumberField with a readable value area and a separate unit
suffix; grid rows wrap into fewer columns as the panel narrows. Tests verify no
horizontal overflow at desktop/tablet/mobile widths. Use Dialog/Notice for prompts
and feedback, with descriptions and shortcuts in rich tooltips. Keep Portuguese
labels short and concrete; preserve accessible names and test IDs.

Earlier Sprint 07/18 layouts used different bar/control sizes; their plans remain
historical records rather than the current CSS specification.
