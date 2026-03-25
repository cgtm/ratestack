/**
 * Converter mount point and rate row visibility helpers.
 */
import { t } from "../i18n.js";

export function getConverterContainer() {
  return document.getElementById("converter");
}

export function clearConverterContainer() {
  getConverterContainer().innerHTML = "";
}

/** Replace main content with a single root node (empty / loading states). */
export function mountConverterRoot(root) {
  clearConverterContainer();
  getConverterContainer().appendChild(root);
}

export function setRateInfoVisible(visible) {
  const rate = document.getElementById("rate-info");
  if (rate) rate.classList.toggle("hidden", !visible);
  document
    .getElementById("rate-disclaimer")
    ?.classList.toggle("hidden", !visible);
}

export function setRateTimestampPending() {
  const ts = document.getElementById("rate-timestamp");
  if (ts) ts.textContent = t("rates.pending");
}
