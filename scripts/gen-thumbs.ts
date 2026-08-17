// Pre-generates the example thumbnails so the gallery opens without building every example on the click (Sprint 27).
// Run: npx tsx scripts/gen-thumbs.ts   (also runs in `prebuild`)
import { readFileSync, writeFileSync } from "node:fs";
import { JSDOM } from "jsdom";
// SVG examples parse with DOMParser (browser API) — jsdom provides it in Node.
(globalThis as unknown as { DOMParser: unknown }).DOMParser = new JSDOM("").window.DOMParser;
import { EXAMPLES } from "../src/content/examples";
import { registerFont } from "../src/lib/text";
import { projectThumbnail } from "../src/lib/thumbnail";
import { thumbsHash } from "../src/lib/thumbs";

for (const f of ["Regular", "Bold"]) {
  const buf = readFileSync(`public/fonts/Inter-${f}.ttf`);
  registerFont(f === "Bold" ? "inter-bold" : "inter", buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
}
globalThis.fetch = (async (url: string) => new Response(readFileSync(`public${url}`))) as typeof fetch;

const out: Record<string, { hash: string; paths: { d: string; fill: boolean }[] }> = {};
for (const ex of EXAMPLES) {
  const p = await ex.build();
  const t = projectThumbnail(p.shapes, 120, 60);
  out[ex.id] = { hash: thumbsHash(p.shapes), paths: t.paths.map((x) => ({ d: x.d.replace(/(\.\d{2})\d+/g, "$1"), fill: x.fill })) };
}
writeFileSync("public/examples/thumbs.json", JSON.stringify(out));
console.log(`thumbs.json: ${Object.keys(out).length} exemplos`);
