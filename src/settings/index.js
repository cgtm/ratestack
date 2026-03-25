/**
 * Settings sheet: currency toggles (grouped by region + selected strip), theme/language dropdowns,
 * and accessibility (focus trap, Escape). Closing compares a snapshot to avoid refetching or
 * clearing the typed amount when nothing material changed.
 */
import { updateTimestamp } from "../api.js";
import { t } from "../i18n.js";
import { renderLanguagePicker, renderThemePicker } from "./dropdowns.js";
import {
  syncCurrencyHintAndCount,
  renderSelectedCurrencyStrip,
  renderRegionalCurrencyList,
} from "./currency.js";
import { openSettings as openSettingsInner, closeSettings } from "./overlay.js";

function setTextById(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function setAriaLabelById(id, label) {
  document.getElementById(id)?.setAttribute("aria-label", label);
}

export function renderSettings() {
  const list = document.getElementById("currency-list");
  list.innerHTML = "";

  syncShellLabels();
  renderLanguagePicker(() => renderSettings());
  renderThemePicker();

  syncCurrencyHintAndCount();
  renderSelectedCurrencyStrip(() => renderSettings());
  renderRegionalCurrencyList(list, () => renderSettings());
}

/**
 * Applies i18n to shell chrome (header tagline, settings panel labels, main aria-labels, disclaimer).
 * Not limited to the settings sheet — runs on boot and whenever the settings UI re-renders.
 */
export function syncShellLabels() {
  setTextById("app-tagline", t("app.tagline"));
  setTextById("settings-title", t("settings.title"));
  setTextById("theme-label", t("theme.section"));
  setTextById("language-label", t("language.section"));
  setTextById("currencies-label", t("settings.currencies"));

  setAriaLabelById("settings-close", t("aria.close"));
  setAriaLabelById("settings-btn", t("aria.settings"));
  setAriaLabelById("refresh-btn", t("aria.refresh"));

  setTextById("rate-disclaimer", t("rates.disclaimer"));

  updateTimestamp();
}

export function openSettings() {
  openSettingsInner(renderSettings);
}

export { closeSettings };
