# Limitations

- This is browser CAD/CAM for routers, not a certified machine-control or safety
  system. No physical machine, serial port, spindle, fixture or emergency stop was
  tested during maintenance. Generated programs were tested as text and simulation.
- Controller dialects and firmware vary. GRBL, Marlin and LinuxCNC/Mach3 output
  must be checked for the actual controller, origin, units, tool changes and travel.
  Feed/material presets are starting points, not guarantees for a tool or machine.
- Toolpath preview and heightmap removal approximate machining. They do not model
  full machine kinematics, cutter deflection, workholding, thermal effects, chip
  evacuation or every possible collision.
- Structural analysis is indicative, with simplified material, load, mesh and
  boundary assumptions. Touching parts may be treated as glued. Analytical test
  cases do not certify an assembled structure, joint strength or safe working load.
- Browser resources bound image/vector import, nesting, toolpath generation and
  FEA size. GPU/browser differences affect rendering; automated mobile/tablet
  coverage uses Chromium emulation, not physical mobile hardware or Safari.
- Imported SVG/DXF features can be approximated or unsupported. Confirm units,
  layers, inferred holes, curves and dimensions in the preview before accepting.
- Clearing site data removes local projects/preferences/fonts. Save JSON backups.
  User fonts do not accompany project JSON/share links; explode text for portability.
- PWA offline access requires a successful initial load/cache. Analytics, feedback
  and external links need a network connection. Service-worker updates may require
  reload. Vite/preview does not run the optional feedback API.
- Feedback is intentionally unauthenticated. Origin checks/honeypot and a per-instance
  rate limiter reduce accidental abuse, not distributed attacks; direct requests
  can omit Origin. IP headers must be supplied/sanitized by trusted hosting. The
  in-memory IP map is not a durable/shared quota and can grow with distinct IPs.
- Feedback project/diagnostics attachments are untrusted JSON within a 1 MiB total
  byte budget. They are not executable project validation or authenticated evidence.
  Retention and deletion are operator tasks; no scheduled cleanup is implemented.
- Dependency audit has four low-severity development-tree alerts from deepmerge.
  These are maintenance findings, not publication blockers. The completed
  [publication review](security-review.md) records its scope and evidence limits;
  scanner silence cannot prove absence of sensitive data.
