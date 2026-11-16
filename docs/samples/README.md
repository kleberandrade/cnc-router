# G-code reference samples

These text programs exercise the CAM engine for regression review and external
simulation. They are not validated machine jobs and must not be sent to hardware
as part of testing.

- `baseline-v0.gcode`: initial rectangle/circle/triangle baseline, retained historically.
- `baseline-v1.gcode`: the same shapes with multi-pass toolpath ordering and zigzag pockets.
- `sprint06-compensacao-tabs-rampa.gcode`: compensated outline, inside hole, pocket,
  holding tabs and ramp entry with a 6 mm cutter.
- `sprint14-{grbl,marlin}.gcode`, `sprint14-linuxcnc.ngc` and
  `sprint14-linuxcnc-inch.ngc`: helical pocket entry, peck drilling, tool-change
  pauses and controller endings; the inch program uses G20 and scaled coordinates.
- `sprint25-contorno-relevo.gcode`: contour-parallel pocket around an island and a
  varying-Z 2.5D relief with a ball-nose tool.

Run from the repository root:

```bash
node --import tsx docs/samples/generate-samples.ts
node --import tsx docs/samples/generate-baseline.ts > /tmp/baseline.gcode
```

The first command rewrites tracked samples; inspect the diff before committing.
The second prints one baseline without changing tracked files. Build-time version
constants fall back to test/dev values outside Vite. Old examples explicitly use
`pocketStrategy: "zigzag"`; new projects default to contour-parallel pocketing.
Review headers, units, safe-height retractions, pass depths, tabs and controller
syntax. No physical machining result is implied.

For a minimal new reference that only prints G-code, run `npm run --silent example`.
