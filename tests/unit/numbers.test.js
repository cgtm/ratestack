import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock i18n before importing numbers — numberLocale() reads navigator.language
vi.mock("../../src/i18n.js", () => ({
  numberLocale: vi.fn(() => "en-US"),
  t: (key, params) => {
    if (key === "rate.display")
      return `1 ${params.from} = ${params.value} ${params.to}`;
    return key;
  },
}));

import {
  parseLocaleAmount,
  normalizeTypingAmount,
  formatNumber,
  getLocaleSeparators,
  resetNumberCache,
  computeConvertedAmounts,
  getRateDisplay,
} from "../../src/data/numbers.js";
import { numberLocale } from "../../src/i18n.js";

beforeEach(() => {
  resetNumberCache();
});

// ─── parseLocaleAmount ────────────────────────────────────────────────────────

describe("parseLocaleAmount", () => {
  describe("en-US locale (. decimal, , group)", () => {
    beforeEach(() => numberLocale.mockReturnValue("en-US"));

    it("passes through a plain integer", () => {
      expect(parseLocaleAmount("1234")).toBe("1234");
    });

    it("strips grouping commas", () => {
      expect(parseLocaleAmount("1,234,567")).toBe("1234567");
    });

    it("keeps decimal dot", () => {
      expect(parseLocaleAmount("1234.56")).toBe("1234.56");
    });

    it("handles grouped decimal: 1,234.56", () => {
      expect(parseLocaleAmount("1,234.56")).toBe("1234.56");
    });

    it("returns empty string for null/empty", () => {
      expect(parseLocaleAmount(null)).toBe("");
      expect(parseLocaleAmount("")).toBe("");
    });

    it("strips non-numeric characters", () => {
      expect(parseLocaleAmount("$1,234.56")).toBe("1234.56");
    });

    it("strips NBSP and spaces", () => {
      expect(parseLocaleAmount("1\u00a0234.56")).toBe("1234.56");
    });

    it("collapses multiple dots", () => {
      expect(parseLocaleAmount("1.2.3")).toBe("1.23");
    });
  });

  describe("es-ES locale (, decimal, . group)", () => {
    beforeEach(() => numberLocale.mockReturnValue("es-ES"));

    it("converts comma decimal to dot: 1234,56 → 1234.56", () => {
      expect(parseLocaleAmount("1234,56")).toBe("1234.56");
    });

    it("handles grouped decimal: 1.234,56 → 1234.56", () => {
      expect(parseLocaleAmount("1.234,56")).toBe("1234.56");
    });

    it("strips grouping dots when no comma present", () => {
      expect(parseLocaleAmount("1.234.567")).toBe("1234567");
    });
  });

  describe("hi-IN locale (group separator is comma-like, decimal is dot)", () => {
    beforeEach(() => numberLocale.mockReturnValue("hi-IN"));

    it("handles plain decimal", () => {
      expect(parseLocaleAmount("1234.56")).toBe("1234.56");
    });
  });

  describe("mixed separator edge cases", () => {
    beforeEach(() => numberLocale.mockReturnValue("en-US"));

    it("rightmost separator wins as decimal: 1.234,56 (comma last = decimal)", () => {
      numberLocale.mockReturnValue("es-ES");
      expect(parseLocaleAmount("1.234,56")).toBe("1234.56");
    });

    it("rightmost separator wins as decimal: 1,234.56 (dot last = decimal)", () => {
      expect(parseLocaleAmount("1,234.56")).toBe("1234.56");
    });
  });
});

// ─── normalizeTypingAmount ────────────────────────────────────────────────────

describe("normalizeTypingAmount", () => {
  beforeEach(() => numberLocale.mockReturnValue("en-US"));

  it("allows digits and dot", () => {
    expect(normalizeTypingAmount("123.45")).toBe("123.45");
  });

  it("strips non-numeric non-separator characters", () => {
    expect(normalizeTypingAmount("1a2b3")).toBe("123");
  });

  it("collapses multiple dots to first", () => {
    expect(normalizeTypingAmount("1.2.3")).toBe("1.23");
  });

  it("strips commas in en-US locale", () => {
    expect(normalizeTypingAmount("1,234")).toBe("1234");
  });

  it("converts comma decimal in es-ES locale", () => {
    numberLocale.mockReturnValue("es-ES");
    expect(normalizeTypingAmount("1234,56")).toBe("1234.56");
  });

  it("handles mixed separators: takes rightmost as decimal", () => {
    expect(normalizeTypingAmount("1,234.56")).toBe("1234.56");
  });

  it("handles empty string", () => {
    expect(normalizeTypingAmount("")).toBe("");
  });

  it("allows a trailing dot while typing", () => {
    expect(normalizeTypingAmount("123.")).toBe("123.");
  });
});

