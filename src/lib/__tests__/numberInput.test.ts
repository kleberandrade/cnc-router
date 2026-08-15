import { describe, it, expect } from "vitest";
import { parseNumberInput } from "../numberInput";

describe("parseNumberInput", () => {
  it("parses a plain number", () => {
    expect(parseNumberInput("12.5", 1)).toBe(12.5);
  });
  it("accepts comma as decimal separator", () => {
    expect(parseNumberInput("2,5", 1)).toBe(2.5);
  });
  it("returns fallback for empty string", () => {
    expect(parseNumberInput("", 7)).toBe(7);
    expect(parseNumberInput("   ", 7)).toBe(7);
  });
  it("returns fallback for NaN / Infinity", () => {
    expect(parseNumberInput("abc", 7)).toBe(7);
    expect(parseNumberInput("Infinity", 7)).toBe(7);
  });
  it("enforces min and max", () => {
    expect(parseNumberInput("0", 3, { min: 0.1 })).toBe(3);
    expect(parseNumberInput("-5", 3, { min: 0 })).toBe(3);
    expect(parseNumberInput("500", 3, { max: 100 })).toBe(3);
    expect(parseNumberInput("50", 3, { min: 0, max: 100 })).toBe(50);
  });
});
