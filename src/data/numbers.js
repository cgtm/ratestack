/**
 * Locale-aware number parsing and formatting.
 *
 * `baseAmount` is always stored as a canonical string with `.` as decimal separator
 * so `parseFloat` is reliable. Display uses `Intl.NumberFormat` with the system-aware
 * locale from `numberLocale()`.
 *
 * Intl formatters are cached and invalidated only when the locale changes.
 */
import { numberLocale, t } from "../i18n.js";

/** ISO codes that conventionally have no fractional units in UI. */
const NO_DECIMALS = new Set([
  "KRW",
  "JPY",
  "CLP",
  "VND",
  "IDR",
  "UGX",
  "TZS",
  "HUF",
  "ISK",
  "COP",
]);

/* ---------- Intl cache ---------- */

let _cachedLocale = null;
let _cachedSeparators = null;
let _cachedFormatters = {};

function ensureCache() {
  const locale = numberLocale();
  if (locale === _cachedLocale) return;
  _cachedLocale = locale;
  _cachedSeparators = null;
  _cachedFormatters = {};
}

function getFormatter(decimals) {
  ensureCache();
  if (!_cachedFormatters[decimals]) {
    _cachedFormatters[decimals] = new Intl.NumberFormat(_cachedLocale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }
  return _cachedFormatters[decimals];
}

/* ---------- Separators ---------- */

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function getLocaleSeparators() {
  ensureCache();
  if (_cachedSeparators) return _cachedSeparators;

  const parts = getFormatter(2).formatToParts(1234567.89);
  let group = ",";
  let decimal = ".";
  for (const p of parts) {
    if (p.type === "group") group = p.value;
    if (p.type === "decimal") decimal = p.value;
  }
  _cachedSeparators = { group, decimal };
  return _cachedSeparators;
}

/** Force cache invalidation (called on language/locale change). */
export function resetNumberCache() {
  _cachedLocale = null;
  _cachedSeparators = null;
  _cachedFormatters = {};
}

/* ---------- Parsing helpers ---------- */

/**
 * When both `,` and `.` appear, the rightmost separator wins as the decimal mark.
 * Only one decimal comma is expected (the rightmost), so the non-global replace is intentional.
 */
function resolveMixedCommaAndDot(s) {
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma < 0 || lastDot < 0) return s;
  if (lastComma > lastDot) {
    return s.replace(/\./g, "").replace(",", ".");
  }
  return s.replace(/,/g, "");
}

function stripNbspAndSpaces(str) {
  return String(str)
    .replace(/\u00a0/g, " ")
    .trim()
    .replace(/\s/g, "");
}

function stripGroupingSeparators(s, group) {
  if (!group) return s;
  return s.replace(new RegExp(escapeRe(group), "g"), "");
}

function normalizeNonDotDecimalSeparator(s, decimal) {
  if (decimal === "." || decimal === ",") return s;
  return s.replace(new RegExp(escapeRe(decimal), "g"), ".");
}

function collapseExtraDots(s) {
  const parts = s.split(".");
  if (parts.length <= 2) return s;
  return parts[0] + "." + parts.slice(1).join("");
}

/* ---------- Public API ---------- */

/**
 * Parse pasted or displayed values (e.g. `1.234,56` in es-ES) into canonical `1234.56`.
 */
export function parseLocaleAmount(str) {
  if (str == null || str === "") return "";
  const { group, decimal } = getLocaleSeparators();
  let s = stripNbspAndSpaces(str);
  s = stripGroupingSeparators(s, group);

  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma >= 0 && lastDot >= 0) {
    s = resolveMixedCommaAndDot(s);
  } else if (lastComma >= 0 && lastDot < 0) {
    if (decimal === ",") s = s.replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (lastDot >= 0 && lastComma < 0 && decimal !== ".") {
    /* typed "1.5" while locale uses comma as decimal — treat dot as decimal */
  }

  s = normalizeNonDotDecimalSeparator(s, decimal);
  s = s.replace(/[^\d.]/g, "");
  return collapseExtraDots(s);
}

/**
 * Live typing: allow `,` or `.` as decimal depending on context; collapse duplicate separators.
 */
export function normalizeTypingAmount(raw) {
  let s = String(raw).replace(/[^\d.,]/g, "");

  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma >= 0 && lastDot >= 0) {
    s = resolveMixedCommaAndDot(s);
  } else if (lastComma >= 0 && lastDot < 0) {
    const { decimal } = getLocaleSeparators();
    if (decimal === ",") {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (lastDot >= 0 && lastComma < 0) {
    const { decimal } = getLocaleSeparators();
    if (decimal !== ",") {
      s = s.replace(/,/g, "");
    }
  }

  const idx = s.indexOf(".");
  if (idx !== -1) {
    s = s.slice(0, idx + 1) + s.slice(idx + 1).replace(/\./g, "");
  }
  return s;
}

function fractionDigitsFor(code) {
  return NO_DECIMALS.has(code) ? 0 : 2;
}

export function formatNumber(value, code) {
  return getFormatter(fractionDigitsFor(code)).format(value);
}

export function getRateDisplay(fromCode, toCode, rates) {
  if (!rates[fromCode] || !rates[fromCode][toCode]) return "";
  const rate = rates[fromCode][toCode];
  return t("rate.display", {
    from: fromCode,
    value: formatNumber(rate, toCode),
    to: toCode,
  });
}

/**
 * Compute converted amounts for all non-base selected currencies.
 * Returns a map of { code: number } or empty object if base amount is invalid.
 */
export function computeConvertedAmounts(
  baseAmount,
  baseCurrency,
  selected,
  rates,
) {
  const amount = parseFloat(baseAmount);
  if (!baseAmount || isNaN(amount)) return null;

  const result = {};
  const baseRates = rates[baseCurrency];
  if (!baseRates) return result;

  for (const code of selected) {
    if (code === baseCurrency) continue;
    if (baseRates[code] !== undefined) {
      result[code] = amount * baseRates[code];
    }
  }
  return result;
}
