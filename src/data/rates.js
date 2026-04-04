/**
 * Pure exchange-rate fetching — no DOM access, no store mutations.
 *
 * Prefers Frankfurter (unlimited, no auth) when all selected currencies are
 * in its ECB-sourced set; falls back to open.er-api.com for exotic currencies.
 */

const FRANKFURTER_BASE = "https://api.frankfurter.app/latest";
const ER_API_BASE = "https://open.er-api.com/v6/latest";

/**
 * Currencies supported by Frankfurter (ECB data, ~32 major currencies).
 * https://frankfurter.dev/
 */
const FRANKFURTER_CURRENCIES = new Set([
  "AUD",
  "BGN",
  "BRL",
  "CAD",
  "CHF",
  "CNY",
  "CZK",
  "DKK",
  "EUR",
  "GBP",
  "HKD",
  "HUF",
  "IDR",
  "ILS",
  "INR",
  "ISK",
  "JPY",
  "KRW",
  "MXN",
  "MYR",
  "NOK",
  "NZD",
  "PHP",
  "PLN",
  "RON",
  "SEK",
  "SGD",
  "THB",
  "TRY",
  "USD",
  "ZAR",
]);

/**
 * True when Frankfurter can serve all of the requested currencies.
 * Exported for testing.
 */
export function usesFrankfurter(base, selectedCodes) {
  if (!FRANKFURTER_CURRENCIES.has(base)) return false;
  return selectedCodes.every((c) => FRANKFURTER_CURRENCIES.has(c));
}

async function fetchFromFrankfurter(base, selectedCodes) {
  const targets = selectedCodes.filter((c) => c !== base);
  const url = `${FRANKFURTER_BASE}?from=${base}&symbols=${targets.join(",")}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const data = await res.json();
  // Frankfurter returns { base, date, rates: { EUR: 0.92, ... } }
  // base currency is not included in rates — matches fetchFromErApi's output shape
  return data.rates;
}

async function fetchFromErApi(base, selectedCodes) {
  const res = await fetch(`${ER_API_BASE}/${base}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const data = await res.json();
  if (data.result !== "success") {
    throw new Error(data["error-type"] || "API error");
  }

  const relevant = {};
  for (const code of selectedCodes) {
    if (code !== base && data.rates[code] !== undefined) {
      relevant[code] = data.rates[code];
    }
  }
  return relevant;
}

/**
 * Fetch cross-rates for `base` from the best available API.
 * Uses Frankfurter when all currencies are in its ECB set; falls back to er-api.
 * @param {string} base - Base currency code (e.g. "USD")
 * @param {string[]} selectedCodes - All selected currency codes
 * @returns {Promise<Record<string, number>>} Rates keyed by target currency
 */
export async function fetchRatesFromApi(base, selectedCodes) {
  if (usesFrankfurter(base, selectedCodes)) {
    try {
      return await fetchFromFrankfurter(base, selectedCodes);
    } catch (err) {
      console.warn("Frankfurter unreachable, falling back to er-api:", err);
    }
  }
  return fetchFromErApi(base, selectedCodes);
}

/**
 * True when `rates[base]` has an entry for every other selected code.
 */
export function hasCompleteRates(base, selectedCodes, rates) {
  if (!base || !rates[base]) return false;
  return selectedCodes.every((c) => c === base || rates[base][c] !== undefined);
}
