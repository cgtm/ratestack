/**
 * Main converter UI: builds currency cards, wires input (active = base currency), drag reorder,
 * and swipe-to-remove. Full re-render on `renderConverter` keeps the implementation simple;
 * `updateRateLabels` in api.js is used where we must avoid tearing down the DOM (focus).
 */
import { store, saveState, hasMinimumCurrencies } from "../state.js";
import { recalculate, fetchRatesIfNeeded } from "../api.js";
import {
  getConverterContainer,
  clearConverterContainer,
  setRateInfoVisible,
} from "./mount.js";
import { createCurrencyCard, wireCardGestures } from "./cards.js";
import { renderEmptyState, renderLoadingState } from "./states.js";

function removeCurrency(code) {
  store.selected = store.selected.filter((c) => c !== code);
  if (store.baseCurrency === code) {
    store.baseCurrency = store.selected[0] || "";
  }
  saveState();
  if (hasMinimumCurrencies()) {
    fetchRatesIfNeeded().then(() => renderConverter());
  } else {
    renderEmptyState();
  }
}

export function renderConverter() {
  setRateInfoVisible(true);
  clearConverterContainer();

  const container = getConverterContainer();
  store.selected.forEach((code) => {
    container.appendChild(createCurrencyCard(code, removeCurrency));
  });

  recalculate();
  wireCardGestures(container, removeCurrency);
}

export { renderEmptyState, renderLoadingState };
