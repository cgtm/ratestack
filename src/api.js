/**
 * Exchange-rate fetching, conversion math, and rate-related UI (timestamp, per-card labels,
 * error/stale hints). One HTTP request per refresh: open.er-api.com returns all cross-rates
 * for a chosen base currency, so we only need the current `baseCurrency` as the API path segment.
 */
import { store, formatNumber, getRateDisplay } from './state.js';
import { t, numberLocale } from './i18n.js';
import { hapticSuccess } from './haptics.js';

const API_BASE = 'https://open.er-api.com/v6/latest';
const STALE_MS = 60 * 60 * 1000;

/** True when `store.rates[base]` has an entry for every other selected code. */
function hasCompleteRatesForBase(base) {
  if (!base || !store.rates[base]) return false;
  return store.selected.every((c) => c === base || store.rates[base][c] !== undefined);
}

/** Keep a single base key in `store.rates` so we never mix stale matrices from different fetches. */
function pruneRatesExcept(base) {
  Object.keys(store.rates).forEach((k) => {
    if (k !== base) delete store.rates[k];
  });
}

/** Human-readable “2 min ago” using Intl (`numberLocale()` — typically system locale). */
function formatRelativeSince(ms) {
  const rtf = new Intl.RelativeTimeFormat(numberLocale(), { numeric: 'auto' });
  const diffSec = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (diffSec < 60) return rtf.format(-diffSec, 'second');
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return rtf.format(-diffMin, 'minute');
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return rtf.format(-diffHr, 'hour');
  const diffDay = Math.floor(diffHr / 24);
  return rtf.format(-diffDay, 'day');
}

export function updateRateStatusUI() {
  const staleEl = document.getElementById('rate-stale');
  const errEl = document.getElementById('rate-error');
  const offlineEl = document.getElementById('rate-offline');
  const refreshBtn = document.getElementById('refresh-btn');
  if (!staleEl || !errEl) return;

  const online = typeof navigator !== 'undefined' ? navigator.onLine : true;

  if (offlineEl) {
    if (!online && store.selected.length >= 2) {
      offlineEl.textContent = t('rates.offline');
      offlineEl.classList.remove('hidden');
    } else {
      offlineEl.classList.add('hidden');
    }
  }

  if (store.ratesFetchError && online) {
    errEl.textContent = t('rates.error');
    errEl.classList.remove('hidden');
  } else {
    errEl.classList.add('hidden');
  }

  const last = store.ratesLastSuccessAt;
  const old = last != null && Date.now() - last > STALE_MS;
  if (old && store.selected.length >= 2) {
    staleEl.textContent = t('rates.stale');
    staleEl.classList.remove('hidden');
  } else {
    staleEl.classList.add('hidden');
  }

  if (refreshBtn) {
    refreshBtn.classList.remove('text-red-400', 'ring-2', 'ring-red-400/50');
  }
}

export function flashRefreshError() {
  const refreshBtn = document.getElementById('refresh-btn');
  if (!refreshBtn) return;
  refreshBtn.classList.add('text-red-400', 'ring-2', 'ring-red-400/50');
  setTimeout(() => {
    refreshBtn.classList.remove('text-red-400', 'ring-2', 'ring-red-400/50');
  }, 1200);
}

/**
 * Called when switching the active card or after removing a currency: avoids redundant
 * network calls if we already have a full rate matrix for the current base.
 */
export async function fetchRatesIfNeeded() {
  const base = store.baseCurrency || store.selected[0];
  if (!base || store.selected.length < 2) return;
  if (hasCompleteRatesForBase(base)) {
    recalculate();
    updateRateLabels();
    updateRateStatusUI();
    return;
  }
  return fetchRates();
}

export async function fetchRates() {
  const svg = document.querySelector('#refresh-btn svg');
  svg?.classList.add('animate-spin');

  const base = store.baseCurrency || store.selected[0];
  if (!base || store.selected.length < 2) {
    svg?.classList.remove('animate-spin');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/${base}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.result !== 'success') {
      throw new Error(data['error-type'] || 'API error');
    }
    const relevant = {};
    store.selected.forEach((c) => {
      if (c !== base && data.rates[c] !== undefined) relevant[c] = data.rates[c];
    });
    store.rates[base] = relevant;
    pruneRatesExcept(base);
    store.ratesLastSuccessAt = Date.now();
    store.ratesFetchError = false;
    hapticSuccess();
    updateTimestamp();
    recalculate();
    updateRateLabels();
    updateRateStatusUI();
  } catch (err) {
    console.error('Failed to fetch rates:', err);
    store.ratesFetchError = true;
    updateRateStatusUI();
    flashRefreshError();
  } finally {
    svg?.classList.remove('animate-spin');
  }
}

export function updateTimestamp() {
  const el = document.getElementById('rate-timestamp');
  if (!el) return;
  const ms = store.ratesLastSuccessAt;
  if (ms == null) {
    el.textContent = t('rates.pending');
    return;
  }
  const relative = formatRelativeSince(ms);
  el.textContent = t('rates.updatedRelative', { relative });
}

/**
 * `store.baseAmount` is always a canonical string (digits + optional one `.`) for parsing;
 * displayed values on non-base cards are formatted with `formatNumber` via Intl.
 */
export function recalculate() {
  if (!store.baseAmount || isNaN(parseFloat(store.baseAmount))) {
    store.selected.forEach((code) => {
      const input = document.querySelector(`.currency-card[data-code="${code}"] .currency-input`);
      if (input && code !== store.baseCurrency) input.value = '';
    });
    return;
  }

  const amount = parseFloat(store.baseAmount);

  store.selected.forEach((code) => {
    if (code === store.baseCurrency) return;
    const input = document.querySelector(`.currency-card[data-code="${code}"] .currency-input`);
    if (!input) return;

    if (store.rates[store.baseCurrency] && store.rates[store.baseCurrency][code]) {
      const converted = amount * store.rates[store.baseCurrency][code];
      input.value = formatNumber(converted, code);
    }
  });
}

/**
 * Updates only the small "1 USD = …" lines when the base currency changes without rebuilding
 * cards (avoids killing input focus — see converter focus handler).
 */
export function updateRateLabels() {
  store.selected.forEach((code) => {
    const card = document.querySelector(`.currency-card[data-code="${code}"]`);
    if (!card) return;
    const rateEl = card.querySelector('.currency-rate');
    if (!rateEl) return;
    const rateText = code === store.baseCurrency ? '' : getRateDisplay(store.baseCurrency, code);
    rateEl.textContent = rateText || '';
    rateEl.classList.toggle('hidden', !rateText);
  });
}
