/**
 * Miniaturas da landing (Sprint 32): SVGs prontos dos exemplos em destaque, gerados no build
 * (mesmo pipeline do gen-thumbs). A landing é HTML estático — ela só referencia os arquivos.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { JSDOM } from "jsdom";

const dom = new JSDOM("");
(globalThis as Record<string, unknown>).DOMParser = dom.window.DOMParser;

const { EXAMPLES } = await import("../src/content/examples");
const { projectThumbnail } = await import("../src/lib/thumbnail");

/** Os seis que melhor contam a história na landing (recorte, encaixe, texto, imagem, relevo). */
const FEATURED = ["tabua-carnes", "caixa-dedos", "suporte-celular", "numero-casa", "engrenagens", "pratinho-relevo"];

mkdirSync("public/landing", { recursive: true });
for (const id of FEATURED) {
  const ex = EXAMPLES.find((e) => e.id === id);
  if (!ex) throw new Error(`exemplo em destaque sumiu: ${id}`);
  const { shapes } = await ex.build();
  const t = projectThumbnail(shapes, 192, 128, 8);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${t.viewBox}" role="img" aria-label="${ex.title}">` +
    `<style>path{fill:none;stroke:#2b4a57;stroke-width:1.2}.f{fill:#cfe3ec;fill-opacity:.6;stroke:#2b4a57;stroke-width:.8}</style>` +
    t.paths.map((p) => `<path${p.fill ? ' class="f"' : ""} d="${p.d}" fill-rule="evenodd"/>`).join("") +
    `</svg>`;
  writeFileSync(`public/landing/thumb-${id}.svg`, svg);
}
console.log(`landing: ${FEATURED.length} miniaturas`);
