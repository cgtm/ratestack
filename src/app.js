/**
 * Application entry: restore persisted state, apply theme and language, wire global UI,
 * register the service worker, and load the converter or empty state.
 *
 * Why `loadState` / `setLang` / `syncShellLabels` run before listeners: the shell must
 * show correct copy (tagline, aria-labels) and theme colors before first paint as much as possible.
 */
import { store, loadState, hasMinimumCurrencies } from "./state.js";
import {
  fetchRates,
  updateRateStatusUI,
  updateTimestamp,
  recalculate,
  updateRateLabels,
} from "./api.js";
import {
  renderConverter,
  renderEmptyState,
  renderLoadingState,
} from "./converter.js";
import { openSettings, closeSettings, syncShellLabels } from "./settings.js";
import { applyTheme } from "./theme.js";
import { setLang, t } from "./i18n.js";

import {
  SHELL_SETTINGS_GEAR_SVG,
  SHELL_REFRESH_SVG,
  SHELL_CLOSE_SVG,
  SHELL_LANGUAGE_GLOBE_SVG,
  SHELL_THEME_SWATCH_SVG,
  SHELL_CURRENCIES_BANKNOTE_SVG,
} from "../assets/ui/icons.js";

const RATE_STATUS_REFRESH_MS = 60 * 1000;

/** Fills `index.html` placeholder spans from `assets/ui/icons.js`. */
function injectShellIcons() {
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

function bootstrapShell() {
  loadState();
  applyTheme(store.theme);
  setLang(store.lang);
  document.documentElement.lang = store.lang;
  syncShellLabels();
}

injectShellIcons();
bootstrapShell();

function refreshRateStatusAndTime() {
  updateRateStatusUI();
  updateTimestamp();
}

/** Shown when a new SW takes control; we avoid auto-reload so the user is not interrupted mid-edit. */
function showUpdateBanner() {
  const el = document.getElementById("update-banner");
  if (!el) return;
  el.classList.remove("hidden");

  const reloadBtn = el.querySelector("#update-reload");
  if (reloadBtn) {
    reloadBtn.textContent = t("update.reload");
    reloadBtn.onclick = () => {
      window.location.reload();
    };
  }

  const msg = el.querySelector("#update-banner-text");
  if (msg) msg.textContent = t("update.banner");
}

function wireSettingsChrome() {
  document
    .getElementById("settings-btn")
    .addEventListener("click", openSettings);
  document
    .getElementById("settings-close")
    .addEventListener("click", closeSettings);
  document.getElementById("settings-overlay").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeSettings();
  });
}

function acknowledgeRefreshTap() {
  const btn = document.getElementById("refresh-btn");
  if (!btn) return;
  btn.classList.remove("refresh-tap-anim");
  void btn.offsetWidth;
  btn.classList.add("refresh-tap-anim");
  const done = () => {
    btn.classList.remove("refresh-tap-anim");
    btn.removeEventListener("animationend", done);
  };
  btn.addEventListener("animationend", done);
}

function wireRefreshButton() {
  document.getElementById("refresh-btn").addEventListener("click", () => {
    acknowledgeRefreshTap();
    fetchRates();
  });
}

/**
 * First `controllerchange` fires when this page first gets a controlling SW — skip banner.
 * Later `controllerchange` means a new worker replaced the old one (deploy); show banner.
 */
function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  let swControlledOnce = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!navigator.serviceWorker.controller) return;
    if (!swControlledOnce) {
      swControlledOnce = true;
      return;
    }
    showUpdateBanner();
  });

  navigator.serviceWorker.register("sw.js").then((reg) => {
    reg.update();
  });
}

function bootstrapInitialView() {
  if (hasMinimumCurrencies()) {
    renderLoadingState();
    refreshRateStatusAndTime();
    fetchRates().then(() => {
      renderConverter();
      refreshRateStatusAndTime();
    });
  } else {
    renderEmptyState();
  }
}

/** OS / browser locale changed — refresh Intl-based numbers and “rates updated …” without reload. */
function onWindowLanguageChange() {
  refreshRateStatusAndTime();
  if (hasMinimumCurrencies()) {
    recalculate();
    updateRateLabels();
  }
}

function wireGlobalListeners() {
  window.addEventListener("online", refreshRateStatusAndTime);
  window.addEventListener("offline", refreshRateStatusAndTime);
  window.addEventListener("languagechange", onWindowLanguageChange);
  setInterval(() => refreshRateStatusAndTime(), RATE_STATUS_REFRESH_MS);
}

wireSettingsChrome();
wireRefreshButton();
registerServiceWorker();
bootstrapInitialView();
wireGlobalListeners();