// ─── formatNumber ─────────────────────────────────────────────────────────────

describe("formatNumber", () => {
  beforeEach(() => numberLocale.mockReturnValue("en-US"));

  it("formats USD with 2 decimal places", () => {
    expect(formatNumber(1234.5, "USD")).toBe("1,234.50");
  });

  it("formats KRW (zero-decimal) with no decimals", () => {
    expect(formatNumber(1234567, "KRW")).toBe("1,234,567");
  });

  it("formats JPY (zero-decimal) with no decimals", () => {
    expect(formatNumber(150.9, "JPY")).toBe("151");
  });

  it("formats CLP (zero-decimal) with no decimals", () => {
    expect(formatNumber(1000, "CLP")).toBe("1,000");
  });

  it("rounds correctly", () => {
    expect(formatNumber(1.005, "EUR")).toBe("1.01");
  });
});

// ─── getLocaleSeparators ──────────────────────────────────────────────────────

describe("getLocaleSeparators", () => {
  it("returns . decimal and , group for en-US", () => {
    numberLocale.mockReturnValue("en-US");
    resetNumberCache();
    const { group, decimal } = getLocaleSeparators();
    expect(decimal).toBe(".");
    expect(group).toBe(",");
  });

  it("returns , decimal and . group for es-ES", () => {
    numberLocale.mockReturnValue("es-ES");
    resetNumberCache();
    const { group, decimal } = getLocaleSeparators();
    expect(decimal).toBe(",");
    expect(group).toBe(".");
  });
});

// ─── computeConvertedAmounts ──────────────────────────────────────────────────

describe("computeConvertedAmounts", () => {
  const rates = { USD: { EUR: 0.92, GBP: 0.79 } };

  it("converts correctly", () => {
    const result = computeConvertedAmounts(
      "100",
      "USD",
      ["USD", "EUR", "GBP"],
      rates,
    );
    expect(result.EUR).toBeCloseTo(92);
    expect(result.GBP).toBeCloseTo(79);
  });

  it("skips the base currency", () => {
    const result = computeConvertedAmounts("100", "USD", ["USD", "EUR"], rates);
    expect(result.USD).toBeUndefined();
  });

  it("returns null for empty base amount", () => {
    expect(
      computeConvertedAmounts("", "USD", ["USD", "EUR"], rates),
    ).toBeNull();
  });

  it("returns null for non-numeric base amount", () => {
    expect(
      computeConvertedAmounts("abc", "USD", ["USD", "EUR"], rates),
    ).toBeNull();
  });

  it("returns empty object when base rates are missing", () => {
    const result = computeConvertedAmounts("100", "GBP", ["GBP", "EUR"], rates);
    expect(result).toEqual({});
  });

  it("omits codes missing from rates", () => {
    const result = computeConvertedAmounts(
      "100",
      "USD",
      ["USD", "EUR", "JPY"],
      rates,
    );
    expect(result.EUR).toBeCloseTo(92);
    expect(result.JPY).toBeUndefined();
  });
});

// ─── getRateDisplay ───────────────────────────────────────────────────────────

describe("getRateDisplay", () => {
  beforeEach(() => numberLocale.mockReturnValue("en-US"));

  const rates = { USD: { EUR: 0.92 } };

  it("returns formatted rate string", () => {
    expect(getRateDisplay("USD", "EUR", rates)).toBe("1 USD = 0.92 EUR");
  });

  it("returns empty string when rate is missing", () => {
    expect(getRateDisplay("USD", "JPY", rates)).toBe("");
  });

  it("returns empty string when base not in rates", () => {
    expect(getRateDisplay("GBP", "EUR", rates)).toBe("");
  });
});
