import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock currencies to keep test data small
vi.mock("../../src/currencies.js", () => ({
  CURRENCIES: {
    USD: { flag: "🇺🇸", name: "US Dollar", symbol: "$" },
    EUR: { flag: "🇪🇺", name: "Euro", symbol: "€" },
    GBP: { flag: "🇬🇧", name: "British Pound", symbol: "£" },
  },
}));

import {
  store,
  loadState,
  saveState,
  hasMinimumCurrencies,
} from "../../src/data/store.js";

function resetStore() {
  store.selected = [];
  store.rates = {};
  store.baseCurrency = "";
  store.baseAmount = "";
  store.theme = "default";
  store.lang = "en";
  store.ratesLastSuccessAt = null;
  store.ratesFetchError = false;
}

beforeEach(() => {
  resetStore();
});

// ─── hasMinimumCurrencies ─────────────────────────────────────────────────────

describe("hasMinimumCurrencies", () => {
  it("returns false with 0 selected", () => {
    store.selected = [];
    expect(hasMinimumCurrencies()).toBe(false);
  });

  it("returns false with 1 selected", () => {
    store.selected = ["USD"];
    expect(hasMinimumCurrencies()).toBe(false);
  });

  it("returns true with 2 selected", () => {
    store.selected = ["USD", "EUR"];
    expect(hasMinimumCurrencies()).toBe(true);
  });

  it("returns true with 5 selected", () => {
    store.selected = ["USD", "EUR", "GBP", "USD", "EUR"];
    expect(hasMinimumCurrencies()).toBe(true);
  });
});

// ─── saveState / loadState ────────────────────────────────────────────────────

describe("saveState + loadState round-trip", () => {
  it("persists selected, theme, and lang", () => {
    store.selected = ["USD", "EUR"];
    store.theme = "arctic";
    store.lang = "ko";
    saveState();

    resetStore();
    loadState();

    expect(store.selected).toEqual(["USD", "EUR"]);
    expect(store.theme).toBe("arctic");
    expect(store.lang).toBe("ko");
  });

  it("does not persist rates or baseAmount", () => {
    store.rates = { USD: { EUR: 0.92 } };
    store.baseAmount = "100";
    saveState();

    resetStore();
    loadState();

    expect(store.rates).toEqual({});
    expect(store.baseAmount).toBe("");
  });

  it("sets baseCurrency to first selected on load", () => {
    store.selected = ["GBP", "USD"];
    saveState();

    resetStore();
    loadState();

    expect(store.baseCurrency).toBe("GBP");
  });

  it("sets baseCurrency to empty string when nothing selected", () => {
    store.selected = [];
    saveState();
    resetStore();
    loadState();
    expect(store.baseCurrency).toBe("");
  });
});

describe("loadState with corrupted storage", () => {
  it("recovers gracefully and resets to defaults", () => {
    localStorage.setItem("ratestack", "{not valid json{{");
    loadState();
    expect(store.selected).toEqual([]);
    expect(store.theme).toBe("default");
  });

  it("filters out unknown currency codes", () => {
    localStorage.setItem(
      "ratestack",
      JSON.stringify({
        selected: ["USD", "FAKE", "EUR"],
        theme: "default",
        lang: "en",
      }),
    );
    loadState();
    expect(store.selected).toEqual(["USD", "EUR"]);
  });

  it("handles missing fields gracefully", () => {
    localStorage.setItem("ratestack", JSON.stringify({}));
    loadState();
    expect(store.selected).toEqual([]);
    expect(store.theme).toBe("default");
    expect(store.lang).toBe("en");
  });

  it("handles null stored value", () => {
    localStorage.removeItem("ratestack");
    loadState();
    expect(store.selected).toEqual([]);
  });
});
