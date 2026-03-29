/**
 * Rate status indicators: timestamp, stale/error/offline banners, refresh button feedback.
 * Also handles recalculating displayed card values and updating rate labels.
 *
 * All functions read from `store` and write to the DOM — no data mutations.
 */
import { store, hasMinimumCurrencies } from "../data/store.js";
import { getRateDisplay, computeConvertedAmounts } from "../data/numbers.js";
import { applyCardFormat, updateNativeFormatBtn } from "./card-format.js";
import { areRatesStale } from "../actions.js";
import { t, numberLocale } from "../i18n.js";

/** Human-readable "2 min ago" using Intl. */
function formatRelativeSince(ms) {
  const rtf = new Intl.RelativeTimeFormat(numberLocale(), { numeric: "auto" });
  const diffSec = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (diffSec < 60) return rtf.format(-diffSec, "second");
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return rtf.format(-diffMin, "minute");
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return rtf.format(-diffHr, "hour");
  const diffDay = Math.floor(diffHr / 24);
  return rtf.format(-diffDay, "day");
}

export function updateTimestamp() {
  const el = document.getElementById("rate-timestamp");
  if (!el) return;
  const ms = store.ratesLastSuccessAt;
  if (ms == null) {
    el.textContent = t("rates.pending");
    return;
  }
  el.textContent = t("rates.updatedRelative", {
    relative: formatRelativeSince(ms),
  });
}

export function updateRateStatusUI() {
  const staleEl = document.getElementById("rate-stale");
  const errEl = document.getElementById("rate-error");
  const offlineEl = document.getElementById("rate-offline");
  const refreshBtn = document.getElementById("refresh-btn");
  if (!staleEl || !errEl) return;

  const online = typeof navigator !== "undefined" ? navigator.onLine : true;

  if (offlineEl) {
    if (!online && hasMinimumCurrencies()) {
      offlineEl.textContent = t("rates.offline");
      offlineEl.classList.remove("hidden");
    } else {
      offlineEl.classList.add("hidden");
    }
  }

  if (store.ratesFetchError && online) {
    errEl.textContent = t("rates.error");
    errEl.classList.remove("hidden");
  } else {
    errEl.classList.add("hidden");
  }

  if (areRatesStale() && hasMinimumCurrencies()) {
    staleEl.textContent = t("rates.stale");
    staleEl.classList.remove("hidden");
  } else {
    staleEl.classList.add("hidden");
  }

  if (refreshBtn) {
    refreshBtn.classList.remove("text-red-400", "ring-2", "ring-red-400/50");
  }
}

export function flashRefreshError() {
  const refreshBtn = document.getElementById("refresh-btn");
  if (!refreshBtn) return;
  refreshBtn.classList.add("text-red-400", "ring-2", "ring-red-400/50");
  setTimeout(() => {
    refreshBtn.classList.remove("text-red-400", "ring-2", "ring-red-400/50");
  }, 1200);
}

/** Set the refresh button spinner. */
export function setRefreshSpinning(spinning) {
  const svg = document.querySelector("#refresh-btn svg");
  if (spinning) svg?.classList.add("animate-spin");
  else svg?.classList.remove("animate-spin");
}

/**
 * Updates input values on all non-base currency cards from store state.
 * Clears non-base inputs when base amount is empty/invalid.
 */
export function recalculateCardValues() {
  const amounts = computeConvertedAmounts(
    store.baseAmount,
    store.baseCurrency,
    store.selected,
    store.rates,
  );

  for (const code of store.selected) {
    if (code === store.baseCurrency) continue;
    const card = document.querySelector(`.currency-card[data-code="${code}"]`);
    if (!card) continue;
    const input = card.querySelector(".currency-input");
    if (!input) continue;

    if (amounts === null) {
      input.value = "";
      card.dataset.rawValue = "";
    } else if (amounts[code] !== undefined) {
      applyCardFormat(card, code, amounts[code]);
      updateNativeFormatBtn(card, code, amounts[code]);
    }
  }
}

const SOURCES = {
  frankfurter: {
    html: 'Used data from <a href="https://frankfurter.dev" target="_blank" rel="noopener" class="underline underline-offset-2">Frankfurter</a> (European Central Bank)',
  },
  "er-api": {
    html: 'Rates by <a href="https://www.exchangerate-api.com" target="_blank" rel="noopener" class="underline underline-offset-2">ExchangeRate-API</a>',
  },
};

export function updateDisclaimerUI() {
  const el = document.getElementById("rate-attribution");
  if (!el) return;
  const source = SOURCES[store.ratesSource];
  if (!source) {
    el.classList.add("hidden");
    return;
  }
  el.innerHTML = source.html;
  el.classList.remove("hidden");
}

/** Updates the "1 USD = …" rate labels without rebuilding cards (preserves focus). */
export function updateRateLabels() {
  for (const code of store.selected) {
    const card = document.querySelector(`.currency-card[data-code="${code}"]`);
    if (!card) continue;
    const rateEl = card.querySelector(".currency-rate");
    if (!rateEl) continue;
    const rateText =
      code === store.baseCurrency
        ? ""
        : getRateDisplay(store.baseCurrency, code, store.rates);
    rateEl.textContent = rateText || "";
    rateEl.classList.toggle("hidden", !rateText);
  }
}
