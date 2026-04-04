/**
 * Coordination layer between data and UI.
 *
 * This module is the only place that bridges rate fetching (data/rates.js),
 * state management (data/store.js), and DOM updates. It imports from data/*
 * but never from ui/* — UI modules call these actions and handle rendering
 * themselves, avoiding circular dependencies.
 */
import { store, saveState } from "./data/store.js";
import {
  fetchRatesFromApi,
  hasCompleteRates,
  usesFrankfurter,
} from "./data/rates.js";
import { hapticSuccess } from "./haptics.js";

const STALE_MS = 60 * 60 * 1000;

/**
 * Fetch rates from the API for the current base currency.
 * Stores results in `store.rates`, returns `{ ok, error }`.
 */
export async function refreshRates() {
  const base = store.baseCurrency || store.selected[0];
  if (!base || store.selected.length < 2) return { ok: false };

  try {
    const rates = await fetchRatesFromApi(base, store.selected);
    store.rates = { [base]: rates };
    store.ratesLastSuccessAt = Date.now();
    store.ratesFetchError = false;
    store.ratesSource = usesFrankfurter(base, store.selected)
      ? "frankfurter"
      : "er-api";
    hapticSuccess();
    return { ok: true };
  } catch (err) {
    console.error("Failed to fetch rates:", err);
    store.ratesFetchError = true;
    return { ok: false, error: true };
  }
}

/**
 * Only fetches if we don't already have a complete rate matrix for the base.
 * Returns `{ ok, cached }` — cached=true means no network call was needed.
 */
export async function refreshRatesIfNeeded() {
  const base = store.baseCurrency || store.selected[0];
  if (!base || store.selected.length < 2) return { ok: false };
  const expectedSource = usesFrankfurter(base, store.selected)
    ? "frankfurter"
    : "er-api";
  if (
    hasCompleteRates(base, store.selected, store.rates) &&
    expectedSource === store.ratesSource
  ) {
    store.ratesSource = expectedSource;
    return { ok: true, cached: true };
  }
  return refreshRates();
}

/** True when the last successful fetch is older than one hour. */
export function areRatesStale() {
  const last = store.ratesLastSuccessAt;
  return last != null && Date.now() - last > STALE_MS;
}

/**
 * Remove a currency from the selected list and update base if needed.
 * Returns `{ hasMinimum }` so the caller knows which view to render.
 */
export function removeCurrencyFromStore(code) {
  store.selected = store.selected.filter((c) => c !== code);
  if (store.baseCurrency === code) {
    store.baseCurrency = store.selected[0] || "";
  }
  saveState();
  return { hasMinimum: store.selected.length >= 2 };
}
