/**
 * Central client state and amount parsing/formatting. `baseAmount` is stored as a plain string
 * with `.` as decimal separator so `parseFloat` is reliable; display uses `Intl` with the
 * system-aware locale from `numberLocale()` (see i18n.js).
 *
 * i18n lives in `i18n.js` (not here) so this module can import `numberLocale` without creating
 * a circular dependency with `state` ↔ `i18n`.
 */
import { numberLocale, t } from "./i18n.js";
import { CURRENCIES } from "./currencies.js";

const STORAGE_KEY = "ratestack";

export const store = {
  selected: [],
  rates: {},
  baseCurrency: "",
  baseAmount: "",
  theme: "default",
  lang: "en",
  ratesLastSuccessAt: null,
  ratesFetchError: false,
};

const MIN_SELECTED_FOR_CONVERTER = 2;

/** True when the user has selected enough currencies to show the stacked converter. */
export function hasMinimumCurrencies() {
  return store.selected.length >= MIN_SELECTED_FOR_CONVERTER;
}

/** ISO codes that conventionally have no fractional units in UI. */
const NO_DECIMALS = [
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
];

/** Regex-escape for building `RegExp` from locale separator strings (may be `.`). */
function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Separators for the active number locale (grouping + decimal). */
export function getLocaleSeparators() {
  const locale = numberLocale();
  const parts = new Intl.NumberFormat(locale).formatToParts(1234567.89);
  let group = ",";
  let decimal = ".";
  for (const p of parts) {
    if (p.type === "group") group = p.value;
    if (p.type === "decimal") decimal = p.value;
  }
  return { group, decimal };
}

/**
 * When both `,` and `.` appear, the rightmost separator wins as the decimal mark
 * (shared by paste parsing and live typing normalization).
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
  const partsDot = s.split(".");
  if (partsDot.length <= 2) return s;
  return partsDot[0] + "." + partsDot.slice(1).join("");
}

/**
 * Parse pasted or displayed values (e.g. `1.234,56` in es-ES) into canonical `1234.56`.
 * Used on input focus so switching cards does not corrupt the numeric value.
 */
export function parseLocaleAmountString(str) {
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
    /* e.g. typed "1.5" while locale uses comma as decimal — treat dot as decimal */
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

function mergeSavedIntoStore(saved) {
  if (!saved) return;
  if (Array.isArray(saved.selected)) {
    store.selected = saved.selected.filter((c) => CURRENCIES[c]);
  }
  if (saved.theme) {
    store.theme = saved.theme;
  }
  if (saved.lang) {
    store.lang = saved.lang;
  }
}

function clearCorruptedStorage() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    mergeSavedIntoStore(saved);
  } catch {
    clearCorruptedStorage();
  }
  store.baseCurrency = store.selected[0] || "";
}

function buildPersistPayload() {
  return {
    selected: store.selected,
    theme: store.theme,
    lang: store.lang,
  };
}

/** Persist only durable preferences; `baseAmount` / `rates` are session-like. */
export function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(buildPersistPayload()));
}

function fractionDigitsFor(code) {
  return NO_DECIMALS.includes(code) ? 0 : 2;
}

export function formatNumber(value, code) {
  const decimals = fractionDigitsFor(code);
  return new Intl.NumberFormat(numberLocale(), {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function getRateDisplay(fromCode, toCode) {
  if (!store.rates[fromCode] || !store.rates[fromCode][toCode]) return "";
  const rate = store.rates[fromCode][toCode];
  return t("rate.display", {
    from: fromCode,
    value: formatNumber(rate, toCode),
    to: toCode,
  });
}
