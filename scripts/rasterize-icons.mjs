/** One-off: `npm install --no-save @resvg/resvg-js && node scripts/rasterize-icons.mjs` */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function render(svgPath, pngPath, width) {
  const svg = readFileSync(svgPath);
  const png = new Resvg(svg, { fitTo: { mode: "width", value: width } }).render().asPng();
  writeFileSync(pngPath, png);
  console.log(`${pngPath} (${width}px)`);
}

render(join(root, "public/icons/icon.svg"), join(root, "public/icons/icon-192.png"), 192);
render(join(root, "public/icons/icon.svg"), join(root, "public/icons/icon-512.png"), 512);
render(join(root, "public/icons/icon-maskable.svg"), join(root, "public/icons/icon-512-maskable.png"), 512);
render(join(root, "public/icons/icon.svg"), join(root, "public/icons/apple-touch-icon.png"), 180);
render(join(root, "public/og-image.svg"), join(root, "public/og-image.png"), 1200);
