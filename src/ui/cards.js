/**
 * Currency card DOM construction and input event wiring.
 *
 * Cards are built with innerHTML for the static skeleton (all interpolated values
 * come from our own trusted currency catalog and i18n strings, never user input).
 * Dynamic text is set via textContent where practical.
 */
import { CURRENCIES } from "../currencies.js";
import { store } from "../data/store.js";
import {
  getRateDisplay,
  parseLocaleAmount,
  normalizeTypingAmount,
  formatNumber,
} from "../data/numbers.js";
import { refreshRatesIfNeeded } from "../actions.js";
import {
  recalculateCardValues,
  updateRateLabels,
  updateRateStatusUI,
} from "./status.js";
import { hapticSuccess } from "../haptics.js";
import { currencyName, t } from "../i18n.js";
import {
  CLOSE_SVG,
  COPY_SVG,
  GRIP_SVG,
  NATIVE_FORMAT_SVG,
} from "../../assets/ui/icons.js";
import { applyCardFormat, updateNativeFormatBtn } from "./card-format.js";

const CARD_BASE =
  "currency-card border rounded-2xl transition-[border-color,box-shadow] duration-200 relative overflow-hidden";
const CARD_ACTIVE = "border-accent shadow-accent-glow";
const CARD_INACTIVE = "border-brd";
const ACTIVE_CLASSES = CARD_ACTIVE.split(" ");
const INACTIVE_CLASSES = CARD_INACTIVE.split(" ");

function clearActiveStyling() {
  document.querySelectorAll(".currency-card").forEach((c) => {
    c.classList.remove(...ACTIVE_CLASSES);
    c.classList.add(...INACTIVE_CLASSES);
  });
}

function applyActiveStyling(card) {
  card.classList.remove(...INACTIVE_CLASSES);
  card.classList.add(...ACTIVE_CLASSES);
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
          <button type="button" class="native-format-btn hidden shrink-0 self-center text-dim/40 hover:text-dim transition-colors p-1 -mr-1" aria-label="Switch to native number format">
            ${NATIVE_FORMAT_SVG}
          </button>
        </div>
        <span class="currency-rate text-[11px] main-view-muted mt-2 block ${rateText ? "" : "hidden"}">${rateText}</span>
      </div>
    `;
}

function attachInputListeners(card, code, input) {
  input.addEventListener("focus", () => {
    clearActiveStyling();
    applyActiveStyling(card);
    // Reset native mode — base card is always editable in standard format
    if (card.dataset.native === "true") {
      card.dataset.native = "false";
      input.readOnly = false;
      const rawValue = parseFloat(card.dataset.rawValue);
      if (!isNaN(rawValue)) input.value = formatNumber(rawValue, code);
      card
        .querySelector(".native-format-btn")
        ?.setAttribute("aria-label", "Switch to native number format");
    }
    store.baseCurrency = code;
    store.baseAmount = parseLocaleAmount(input.value);
    input.value = store.baseAmount;
    refreshRatesIfNeeded().then(() => {
      recalculateCardValues();
      updateRateLabels();
      updateRateStatusUI();
    });
  });

  input.addEventListener("input", () => {
    const sanitized = normalizeTypingAmount(input.value);
    input.value = sanitized;
    store.baseAmount = sanitized;
    recalculateCardValues();
  });
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

function showCopySuccess(copyBtn, code) {
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
    const text = raw ? `${info.symbol}${raw}` : info.symbol;
    const copyBtn = ev.currentTarget;

    runCopyTapAnimation(copyBtn);

    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => showCopySuccess(copyBtn, code))
        .catch(() => {});
    }
  });
}

/**
 * Creates a fully-wired currency card element.
 * @param {string} code
 * @param {(code: string) => void} onRemove
 */
export function createCurrencyCard(code, onRemove) {
  const info = CURRENCIES[code];
  const isActive = code === store.baseCurrency;
  const rateText = isActive
    ? ""
    : getRateDisplay(store.baseCurrency, code, store.rates);
  const inputLabel = `${currencyName(code)} — ${t("aria.amount")}`;

  const card = document.createElement("div");
  card.className = `${CARD_BASE} ${isActive ? CARD_ACTIVE : CARD_INACTIVE}`;
  card.dataset.code = code;
  card.dataset.native = "false";
  card.tabIndex = 0;
  card.innerHTML = buildCardMarkup({
    info,
    code,
    isActive,
    rateText,
    inputLabel,
  });

  const input = card.querySelector(".currency-input");
  attachInputListeners(card, code, input);
  attachCopyListener(card, code, info);
  card
    .querySelector(".card-close")
    .addEventListener("click", () => onRemove(code));

  const nativeBtn = card.querySelector(".native-format-btn");
  if (nativeBtn) {
    nativeBtn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const isNative = card.dataset.native === "true";
      card.dataset.native = String(!isNative);
      const rawValue = parseFloat(card.dataset.rawValue);
      if (!isNaN(rawValue)) applyCardFormat(card, code, rawValue);
      nativeBtn.setAttribute(
        "aria-label",
        !isNative
          ? "Switch to standard number format"
          : "Switch to native number format",
      );
    });
  }

  return card;
}
