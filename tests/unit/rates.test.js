import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  fetchRatesFromApi,
  hasCompleteRates,
  usesFrankfurter,
} from "../../src/data/rates.js";

// ─── hasCompleteRates ─────────────────────────────────────────────────────────

describe("hasCompleteRates", () => {
  const rates = { USD: { EUR: 0.92, GBP: 0.79 } };

  it("returns true when all selected codes are covered", () => {
    expect(hasCompleteRates("USD", ["USD", "EUR", "GBP"], rates)).toBe(true);
  });

  it("returns true for a single selected code (base only)", () => {
    expect(hasCompleteRates("USD", ["USD"], rates)).toBe(true);
  });

  it("returns false when a code is missing from rates", () => {
    expect(hasCompleteRates("USD", ["USD", "EUR", "JPY"], rates)).toBe(false);
  });

  it("returns false when base is not in rates", () => {
    expect(hasCompleteRates("GBP", ["GBP", "EUR"], rates)).toBe(false);
  });

  it("returns false for empty base", () => {
    expect(hasCompleteRates("", ["USD", "EUR"], rates)).toBe(false);
  });

  it("returns false for null base", () => {
    expect(hasCompleteRates(null, ["USD", "EUR"], rates)).toBe(false);
  });

  it("returns false when rates object is empty", () => {
    expect(hasCompleteRates("USD", ["USD", "EUR"], {})).toBe(false);
  });
});

// ─── usesFrankfurter ──────────────────────────────────────────────────────────

describe("usesFrankfurter", () => {
  it("returns true when base and all selected are in Frankfurter set", () => {
    expect(usesFrankfurter("USD", ["USD", "EUR", "GBP"])).toBe(true);
  });

  it("returns true for a single Frankfurter currency", () => {
    expect(usesFrankfurter("JPY", ["JPY", "KRW"])).toBe(true);
  });

  it("returns false when base is not in Frankfurter set", () => {
    expect(usesFrankfurter("AED", ["AED", "USD"])).toBe(false);
  });

  it("returns false when a selected code is not in Frankfurter set", () => {
    expect(usesFrankfurter("USD", ["USD", "EUR", "AED"])).toBe(false);
  });

  it("returns false when base is exotic even if selected are covered", () => {
    expect(usesFrankfurter("NGN", ["USD", "EUR"])).toBe(false);
  });
});

// ─── fetchRatesFromApi ────────────────────────────────────────────────────────

describe("fetchRatesFromApi", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function mockFrankfurterSuccess(rates) {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ base: "USD", date: "2026-01-01", rates }),
    });
  }

  function mockErApiSuccess(rates) {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ result: "success", rates }),
    });
  }

  function mockFetchHttpError(status) {
    fetch.mockResolvedValue({ ok: false, status });
  }

  // ── API routing ───────────────────────────────────────────────────────────

  it("calls Frankfurter when all currencies are in its set", async () => {
    mockFrankfurterSuccess({ EUR: 0.92, GBP: 0.79 });
    await fetchRatesFromApi("USD", ["USD", "EUR", "GBP"]);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("frankfurter.app"),
    );
  });

  it("builds correct Frankfurter URL with from and symbols params", async () => {
    mockFrankfurterSuccess({ EUR: 0.92, GBP: 0.79 });
    await fetchRatesFromApi("USD", ["USD", "EUR", "GBP"]);
    const url = fetch.mock.calls[0][0];
    expect(url).toContain("from=USD");
    expect(url).toContain("EUR");
    expect(url).toContain("GBP");
    // base should not appear in symbols
    expect(url.split("symbols=")[1]).not.toMatch(/\bUSD\b/);
  });

  it("calls er-api when base is not in Frankfurter set", async () => {
    mockErApiSuccess({ USD: 1, EUR: 0.92 });
    await fetchRatesFromApi("AED", ["AED", "USD", "EUR"]);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("open.er-api.com"),
    );
  });

  it("calls er-api when a selected currency is not in Frankfurter set", async () => {
    mockErApiSuccess({ EUR: 0.92, NGN: 1620 });
    await fetchRatesFromApi("USD", ["USD", "EUR", "NGN"]);
    expect(fetch).toHaveBeenCalledWith("https://open.er-api.com/v6/latest/USD");
  });

  // ── response parsing ──────────────────────────────────────────────────────

  it("returns rates from Frankfurter response", async () => {
    mockFrankfurterSuccess({ EUR: 0.92, GBP: 0.79 });
    const result = await fetchRatesFromApi("USD", ["USD", "EUR", "GBP"]);
    expect(result).toEqual({ EUR: 0.92, GBP: 0.79 });
  });

  it("returns relevant rates from er-api response", async () => {
    mockErApiSuccess({ EUR: 0.92, GBP: 0.79, AED: 3.67 });
    const result = await fetchRatesFromApi("USD", ["USD", "EUR", "NGN"]);
    expect(result.EUR).toBe(0.92);
    expect(result.NGN).toBeUndefined(); // not in mock response
  });

  it("excludes the base currency from er-api results", async () => {
    mockErApiSuccess({ USD: 1, EUR: 0.92 });
    const result = await fetchRatesFromApi("USD", ["USD", "EUR", "NGN"]);
    expect(result.USD).toBeUndefined();
    expect(result.EUR).toBe(0.92);
  });

  // ── error handling ────────────────────────────────────────────────────────

  it("throws on HTTP error from Frankfurter", async () => {
    mockFetchHttpError(429);
    await expect(fetchRatesFromApi("USD", ["USD", "EUR"])).rejects.toThrow(
      "HTTP 429",
    );
  });

  it("throws on HTTP error from er-api", async () => {
    mockFetchHttpError(500);
    await expect(
      fetchRatesFromApi("USD", ["USD", "EUR", "NGN"]),
    ).rejects.toThrow("HTTP 500");
  });

  it("throws on er-api result !== success", async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ result: "error", "error-type": "invalid-key" }),
    });
    await expect(
      fetchRatesFromApi("USD", ["USD", "EUR", "NGN"]),
    ).rejects.toThrow("invalid-key");
  });

  it("throws on network failure", async () => {
    fetch.mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(fetchRatesFromApi("USD", ["USD", "EUR"])).rejects.toThrow(
      "Failed to fetch",
    );
  });
});
