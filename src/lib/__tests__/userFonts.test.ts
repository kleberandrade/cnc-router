import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import { readFileSync } from "node:fs";
import {
  addUserFont, loadUserFonts, removeUserFont, missingFonts,
  userFontId, userFontLabel, isUserFont, fontDisplayName, USER_FONT_PREFIX,
} from "../userFonts";
import { FONTS, isFontLoaded, _resetFonts } from "../text";
import type { Shape, TextShape } from "../../types";

const fontBytes = (): ArrayBuffer => {
  const buf = readFileSync("public/fonts/Inter-Regular.ttf");
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
};

const textShape = (fontId: string): TextShape => ({
  id: "t", kind: "text", x: 0, y: 0, text: "Oi", fontId, size: 10,
  rotation: 0, align: "left", letterSpacing: 0, depth: 2, operation: "outline",
});

beforeEach(async () => {
  _resetFonts();
  // FONTS is module-level: drop leftovers from a previous test so the list stays predictable
  for (const f of [...FONTS]) if (isUserFont(f.id)) await removeUserFont(f.id);
});

describe("userFonts — nomes", () => {
  it("deriva id e rótulo do nome do arquivo", () => {
    expect(userFontId("Bebas_Neue-Regular.ttf")).toBe(`${USER_FONT_PREFIX}bebas_neue-regular`);
    expect(userFontLabel("Bebas_Neue-Regular.ttf")).toBe("Bebas Neue Regular");
    expect(userFontLabel("Roboto.OTF")).toBe("Roboto");
  });

  it("distingue fonte do usuário das embutidas", () => {
    expect(isUserFont(`${USER_FONT_PREFIX}x`)).toBe(true);
    expect(isUserFont("inter")).toBe(false);
    expect(fontDisplayName("inter")).toBe("Inter");
    expect(fontDisplayName(`${USER_FONT_PREFIX}bebas`)).toBe("Bebas");
  });
});

describe("userFonts — IndexedDB", () => {
  it("carrega, guarda e traz de volta na visita seguinte", async () => {
    const { id, label } = await addUserFont("Minha Fonte.ttf", fontBytes());
    expect(label).toBe("Minha Fonte");
    expect(isFontLoaded(id)).toBe(true);
    expect(FONTS.some((f) => f.id === id)).toBe(true);

    // recarregar a página: o cache de fontes some, o IndexedDB não
    _resetFonts();
    expect(isFontLoaded(id)).toBe(false);
    const loaded = await loadUserFonts();
    expect(loaded).toContain(id);
    expect(isFontLoaded(id)).toBe(true);
  });

  it("arquivo que não é fonte não entra nem fica guardado", async () => {
    const lixo = new TextEncoder().encode("isso não é uma fonte").buffer;
    await expect(addUserFont("lixo.ttf", lixo)).rejects.toBeTruthy();
    _resetFonts();
    expect(await loadUserFonts()).not.toContain(userFontId("lixo.ttf"));
  });

  it("remover tira da lista e do banco", async () => {
    const { id } = await addUserFont("Some.ttf", fontBytes());
    await removeUserFont(id);
    expect(FONTS.some((f) => f.id === id)).toBe(false);
    _resetFonts();
    expect(await loadUserFonts()).not.toContain(id);
  });
});

describe("missingFonts", () => {
  it("lista só as fontes de texto que não estão registradas", async () => {
    const { id } = await addUserFont("Presente.ttf", fontBytes());
    const shapes: Shape[] = [
      textShape(id),
      textShape(`${USER_FONT_PREFIX}sumida`),
      textShape(`${USER_FONT_PREFIX}sumida`),
      { id: "c", kind: "circle", x: 0, y: 0, radius: 5, depth: 1, operation: "outline" },
    ];
    expect(missingFonts(shapes)).toEqual([`${USER_FONT_PREFIX}sumida`]);
  });

  it("projeto sem texto não acusa nada", () => {
    expect(missingFonts([{ id: "c", kind: "circle", x: 0, y: 0, radius: 5, depth: 1, operation: "outline" }])).toEqual([]);
  });
});

describe("userFonts — sem IndexedDB", () => {
  it("tudo degrada sem quebrar quando indexedDB não existe", async () => {
    const original = globalThis.indexedDB;
    // @ts-expect-error simula navegador sem IndexedDB (modo privado antigo)
    delete globalThis.indexedDB;
    try {
      const { id } = await addUserFont("Sem Banco.ttf", fontBytes());
      expect(isFontLoaded(id)).toBe(true);      // funciona na sessão
      expect(await loadUserFonts()).toEqual([]); // só não volta na próxima
      await removeUserFont(id);                  // e remover não explode
      expect(FONTS.some((f) => f.id === id)).toBe(false);
    } finally {
      globalThis.indexedDB = original;
    }
  });
});
