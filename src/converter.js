/**
 * Main converter UI: builds currency cards, wires input (active = base currency), drag reorder,
 * and swipe-to-remove. Full re-render on `renderConverter` keeps the implementation simple;
 * `updateRateLabels` in api.js is used where we must avoid tearing down the DOM (focus).
 */
import { CURRENCIES } from "./currencies.js";
import {
  store,
  saveState,
  getRateDisplay,
  parseLocaleAmountString,
  normalizeTypingAmount,
  hasMinimumCurrencies,
} from "./state.js";
import { recalculate, updateRateLabels, fetchRatesIfNeeded } from "./api.js";
import { hapticSuccess } from "./haptics.js";
import { initDragAndDrop } from "./drag.js";
import { initSwipeToDismiss } from "./swipe.js";
import { currencyName, t } from "./i18n.js";
import { CLOSE_SVG, COPY_SVG, GRIP_SVG } from "../assets/ui/card-icons.js";

// ---------------------------------------------------------------------------
// Card class tokens
// ---------------------------------------------------------------------------

const CARD_BASE =
  "currency-card border rounded-2xl transition-[border-color,box-shadow] duration-200 relative overflow-hidden";
const CARD_ACTIVE = "border-accent shadow-accent-glow";
const CARD_INACTIVE = "border-brd";
const ACTIVE_CLASSES = CARD_ACTIVE.split(" ");
const INACTIVE_CLASSES = CARD_INACTIVE.split(" ");

const LOADING_SKEL_CARD =
  "rounded-2xl border border-brd bg-surface px-[18px] py-4 animate-pulse";

// ---------------------------------------------------------------------------
// DOM: converter mount + rate row visibility
// ---------------------------------------------------------------------------

function getConverterContainer() {
  return document.getElementById("converter");
}

function clearConverterContainer() {
  getConverterContainer().innerHTML = "";
}

/** Replace main content with a single root node (empty / loading states). */
function mountConverterRoot(root) {
  clearConverterContainer();
  getConverterContainer().appendChild(root);
}

function setRateInfoVisible(visible) {
  const rate = document.getElementById("rate-info");
  if (rate) rate.classList.toggle("hidden", !visible);
  document
    .getElementById("rate-disclaimer")
    ?.classList.toggle("hidden", !visible);
}

function setRateTimestampPending() {
  const ts = document.getElementById("rate-timestamp");
  if (ts) ts.textContent = t("rates.pending");
}

// ---------------------------------------------------------------------------
// Currency cards: markup
// ---------------------------------------------------------------------------

function cardClassName(isActive) {
  return `${CARD_BASE} ${isActive ? CARD_ACTIVE : CARD_INACTIVE}`;
}

function buildCardMarkup({ info, code, isActive, rateText, inputLabel }) {
  return `
      <div class="swipe-delete-zone absolute inset-0 flex items-center justify-end text-white font-semibold text-[13px] pr-6 select-none opacity-0"
           data-remove="${t("card.remove")}" data-removing="${t("card.removing")}">
        ${t("card.remove")}
      </div>
      <div class="card-content relative z-[1] bg-surface px-[18px] py-4 touch-pan-y">
        <div class="card-top flex items-center justify-between mb-2">
          <div class="flex items-center gap-2.5">
            <span class="drag-handle touch-none cursor-grab active:cursor-grabbing transition-colors p-1 -ml-1" tabindex="-1" role="img" aria-label="${t("aria.dragReorder")}">${GRIP_SVG}</span>
            <span class="text-[28px] leading-none">${info.flag}</span>
            <div>
              <span class="text-lg font-semibold tracking-[0.5px]">${code}</span>
              <span class="text-xs text-dim font-normal ml-1">${currencyName(code)}</span>
            </div>
          </div>
          <div class="flex items-center shrink-0 gap-0.5">
            <button type="button" class="card-copy rounded-md text-dim/60 hover:text-main transition-[color,background-color,box-shadow] duration-200 p-1" aria-label="${t("aria.copyValue", { code })}">
              ${COPY_SVG}
            </button>
            <button type="button" class="card-close text-dim/60 hover:text-main transition-colors p-1 -mr-1" aria-label="${t("aria.removeCurrency", { code })}">
              ${CLOSE_SVG}
            </button>
          </div>
        </div>
        <div class="flex items-baseline gap-1">
          <span class="text-[32px] font-semibold text-dim select-none">${info.symbol}</span>
          <input
            class="currency-input flex-1 min-w-0 bg-transparent border-none outline-none text-main text-[32px] font-semibold font-sans tracking-[-0.5px] caret-accent placeholder:text-brd"
            type="text"
            inputmode="decimal"
            placeholder="0"
            aria-label="${inputLabel}"
            ${isActive && store.baseAmount ? `value="${store.baseAmount}"` : ""}
          >
        </div>
        <span class="currency-rate text-[11px] main-view-muted mt-2 block ${rateText ? "" : "hidden"}">${rateText}</span>
      </div>
    `;
}

// ---------------------------------------------------------------------------
// Currency cards: active / focus / base sync
// ---------------------------------------------------------------------------

function clearActiveStylingFromAllCards() {
  document.querySelectorAll(".currency-card").forEach((c) => {
    c.classList.remove(...ACTIVE_CLASSES);
    c.classList.add(...INACTIVE_CLASSES);
  });
}

