/**
 * Per-card value formatting helpers shared between cards.js and status.js.
 * Extracted to avoid a circular dependency (cards → status → cards).
 */
import { hasNativeFormat, formatNative } from "../data/native-format.js";
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
  if (isNative && hasNativeFormat(code, value)) {
    input.value = formatNative(value, code);
    input.readOnly = true;
  } else {
    input.value = formatNumber(value, code);
    input.readOnly = false;
  }
}
