/**
 * Native number formatting for currencies with a different cognitive grouping system.
 *
 * Two groups are supported:
 *   - CJK (万/億/兆): JPY, KRW, CNY, HKD, TWD, MOP — groups in units of 10,000
 *   - South Asian (lakh/crore): INR, PKR, BDT, LKR, NPR — 2-digit groups after first 3
 *
 * The icon is only shown when the value is large enough that native format visually
 * differs from standard: ≥ 10,000 for CJK, ≥ 100,000 for lakh.
 */

const CJK_CURRENCIES = new Set(["JPY", "KRW", "CNY", "HKD", "TWD", "MOP"]);
const LAKH_CURRENCIES = new Set(["INR", "PKR", "BDT", "LKR", "NPR"]);

export const NATIVE_FORMAT_CURRENCIES = new Set([
  ...CJK_CURRENCIES,
  ...LAKH_CURRENCIES,
]);

const CJK_UNITS = {
  KRW: { man: "만", eok: "억", jo: "조", currency: "원" },
  JPY: { man: "万", eok: "億", jo: "兆", currency: "円" },
  CNY: { man: "万", eok: "亿", jo: "兆", currency: "元" },
  HKD: { man: "萬", eok: "億", jo: "兆", currency: "元" },
  TWD: { man: "萬", eok: "億", jo: "兆", currency: "元" },
  MOP: { man: "萬", eok: "億", jo: "兆", currency: "元" },
};

/**
 * Returns true if this currency appends a unit suffix in native format.
 * Used by card-format.js to suppress the left-side symbol without a content shift.
 */
export function hasCurrencyUnit(code) {
  return code in CJK_UNITS;
}

const CJK_THRESHOLD = 10_000;
const LAKH_THRESHOLD = 100_000;

/**
 * Returns true if a native format is available AND visually differs from standard
 * at this value. The icon should only be shown when this returns true.
 */
export function hasNativeFormat(code, value) {
  if (CJK_CURRENCIES.has(code)) return Math.abs(value) >= CJK_THRESHOLD;
  if (LAKH_CURRENCIES.has(code)) return Math.abs(value) >= LAKH_THRESHOLD;
  return false;
}

function formatCJK(value, code) {
  const units = CJK_UNITS[code];
  const int = Math.round(value);

  if (int === 0) return "0";

  const absInt = Math.abs(int);
  const sign = int < 0 ? "-" : "";

  const jo = Math.floor(absInt / 1_000_000_000_000);
  const eok = Math.floor((absInt % 1_000_000_000_000) / 100_000_000);
  const man = Math.floor((absInt % 100_000_000) / 10_000);
  const rem = absInt % 10_000;

  const parts = [];
  if (jo) parts.push(jo.toLocaleString() + units.jo);
  if (eok) parts.push(eok.toLocaleString() + units.eok);
  if (man) parts.push(man.toLocaleString() + units.man);
  if (rem || !parts.length) parts.push(rem.toLocaleString());

  return sign + parts.join(" ") + units.currency;
}

const _lakhFormatter = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatLakh(value) {
  return _lakhFormatter.format(value);
}

/**
 * Format a value in its native grouping system.
 * Only call this when hasNativeFormat(code, value) is true.
 */
export function formatNative(value, code) {
  if (CJK_CURRENCIES.has(code)) return formatCJK(value, code);
  if (LAKH_CURRENCIES.has(code)) return formatLakh(value);
  return String(value);
}
