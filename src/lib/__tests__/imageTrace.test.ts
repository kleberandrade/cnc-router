import { describe, it, expect } from "vitest";
import { traceImage, otsuThreshold, simplify, maskContours, regionsToMm, area, type GrayImage } from "../imageTrace";

const make = (w: number, h: number, f: (x: number, y: number) => boolean): GrayImage => {
  const data = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) data[y * w + x] = f(x, y) ? 0 : 255;
  return { w, h, data };
};

describe("imageTrace", () => {
  it("disco com furo → 1 região com 1 furo, áreas ≈ π r²", () => {
    const img = make(120, 120, (x, y) => { const d = Math.hypot(x - 60, y - 60); return d < 50 && d > 20; });
    const { regions, threshold } = traceImage(img, { tolerance: 0.6 });
    expect(threshold).toBeGreaterThan(0);
    expect(regions).toHaveLength(1);
    expect(regions[0].holes).toHaveLength(1);
    expect(Math.abs(area(regions[0].outer))).toBeGreaterThan(Math.PI * 50 * 50 * 0.95);
    expect(Math.abs(area(regions[0].outer))).toBeLessThan(Math.PI * 50 * 50 * 1.05);
    expect(Math.abs(area(regions[0].holes[0]))).toBeGreaterThan(Math.PI * 20 * 20 * 0.9);
    // simplified: far fewer points than the pixel boundary
    expect(regions[0].outer.length).toBeLessThan(200);
  });
  it("dois quadrados separados → 2 regiões; ruído menor que minArea some; inverter troca figura/fundo", () => {
    const img = make(60, 40, (x, y) => (x > 5 && x < 25 && y > 5 && y < 35) || (x > 35 && x < 55 && y > 5 && y < 35) || (x === 30 && y === 20));
    const { regions } = traceImage(img, { threshold: 128, minArea: 4, tolerance: 0.5 });
    expect(regions).toHaveLength(2);
    const inv = traceImage(img, { threshold: 128, invert: true, minArea: 4 });
    expect(inv.regions).toHaveLength(1);
    expect(inv.regions[0].holes.length).toBe(2);
  });
  it("Otsu separa um bimodal; simplify mantém extremos; contornos de 1 pixel", () => {
    const img: GrayImage = { w: 4, h: 1, data: new Uint8Array([10, 20, 230, 240]) };
    const t = otsuThreshold(img);
    expect(t).toBeGreaterThan(20); expect(t).toBeLessThan(230);
    const sq = simplify([[0, 0], [5, 0.1], [10, 0], [10, 10], [0, 10]], 0.5);
    expect(sq.length).toBe(4);
    const loops = maskContours(new Uint8Array([1]), 1, 1);
    expect(loops).toHaveLength(1);
    expect(loops[0].length).toBe(4);
  });
  it("regionsToMm escala e inverte Y", () => {
    const r = regionsToMm([{ outer: [[0, 0], [100, 0], [100, 50]], holes: [] }], { w: 100, h: 50 }, 200, 10, 20);
    expect(r[0].outer[0]).toEqual([10, 120]);
    expect(r[0].outer[1]).toEqual([210, 120]);
    expect(r[0].outer[2]).toEqual([210, 20]);
  });
});
