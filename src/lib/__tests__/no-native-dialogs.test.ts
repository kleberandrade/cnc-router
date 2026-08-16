import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

function walk(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) { if (!p.includes("__tests__")) walk(p, out); }
    else if (/\.(ts|tsx)$/.test(f)) out.push(p);
  }
  return out;
}

describe("regra: nenhum diálogo nativo do navegador", () => {
  it("src/ não usa window.alert / window.confirm / window.prompt (use Dialog/confirmDialog/promptDialog)", () => {
    const offenders = walk(join(process.cwd(), "src")).filter((p) => !p.endsWith("Dialog.tsx") && !p.endsWith("Notice.tsx")).filter((p) => /(?<![.\w])(window\.)?(alert|confirm|prompt)\(/.test(readFileSync(p, "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "")));
    expect(offenders).toEqual([]);
  });
});
