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
    mockErApiSuccess({ EUR: 0.92, GBP: 0.79, AED: 3.67 });
    const { rates, source } = await fetchRatesFromApi("USD", [
      "USD",
      "EUR",
      "NGN",
    ]);
    expect(rates.EUR).toBe(0.92);
    expect(rates.NGN).toBeUndefined(); // not in mock response
    expect(source).toBe("er-api");
  });

  it("excludes the base currency from er-api results", async () => {
    mockErApiSuccess({ USD: 1, EUR: 0.92 });
    const { rates } = await fetchRatesFromApi("USD", ["USD", "EUR", "NGN"]);
    expect(rates.USD).toBeUndefined();
    expect(rates.EUR).toBe(0.92);
  });

  // ── error handling ────────────────────────────────────────────────────────

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

  it("throws on network failure from er-api", async () => {
    fetch.mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(
      fetchRatesFromApi("USD", ["USD", "EUR", "NGN"]),
    ).rejects.toThrow("Failed to fetch");
  });
});
