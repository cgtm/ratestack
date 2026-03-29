/**
 * Central client state and localStorage persistence.
 *
 * The store is a plain shared object — modules import it, read/write properties,
 * and call `saveState()` to persist durable preferences. Transient data like
 * `baseAmount` and `rates` are intentionally excluded from persistence.
 */
import { CURRENCIES } from "../currencies.js";

const STORAGE_KEY = "ratestack";
const MIN_SELECTED = 2;

export const store = {
  selected: [],
  rates: {},
  baseCurrency: "",
  baseAmount: "",
  theme: "default",
  lang: "en",
  ratesLastSuccessAt: null,
  ratesFetchError: false,
  ratesSource: null, // "frankfurter" | "er-api" | null
};

export function hasMinimumCurrencies() {
  return store.selected.length >= MIN_SELECTED;
}

function mergeSavedIntoStore(saved) {
  if (!saved) return;
  if (Array.isArray(saved.selected)) {
    store.selected = saved.selected.filter((c) => CURRENCIES[c]);
  }
  if (saved.theme) store.theme = saved.theme;
  if (saved.lang) store.lang = saved.lang;
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

export function saveState() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      selected: store.selected,
      theme: store.theme,
      lang: store.lang,
    }),
  );
}
