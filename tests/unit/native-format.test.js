import { describe, it, expect } from "vitest";
import {
  hasNativeFormat,
  formatNative,
  hasCurrencyUnit,
  NATIVE_FORMAT_CURRENCIES,
} from "../../src/data/native-format.js";

// ─── NATIVE_FORMAT_CURRENCIES ────────────────────────────────────────────────

describe("NATIVE_FORMAT_CURRENCIES", () => {
  it("includes CJK currencies", () => {
    for (const code of ["JPY", "KRW", "CNY", "HKD", "TWD", "MOP"]) {
      expect(NATIVE_FORMAT_CURRENCIES.has(code)).toBe(true);
    }
  });

  it("includes South Asian currencies", () => {
    for (const code of ["INR", "PKR", "BDT", "LKR", "NPR"]) {
      expect(NATIVE_FORMAT_CURRENCIES.has(code)).toBe(true);
    }
  });

  it("excludes Western currencies", () => {
    for (const code of ["USD", "EUR", "GBP", "AUD", "CHF"]) {
      expect(NATIVE_FORMAT_CURRENCIES.has(code)).toBe(false);
    }
  });
});

// ─── hasNativeFormat ─────────────────────────────────────────────────────────

describe("hasNativeFormat", () => {
  it("returns false for non-native currencies regardless of value", () => {
    expect(hasNativeFormat("USD", 1_000_000)).toBe(false);
    expect(hasNativeFormat("EUR", 50_000)).toBe(false);
    expect(hasNativeFormat("GBP", 999_999)).toBe(false);
  });

  it("returns false for CJK below threshold (< 10,000)", () => {
    expect(hasNativeFormat("KRW", 9_999)).toBe(false);
    expect(hasNativeFormat("JPY", 0)).toBe(false);
    expect(hasNativeFormat("CNY", 1_000)).toBe(false);
  });

  it("returns true for CJK at threshold (10,000)", () => {
    expect(hasNativeFormat("KRW", 10_000)).toBe(true);
    expect(hasNativeFormat("JPY", 10_000)).toBe(true);
  });

  it("returns true for CJK above threshold", () => {
    expect(hasNativeFormat("KRW", 1_234_567)).toBe(true);
    expect(hasNativeFormat("CNY", 100_000_000)).toBe(true);
    expect(hasNativeFormat("TWD", 50_000)).toBe(true);
  });

  it("returns false for lakh currencies below threshold (< 100,000)", () => {
    expect(hasNativeFormat("INR", 99_999)).toBe(false);
    expect(hasNativeFormat("PKR", 0)).toBe(false);
    expect(hasNativeFormat("INR", 12_345)).toBe(false);
  });

  it("returns true for lakh currencies at threshold (100,000)", () => {
    expect(hasNativeFormat("INR", 100_000)).toBe(true);
    expect(hasNativeFormat("NPR", 100_000)).toBe(true);
  });

  it("returns true for lakh currencies above threshold", () => {
    expect(hasNativeFormat("INR", 1_234_567)).toBe(true);
    expect(hasNativeFormat("BDT", 10_000_000)).toBe(true);
  });

  it("uses absolute value for negative numbers", () => {
    expect(hasNativeFormat("KRW", -10_000)).toBe(true);
    expect(hasNativeFormat("INR", -100_000)).toBe(true);
  });
});

// ─── formatNative — KRW (만/억/조) ───────────────────────────────────────────

describe("formatNative — KRW", () => {
  it("formats 0", () => {
    expect(formatNative(0, "KRW")).toBe("0");
  });

  it("formats exactly 1만 (10,000)", () => {
    expect(formatNative(10_000, "KRW")).toBe("1만원");
  });

  it("formats 만 with remainder", () => {
    expect(formatNative(12_345, "KRW")).toBe("1만 2,345원");
  });

  it("formats large 만 values", () => {
    expect(formatNative(1_234_567, "KRW")).toBe("123만 4,567원");
  });

  it("formats exactly 1억 (100,000,000)", () => {
    expect(formatNative(100_000_000, "KRW")).toBe("1억원");
  });

  it("formats 억 + 만 + remainder", () => {
    expect(formatNative(123_456_789, "KRW")).toBe("1억 2,345만 6,789원");
  });

  it("formats exactly 1조 (1,000,000,000,000)", () => {
    expect(formatNative(1_000_000_000_000, "KRW")).toBe("1조원");
  });

  it("formats 조 + 억", () => {
    expect(formatNative(1_500_000_000_000, "KRW")).toBe("1조 5,000억원");
  });

  it("omits zero intermediate units", () => {
    expect(formatNative(100_000_500, "KRW")).toBe("1억 500원");
  });

  it("handles negative values", () => {
    expect(formatNative(-12_345, "KRW")).toBe("-1만 2,345원");
  });
});

// ─── formatNative — JPY (万/億/兆) ───────────────────────────────────────────

describe("formatNative — JPY", () => {
  it("formats 万 with remainder", () => {
    expect(formatNative(12_345, "JPY")).toBe("1万 2,345円");
  });

  it("formats exactly 1億", () => {
    expect(formatNative(100_000_000, "JPY")).toBe("1億円");
  });

  it("formats 兆", () => {
    expect(formatNative(1_000_000_000_000, "JPY")).toBe("1兆円");
  });
});

// ─── formatNative — CNY (万/亿/兆) ───────────────────────────────────────────

describe("formatNative — CNY", () => {
  it("uses simplified Chinese units (亿 not 億)", () => {
    expect(formatNative(100_000_000, "CNY")).toBe("1亿元");
  });
});

// ─── formatNative — South Asian lakh (INR) ───────────────────────────────────

describe("formatNative — INR (lakh)", () => {
  it("formats 1 lakh (100,000)", () => {
    expect(formatNative(100_000, "INR")).toBe("1,00,000.00");
  });

  it("formats 12,34,567", () => {
    expect(formatNative(1_234_567, "INR")).toBe("12,34,567.00");
  });

  it("formats 1 crore (10,000,000)", () => {
    expect(formatNative(10_000_000, "INR")).toBe("1,00,00,000.00");
  });

  it("preserves 2 decimal places", () => {
    expect(formatNative(100_000.5, "INR")).toBe("1,00,000.50");
  });

  it("applies to other lakh currencies (PKR)", () => {
    expect(formatNative(1_234_567, "PKR")).toBe("12,34,567.00");
  });
});

// ─── hasCurrencyUnit ──────────────────────────────────────────────────────────

describe("hasCurrencyUnit", () => {
  it("returns true for all CJK currencies", () => {
    for (const code of ["KRW", "JPY", "CNY", "HKD", "TWD", "MOP"]) {
      expect(hasCurrencyUnit(code)).toBe(true);
    }
  });

  it("returns false for lakh currencies", () => {
    for (const code of ["INR", "PKR", "BDT", "LKR", "NPR"]) {
      expect(hasCurrencyUnit(code)).toBe(false);
    }
  });

  it("returns false for Western currencies", () => {
    for (const code of ["USD", "EUR", "GBP"]) {
      expect(hasCurrencyUnit(code)).toBe(false);
    }
  });
});
