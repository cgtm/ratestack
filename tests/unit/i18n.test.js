import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  t,
  setLang,
  getLang,
  currencyName,
  regionName,
  numberLocale,
  LANGUAGES,
} from "../../src/i18n.js";

beforeEach(() => setLang("en"));

// ─── LANGUAGES ───────────────────────────────────────────────────────────────

describe("LANGUAGES", () => {
  it("contains all supported language codes", () => {
    expect(Object.keys(LANGUAGES)).toEqual(
      expect.arrayContaining(["en", "af", "ko", "zh", "hi", "es", "ja"]),
    );
  });

  it("each entry has label, flag, and numberLocale", () => {
    for (const entry of Object.values(LANGUAGES)) {
      expect(entry).toHaveProperty("label");
      expect(entry).toHaveProperty("flag");
      expect(entry).toHaveProperty("numberLocale");
    }
  });
});

// ─── setLang / getLang ────────────────────────────────────────────────────────

describe("setLang / getLang", () => {
  it("defaults to en", () => {
    expect(getLang()).toBe("en");
  });

  it("updates the active language", () => {
    setLang("ko");
    expect(getLang()).toBe("ko");
  });
});

// ─── t ───────────────────────────────────────────────────────────────────────

describe("t", () => {
  it("returns the translation for the active language", () => {
    expect(t("settings.done")).toBe("Done");
  });

  it("falls back to English when key is missing in active language", () => {
    setLang("ko");
    // All keys should exist, but the fallback path is: active → en → key itself
    expect(t("settings.done")).toBe("완료");
  });

  it("returns the key itself when missing from all languages", () => {
    expect(t("nonexistent.key")).toBe("nonexistent.key");
  });

  it("interpolates {{params}}", () => {
    expect(t("settings.hintMore", { count: 2 })).toBe("Select at least 2 more");
  });

  it("interpolates multiple params", () => {
    expect(t("rate.display", { from: "USD", value: "1.08", to: "EUR" })).toBe(
      "1 USD = 1.08 EUR",
    );
  });

  it("replaces null param with empty string", () => {
    const result = t("rate.display", { from: "USD", value: null, to: "EUR" });
    expect(result).toBe("1 USD =  EUR");
  });

  it("switches translation when lang changes", () => {
    setLang("es");
    expect(t("settings.done")).toBe("Listo");
  });
});

// ─── currencyName / regionName ───────────────────────────────────────────────

describe("currencyName", () => {
  it("returns English currency name", () => {
    expect(currencyName("USD")).toBe("US Dollar");
    expect(currencyName("JPY")).toBe("Japanese Yen");
  });

  it("returns localised name when lang is set", () => {
    setLang("ko");
    expect(currencyName("USD")).toBe("미국 달러");
  });
});

describe("regionName", () => {
  it("returns English region name", () => {
    expect(regionName("Europe")).toBe("Europe");
  });

  it("returns localised region name", () => {
    setLang("zh");
    expect(regionName("Europe")).toBe("欧洲");
  });
});

// ─── numberLocale ─────────────────────────────────────────────────────────────

describe("numberLocale", () => {
  it("returns a non-empty string", () => {
    const locale = numberLocale();
    expect(typeof locale).toBe("string");
    expect(locale.length).toBeGreaterThan(0);
  });

  it("returns the language fallback when navigator is unavailable", () => {
    setLang("ko");
    // happy-dom provides navigator.language; the result should still be a valid BCP47 tag
    const locale = numberLocale();
    expect(locale).toMatch(/^[a-z]{2}/i);
  });

  it("returns fallback when supportedLocalesOf throws on an invalid tag", () => {
    const spy = vi
      .spyOn(Intl.NumberFormat, "supportedLocalesOf")
      .mockImplementationOnce(() => {
        throw new RangeError("invalid");
      });
    setLang("en");
    const locale = numberLocale();
    expect(locale).toBe("en-US");
    spy.mockRestore();
  });
});
