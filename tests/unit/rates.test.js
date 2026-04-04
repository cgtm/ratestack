import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchRatesFromApi, hasCompleteRates } from "../../src/data/rates.js";

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

// ─── fetchRatesFromApi ────────────────────────────────────────────────────────

describe("fetchRatesFromApi", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function mockFrankfurterSuccess(rates, base = "USD") {
    fetch.mockResolvedValue({
      ok: true,
      json: async () =>
        Object.entries(rates).map(([quote, rate]) => ({
          base,
          quote,
          rate,
          date: "2026-01-01",
        })),
    });
  }

  function mockFrankfurterFailThenErApiSuccess(erApiRates) {
    fetch
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: "success", rates: erApiRates }),
      });
  }

  function mockFetchHttpError(status) {
    fetch.mockResolvedValue({ ok: false, status });
  }

  // ── API routing ───────────────────────────────────────────────────────────

  it("always calls Frankfurter first", async () => {
    mockFrankfurterSuccess({ EUR: 0.92, GBP: 0.79 });
    await fetchRatesFromApi("USD", ["USD", "EUR", "GBP"]);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("frankfurter.dev"),
    );
  });

  it("builds correct Frankfurter URL with base and quotes params", async () => {
    mockFrankfurterSuccess({ EUR: 0.92, GBP: 0.79 });
    await fetchRatesFromApi("USD", ["USD", "EUR", "GBP"]);
    const url = fetch.mock.calls[0][0];
    expect(url).toContain("base=USD");
    expect(url).toContain("EUR");
    expect(url).toContain("GBP");
    // base should not appear in quotes
    expect(url.split("quotes=")[1]).not.toMatch(/\bUSD\b/);
  });

  it("falls back to er-api when Frankfurter returns an HTTP error", async () => {
    fetch
      .mockResolvedValueOnce({ ok: false, status: 429 })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: "success", rates: { EUR: 0.92 } }),
      });
    const { rates, source } = await fetchRatesFromApi("USD", ["USD", "EUR"]);
    expect(rates.EUR).toBe(0.92);
    expect(source).toBe("er-api");
  });

  it("falls back to er-api when Frankfurter has a network failure", async () => {
    fetch
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: "success", rates: { EUR: 0.92 } }),
      });
    const { rates, source } = await fetchRatesFromApi("USD", ["USD", "EUR"]);
    expect(rates.EUR).toBe(0.92);
    expect(source).toBe("er-api");
  });

  // ── response parsing ──────────────────────────────────────────────────────

  it("returns rates and source:frankfurter from Frankfurter response", async () => {
    mockFrankfurterSuccess({ EUR: 0.92, GBP: 0.79 });
    const { rates, source } = await fetchRatesFromApi("USD", [
      "USD",
      "EUR",
      "GBP",
    ]);
    expect(rates).toEqual({ EUR: 0.92, GBP: 0.79 });
    expect(source).toBe("frankfurter");
  });

  it("returns rates and source:er-api from er-api response", async () => {
    mockFrankfurterFailThenErApiSuccess({ EUR: 0.92, GBP: 0.79, AED: 3.67 });
    const { rates, source } = await fetchRatesFromApi("USD", [
      "USD",
      "EUR",
      "GBP",
    ]);
    expect(rates.EUR).toBe(0.92);
    expect(source).toBe("er-api");
  });

  it("excludes the base currency from er-api results", async () => {
    mockFrankfurterFailThenErApiSuccess({ USD: 1, EUR: 0.92 });
    const { rates } = await fetchRatesFromApi("USD", ["USD", "EUR"]);
    expect(rates.USD).toBeUndefined();
    expect(rates.EUR).toBe(0.92);
  });

  // ── error handling ────────────────────────────────────────────────────────

  it("throws when both Frankfurter and er-api return HTTP errors", async () => {
    fetch
      .mockResolvedValueOnce({ ok: false, status: 429 })
      .mockResolvedValueOnce({ ok: false, status: 500 });
    await expect(fetchRatesFromApi("USD", ["USD", "EUR"])).rejects.toThrow(
      "HTTP 500",
    );
  });

  it("throws when er-api result !== success", async () => {
    fetch
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: "error", "error-type": "invalid-key" }),
      });
    await expect(fetchRatesFromApi("USD", ["USD", "EUR"])).rejects.toThrow(
      "invalid-key",
    );
  });

  it("throws when both APIs have network failures", async () => {
    fetch.mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(fetchRatesFromApi("USD", ["USD", "EUR"])).rejects.toThrow(
      "Failed to fetch",
    );
  });
});
