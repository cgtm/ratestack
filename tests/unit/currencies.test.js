import { describe, it, expect } from "vitest";
import { CURRENCY_REGIONS, CURRENCIES } from "../../src/currencies.js";

// ─── CURRENCIES ───────────────────────────────────────────────────────────────

describe("CURRENCIES", () => {
  it("contains entries for every code listed in CURRENCY_REGIONS", () => {
    for (const { codes } of CURRENCY_REGIONS) {
      for (const code of codes) {
        expect(CURRENCIES).toHaveProperty(code);
      }
    }
  });

  it("each entry has flag, name, and symbol", () => {
    for (const [code, entry] of Object.entries(CURRENCIES)) {
      expect(entry, `${code} missing flag`).toHaveProperty("flag");
      expect(entry, `${code} missing name`).toHaveProperty("name");
      expect(entry, `${code} missing symbol`).toHaveProperty("symbol");
    }
  });

  it("no code appears in CURRENCY_REGIONS more than once", () => {
    const seen = new Set();
    for (const { codes } of CURRENCY_REGIONS) {
      for (const code of codes) {
        expect(seen.has(code), `${code} appears more than once`).toBe(false);
        seen.add(code);
      }
    }
  });
});

// ─── CURRENCY_REGIONS ────────────────────────────────────────────────────────

describe("CURRENCY_REGIONS", () => {
  it("is a non-empty array", () => {
    expect(Array.isArray(CURRENCY_REGIONS)).toBe(true);
    expect(CURRENCY_REGIONS.length).toBeGreaterThan(0);
  });

  it("each region has a string name and non-empty codes array", () => {
    for (const { region, codes } of CURRENCY_REGIONS) {
      expect(typeof region).toBe("string");
      expect(Array.isArray(codes)).toBe(true);
      expect(codes.length).toBeGreaterThan(0);
    }
  });

  it("Popular region exists and contains USD", () => {
    const popular = CURRENCY_REGIONS.find((r) => r.region === "Popular");
    expect(popular).toBeDefined();
    expect(popular.codes).toContain("USD");
  });
});
