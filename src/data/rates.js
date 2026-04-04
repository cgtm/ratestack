/**
 * Pure exchange-rate fetching — no DOM access, no store mutations.
 *
 * Prefers Frankfurter (160+ currencies, no auth) and falls back to
 * open.er-api.com if Frankfurter is unreachable.
 */

const FRANKFURTER_BASE = "https://api.frankfurter.dev/v2/rates";
const ER_API_BASE = "https://open.er-api.com/v6/latest";

async function fetchFromFrankfurter(base, selectedCodes) {
  const targets = selectedCodes.filter((c) => c !== base);
  const url = `${FRANKFURTER_BASE}?base=${base}&quotes=${targets.join(",")}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const data = await res.json();
  // v2 returns an array: [{ base, quote, rate, date }, ...]
  const rates = {};
  for (const entry of data) {
    rates[entry.quote] = entry.rate;
  }
  return rates;
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
 * Fetch cross-rates for `base`, preferring Frankfurter with er-api as fallback.
 * @param {string} base - Base currency code (e.g. "USD")
 * @param {string[]} selectedCodes - All selected currency codes
 * @returns {Promise<{ rates: Record<string, number>, source: string }>}
 */
export async function fetchRatesFromApi(base, selectedCodes) {
  try {
    const rates = await fetchFromFrankfurter(base, selectedCodes);
    return { rates, source: "frankfurter" };
  } catch (err) {
    console.warn("Frankfurter unreachable, falling back to er-api:", err);
  }
  const rates = await fetchFromErApi(base, selectedCodes);
  return { rates, source: "er-api" };
}

/**
 * True when `rates[base]` has an entry for every other selected code.
 */
export function hasCompleteRates(base, selectedCodes, rates) {
  if (!base || !rates[base]) return false;
  return selectedCodes.every((c) => c === base || rates[base][c] !== undefined);
}
