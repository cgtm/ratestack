/**
 * Shell chrome: icon injection, i18n label sync, and update banner.
 * These operations target the static HTML skeleton in index.html.
 */
import { t } from "../i18n.js";
import {
  SHELL_SETTINGS_GEAR_SVG,
  SHELL_REFRESH_SVG,
  SHELL_CLOSE_SVG,
  SHELL_LANGUAGE_GLOBE_SVG,
  SHELL_THEME_SWATCH_SVG,
  SHELL_CURRENCIES_BANKNOTE_SVG,
} from "../../assets/ui/icons.js";

/** Fills index.html placeholder spans with inline SVGs to avoid extra HTTP requests. */
export function injectShellIcons() {
  const slots = [
    ["shell-icon-settings-gear", SHELL_SETTINGS_GEAR_SVG],
    ["shell-icon-refresh", SHELL_REFRESH_SVG],
    ["shell-icon-settings-close", SHELL_CLOSE_SVG],
    ["shell-icon-language", SHELL_LANGUAGE_GLOBE_SVG],
    ["shell-icon-theme", SHELL_THEME_SWATCH_SVG],
    ["shell-icon-currencies", SHELL_CURRENCIES_BANKNOTE_SVG],
  ];
  for (const [id, svg] of slots) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = svg;
  }
}

function setTextById(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function setAriaLabelById(id, label) {
  document.getElementById(id)?.setAttribute("aria-label", label);
}

/** Applies i18n to shell chrome — header tagline, settings labels, aria-labels, disclaimer. */
export function syncShellLabels() {
  setTextById("app-tagline", t("app.tagline"));
  setTextById("settings-title", t("settings.title"));
  setTextById("theme-label", t("theme.section"));
  setTextById("language-label", t("language.section"));
  setTextById("currencies-label", t("settings.currencies"));

  setTextById("settings-done", t("settings.done"));
  setAriaLabelById("settings-close", t("aria.close"));
  setAriaLabelById("settings-btn", t("aria.settings"));
  setAriaLabelById("refresh-btn", t("aria.refresh"));

  setTextById("rate-disclaimer", t("rates.disclaimer"));
}

/** Shows a non-intrusive banner when a new service worker takes control. */
export function showUpdateBanner() {
  const el = document.getElementById("update-banner");
  if (!el) return;
  el.classList.remove("hidden");

  const reloadBtn = el.querySelector("#update-reload");
  if (reloadBtn) {
    reloadBtn.textContent = t("update.reload");
    reloadBtn.onclick = () => window.location.reload();
  }

  const msg = el.querySelector("#update-banner-text");
  if (msg) msg.textContent = t("update.banner");
}