function applyActiveStyling(card) {
  card.classList.remove(...INACTIVE_CLASSES);
  card.classList.add(...ACTIVE_CLASSES);
}

function syncBaseFromInputAndRefetch(input, code) {
  store.baseCurrency = code;
  store.baseAmount = parseLocaleAmountString(input.value);
  input.value = store.baseAmount;
  fetchRatesIfNeeded().then(() => {
    recalculate();
    updateRateLabels();
  });
}

function attachInputListeners(card, code, input) {
  input.addEventListener("focus", () => {
    clearActiveStylingFromAllCards();
    applyActiveStyling(card);
    syncBaseFromInputAndRefetch(input, code);
  });

  input.addEventListener("input", () => {
    const sanitized = normalizeTypingAmount(input.value);
    input.value = sanitized;
    store.baseAmount = sanitized;
    recalculate();
  });
}

// ---------------------------------------------------------------------------
// Currency cards: copy + close
// ---------------------------------------------------------------------------

function copyPayloadText(symbol, rawTrimmed) {
  return rawTrimmed ? `${symbol}${rawTrimmed}` : symbol;
}

function runCopyTapAnimation(copyBtn) {
  copyBtn.classList.remove("card-copy-tap-anim");
  void copyBtn.offsetWidth;
  copyBtn.classList.add("card-copy-tap-anim");
  const endTap = () => {
    copyBtn.classList.remove("card-copy-tap-anim");
    copyBtn.removeEventListener("animationend", endTap);
  };
  copyBtn.addEventListener("animationend", endTap);
}

function showCopySuccessOnButton(copyBtn, code) {
  hapticSuccess();
  copyBtn.classList.add("card-copy-done");
  clearTimeout(copyBtn._copyDoneTimer);
  copyBtn._copyDoneTimer = setTimeout(() => {
    copyBtn.classList.remove("card-copy-done");
  }, 1500);
  copyBtn.setAttribute("aria-label", t("card.copied"));
  setTimeout(
    () => copyBtn.setAttribute("aria-label", t("aria.copyValue", { code })),
    1500,
  );
}

function attachCopyListener(card, code, info) {
  card.querySelector(".card-copy").addEventListener("click", (ev) => {
    ev.stopPropagation();
    const inp = card.querySelector(".currency-input");
    const raw = (inp?.value || "").trim();
    const text = copyPayloadText(info.symbol, raw);
    const copyBtn = ev.currentTarget;

    runCopyTapAnimation(copyBtn);

    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => showCopySuccessOnButton(copyBtn, code))
        .catch(() => {});
    }
  });
}

function attachCloseListener(card, code) {
  card
    .querySelector(".card-close")
    .addEventListener("click", () => removeCurrency(code));
}

function attachCardListeners(card, code, info) {
  const input = card.querySelector(".currency-input");
  attachInputListeners(card, code, input);
  attachCloseListener(card, code);
  attachCopyListener(card, code, info);
}

function createCurrencyCard(code) {
  const info = CURRENCIES[code];
  const isActive = code === store.baseCurrency;
  const rateText = isActive ? "" : getRateDisplay(store.baseCurrency, code);
  const inputLabel = `${currencyName(code)} — ${t("aria.amount")}`;

  const card = document.createElement("div");
  card.className = cardClassName(isActive);
  card.dataset.code = code;
  card.tabIndex = 0;
  card.innerHTML = buildCardMarkup({
    info,
    code,
    isActive,
    rateText,
    inputLabel,
  });

  attachCardListeners(card, code, info);
  return card;
}

// ---------------------------------------------------------------------------
// Removal + main list render
// ---------------------------------------------------------------------------

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
    container.appendChild(createCurrencyCard(code));
  });

  recalculate();
  // Guards inside these ensure listeners attach once per container despite re-renders.
  initDragAndDrop(container);
  initSwipeToDismiss(container, removeCurrency);
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function buildEmptyStateContent() {
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
  mountConverterRoot(buildEmptyStateContent());
}

// ---------------------------------------------------------------------------
// Loading state (skeleton placeholders)
// ---------------------------------------------------------------------------

function loadingSkeletonCardCount() {
  return Math.max(2, Math.min(store.selected.length || 3, 5));
}

function buildLoadingSkeletonInnerHtml() {
  return `
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
}

function buildLoadingStateContent() {
  const wrap = document.createElement("div");
  wrap.className = "flex flex-col gap-3 w-full";
  wrap.setAttribute("aria-busy", "true");
  wrap.setAttribute("aria-label", t("rates.loading"));

  const n = loadingSkeletonCardCount();
  for (let i = 0; i < n; i++) {
    const sk = document.createElement("div");
    sk.className = LOADING_SKEL_CARD;
    sk.setAttribute("aria-hidden", "true");
    sk.innerHTML = buildLoadingSkeletonInnerHtml();
    wrap.appendChild(sk);
  }

  const hint = document.createElement("p");
  hint.className = "text-center text-xs main-view-muted pt-1";
  hint.textContent = t("rates.loading");
  wrap.appendChild(hint);

  return wrap;
}

export function renderLoadingState() {
  setRateInfoVisible(true);
  setRateTimestampPending();
  mountConverterRoot(buildLoadingStateContent());
}
