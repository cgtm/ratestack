/**
 * Per-card value formatting helpers shared between cards.js and status.js.
 * Extracted to avoid a circular dependency (cards → status → cards).
 */
import {
  hasNativeFormat,
  formatNative,
  hasCurrencyUnit,
} from "../data/native-format.js";
import { formatNumber } from "../data/numbers.js";

/**
 * Show or hide the native format button based on whether the value differs in native form.
 * @param {HTMLElement} card
 * @param {string} code
 * @param {number} value
 */
export function updateNativeFormatBtn(card, code, value) {
  const btn = card.querySelector(".native-format-btn");
  if (!btn) return;
  btn.classList.toggle("hidden", !hasNativeFormat(code, value));
}

/**
 * Apply the correct formatted value to the card input, respecting native mode.
 * Stores the raw numeric value on card.dataset.rawValue for later recovery.
 * @param {HTMLElement} card
 * @param {string} code
 * @param {number} value
 */
export function applyCardFormat(card, code, value) {
  const input = card.querySelector(".currency-input");
  if (!input) return;
  card.dataset.rawValue = String(value);
  const isNative = card.dataset.native === "true";
  const nativeActive = isNative && hasNativeFormat(code, value);

  if (nativeActive) {
    input.value = formatNative(value, code);
    input.readOnly = true;
  } else {
    input.value = formatNumber(value, code);
    input.readOnly = false;
  }

  // Suppress the symbol when the currency unit is appended to the value instead.
  // Use opacity-0 not hidden to avoid a content/layout shift.
  const symbol = card.querySelector(".card-symbol");
  if (symbol) {
    symbol.classList.toggle("opacity-0", nativeActive && hasCurrencyUnit(code));
  }

  fitInputFontSize(input, nativeActive);
}

const FONT_SIZE_MAX = 32;
const FONT_SIZE_MIN = 14;

/**
 * Shrink the input font size until the text fits within its container.
 * Only active in native mode where values are genuinely long.
 * Resets to the CSS default when not in native mode.
 */
function fitInputFontSize(input, nativeActive) {
  if (!nativeActive) {
    input.style.fontSize = "";
    return;
  }
  input.style.fontSize = "";
  if (input.scrollWidth <= input.clientWidth) return;
  input.style.fontSize = `${FONT_SIZE_MAX}px`;
  for (let size = FONT_SIZE_MAX; size > FONT_SIZE_MIN; size--) {
    if (input.scrollWidth <= input.clientWidth) break;
    input.style.fontSize = `${size - 1}px`;
  }
}
