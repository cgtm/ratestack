import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../src/currencies.js", () => ({
  CURRENCIES: {
    USD: { flag: "🇺🇸", name: "US Dollar", symbol: "$" },
    EUR: { flag: "🇪🇺", name: "Euro", symbol: "€" },
    GBP: { flag: "🇬🇧", name: "British Pound", symbol: "£" },
  },
}));

vi.mock("../../src/haptics.js", () => ({
  hapticSuccess: vi.fn(),
}));

// Mock the pure fetch layer so actions tests don't hit the network
vi.mock("../../src/data/rates.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    fetchRatesFromApi: vi.fn(),
  };
});

import { store } from "../../src/data/store.js";
import { fetchRatesFromApi } from "../../src/data/rates.js";
import {
  refreshRates,
  refreshRatesIfNeeded,
  removeCurrencyFromStore,
  areRatesStale,
} from "../../src/actions.js";

function resetStore(overrides = {}) {
  Object.assign(store, {
    selected: ["USD", "EUR"],
    rates: {},
    baseCurrency: "USD",
    baseAmount: "100",
    theme: "default",
    lang: "en",
    ratesLastSuccessAt: null,
    ratesFetchError: false,
    ...overrides,
  });
}

beforeEach(() => {
  resetStore();
  vi.clearAllMocks();
});

// ─── refreshRates ─────────────────────────────────────────────────────────────

describe("refreshRates", () => {
  it("stores fetched rates on success", async () => {
    fetchRatesFromApi.mockResolvedValue({ EUR: 0.92 });

    const result = await refreshRates();

    expect(result.ok).toBe(true);
    expect(store.rates).toEqual({ USD: { EUR: 0.92 } });
    expect(store.ratesFetchError).toBe(false);
    expect(store.ratesLastSuccessAt).toBeTypeOf("number");
  });

  it("sets ratesFetchError on failure", async () => {
    fetchRatesFromApi.mockRejectedValue(new Error("Network error"));

    const result = await refreshRates();

    expect(result.ok).toBe(false);
    expect(result.error).toBe(true);
    expect(store.ratesFetchError).toBe(true);
    expect(store.rates).toEqual({});
  });

  it("returns early when fewer than 2 currencies selected", async () => {
    store.selected = ["USD"];
    const result = await refreshRates();
    expect(result.ok).toBe(false);
    expect(fetchRatesFromApi).not.toHaveBeenCalled();
  });

  it("returns early when no currencies selected", async () => {
    store.selected = [];
    store.baseCurrency = "";
    const result = await refreshRates();
    expect(result.ok).toBe(false);
    expect(fetchRatesFromApi).not.toHaveBeenCalled();
  });

  it("uses baseCurrency as the fetch base", async () => {
    fetchRatesFromApi.mockResolvedValue({ USD: 1.09 });
    store.baseCurrency = "EUR";
    store.selected = ["EUR", "USD"];

    await refreshRates();

    expect(fetchRatesFromApi).toHaveBeenCalledWith("EUR", ["EUR", "USD"]);
  });

  it("falls back to first selected when baseCurrency is empty", async () => {
    fetchRatesFromApi.mockResolvedValue({ EUR: 0.92 });
    store.baseCurrency = "";
    store.selected = ["USD", "EUR"];

    await refreshRates();

    expect(fetchRatesFromApi).toHaveBeenCalledWith("USD", ["USD", "EUR"]);
  });

  it("replaces old rates (prunes stale base keys)", async () => {
    store.rates = { EUR: { USD: 1.09 } }; // stale from a previous base
    fetchRatesFromApi.mockResolvedValue({ EUR: 0.92 });

    await refreshRates();

    expect(store.rates).toEqual({ USD: { EUR: 0.92 } });
    expect(store.rates.EUR).toBeUndefined();
  });
});

// ─── refreshRatesIfNeeded ─────────────────────────────────────────────────────

describe("refreshRatesIfNeeded", () => {
  it("skips fetch when complete rates already cached", async () => {
    store.rates = { USD: { EUR: 0.92 } };
    const result = await refreshRatesIfNeeded();
    expect(result.cached).toBe(true);
    expect(fetchRatesFromApi).not.toHaveBeenCalled();
  });

  it("fetches when rates are missing", async () => {
    fetchRatesFromApi.mockResolvedValue({ EUR: 0.92 });
    const result = await refreshRatesIfNeeded();
    expect(fetchRatesFromApi).toHaveBeenCalledOnce();
    expect(result.ok).toBe(true);
  });

  it("fetches when only partial rates cached", async () => {
    store.selected = ["USD", "EUR", "GBP"];
    store.rates = { USD: { EUR: 0.92 } }; // GBP missing
    fetchRatesFromApi.mockResolvedValue({ EUR: 0.92, GBP: 0.79 });

    await refreshRatesIfNeeded();

    expect(fetchRatesFromApi).toHaveBeenCalledOnce();
  });
});

// ─── removeCurrencyFromStore ──────────────────────────────────────────────────

describe("removeCurrencyFromStore", () => {
  it("removes the specified currency", () => {
    store.selected = ["USD", "EUR", "GBP"];
    removeCurrencyFromStore("EUR");
    expect(store.selected).toEqual(["USD", "GBP"]);
  });

  it("updates baseCurrency when base is removed", () => {
    store.selected = ["USD", "EUR", "GBP"];
    store.baseCurrency = "USD";
    removeCurrencyFromStore("USD");
    expect(store.baseCurrency).toBe("EUR");
  });

  it("sets baseCurrency to empty when last currency removed", () => {
    store.selected = ["USD"];
    store.baseCurrency = "USD";
    removeCurrencyFromStore("USD");
    expect(store.baseCurrency).toBe("");
  });

  it("returns hasMinimum: true when 2 remain", () => {
    store.selected = ["USD", "EUR", "GBP"];
    const { hasMinimum } = removeCurrencyFromStore("GBP");
    expect(hasMinimum).toBe(true);
  });

  it("returns hasMinimum: false when fewer than 2 remain", () => {
    store.selected = ["USD", "EUR"];
    const { hasMinimum } = removeCurrencyFromStore("EUR");
    expect(hasMinimum).toBe(false);
  });

  it("does not mutate selected if code not found", () => {
    store.selected = ["USD", "EUR"];
    removeCurrencyFromStore("GBP");
    expect(store.selected).toEqual(["USD", "EUR"]);
  });
});

// ─── areRatesStale ────────────────────────────────────────────────────────────

describe("areRatesStale", () => {
  it("returns false when rates have never been fetched", () => {
    store.ratesLastSuccessAt = null;
    expect(areRatesStale()).toBe(false);
  });

  it("returns false when rates are fresh (< 1 hour old)", () => {
    store.ratesLastSuccessAt = Date.now() - 30 * 60 * 1000; // 30 min ago
    expect(areRatesStale()).toBe(false);
  });

  it("returns true when rates are older than 1 hour", () => {
    store.ratesLastSuccessAt = Date.now() - 61 * 60 * 1000; // 61 min ago
    expect(areRatesStale()).toBe(true);
  });
});
