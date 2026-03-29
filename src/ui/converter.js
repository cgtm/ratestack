/**
 * Converter view: card list, empty state, loading skeleton.
 *
 * `renderConverter()` does a full re-render — simple and sufficient for 2-5 cards.
 * Surgical updates (rate labels, card values) are handled by status.js.
 */
import { store, saveState, hasMinimumCurrencies } from "../data/store.js";
import { refreshRatesIfNeeded, removeCurrencyFromStore } from "../actions.js";
import { recalculateCardValues, updateDisclaimerUI } from "./status.js";
import { createCurrencyCard } from "./cards.js";
import { initDragAndDrop } from "../gestures/drag.js";
import { initSwipeToDismiss } from "../gestures/swipe.js";
import { t } from "../i18n.js";

/* ---------- Mount helpers ---------- */

function getContainer() {
  return document.getElementById("converter");
}

function clearContainer() {
  getContainer().innerHTML = "";
}

function mountRoot(root) {
  clearContainer();
  getContainer().appendChild(root);
}

function setRateInfoVisible(visible) {
  document.getElementById("rate-info")?.classList.toggle("hidden", !visible);
  document
    .getElementById("rate-disclaimer")
    ?.classList.toggle("hidden", !visible);
}

/* ---------- Empty state ---------- */

function buildEmptyState() {
  const wrapper = document.createElement("div");
  wrapper.className =
    "flex flex-col items-center justify-center text-center py-20 gap-3";

  const msg = document.createElement("p");
  msg.className = "main-view-muted text-[15px] leading-relaxed";
  msg.textContent = t("empty.message");

  const btn = document.createElement("button");
  btn.className =
    "text-accent font-semibold text-[15px] underline underline-offset-2 cursor-pointer bg-transparent border-none";
  btn.textContent = t("empty.link");
  btn.addEventListener("click", () => {
    document.getElementById("settings-btn").click();
  });

  wrapper.appendChild(msg);
  wrapper.appendChild(btn);
  return wrapper;
}

export function renderEmptyState() {
  setRateInfoVisible(false);
  mountRoot(buildEmptyState());
}

/* ---------- Loading state ---------- */

const SKEL_CARD_CLASS =
  "rounded-2xl border border-brd bg-surface px-[18px] py-4 animate-pulse";

const SKEL_INNER = `
  <div class="flex items-center justify-between mb-3">
    <div class="flex items-center gap-2.5">
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded bg-brd/80"></div>
        <div class="space-y-1.5">
          <div class="h-4 w-14 rounded bg-brd/80"></div>
          <div class="h-3 w-24 rounded bg-brd/60"></div>
        </div>
      </div>
    </div>
    <div class="flex gap-1">
      <div class="w-8 h-8 rounded bg-brd/60"></div>
      <div class="w-8 h-8 rounded bg-brd/60"></div>
    </div>
  </div>
  <div class="flex items-baseline gap-1">
    <div class="h-4 w-6 rounded bg-brd/60"></div>
    <div class="h-9 flex-1 rounded bg-brd/50"></div>
  </div>
  <div class="h-3 w-32 rounded bg-brd/40 mt-3"></div>
`;

export function renderLoadingState() {
  setRateInfoVisible(true);
  const ts = document.getElementById("rate-timestamp");
  if (ts) ts.textContent = t("rates.pending");

  const wrap = document.createElement("div");
  wrap.className = "flex flex-col gap-3 w-full";
  wrap.setAttribute("aria-busy", "true");
  wrap.setAttribute("aria-label", t("rates.loading"));

  const n = Math.max(2, Math.min(store.selected.length || 3, 5));
  for (let i = 0; i < n; i++) {
    const sk = document.createElement("div");
    sk.className = SKEL_CARD_CLASS;
    sk.setAttribute("aria-hidden", "true");
    sk.innerHTML = SKEL_INNER;
    wrap.appendChild(sk);
  }

  const hint = document.createElement("p");
  hint.className = "text-center text-xs main-view-muted pt-1";
  hint.textContent = t("rates.loading");
  wrap.appendChild(hint);

  mountRoot(wrap);
}

/* ---------- Converter ---------- */

function removeCurrency(code) {
  const { hasMinimum } = removeCurrencyFromStore(code);
  if (hasMinimum) {
    refreshRatesIfNeeded().then(() => {
      renderConverter();
      updateDisclaimerUI();
    });
  } else {
    renderEmptyState();
  }
}

export function renderConverter() {
  setRateInfoVisible(true);
  clearContainer();

  const container = getContainer();
  for (const code of store.selected) {
    container.appendChild(createCurrencyCard(code, removeCurrency));
  }

  recalculateCardValues();
  initDragAndDrop(container);
  initSwipeToDismiss(container, removeCurrency);
}
