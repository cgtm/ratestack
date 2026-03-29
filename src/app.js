/**
 * Application entry: restore persisted state, apply theme and language, wire global UI,
 * register the service worker, and load the converter or empty state.
 */
import { store, loadState, hasMinimumCurrencies } from "./data/store.js";
import { resetNumberCache } from "./data/numbers.js";
import { refreshRates } from "./actions.js";
import {
  renderConverter,
  renderEmptyState,
  renderLoadingState,
} from "./ui/converter.js";
import {
  updateRateStatusUI,
  updateTimestamp,
  updateDisclaimerUI,
  recalculateCardValues,
  updateRateLabels,
  setRefreshSpinning,
  flashRefreshError,
} from "./ui/status.js";
import {
  injectShellIcons,
  syncShellLabels,
  showUpdateBanner,
} from "./ui/shell.js";
import { openSettings, closeSettings } from "./ui/settings.js";
import { applyTheme } from "./theme.js";
import { setLang } from "./i18n.js";

const RATE_STATUS_REFRESH_MS = 60 * 1000;

/* ---------- Bootstrap ---------- */

function bootstrap() {
  loadState();
  applyTheme(store.theme);
  setLang(store.lang);
  document.documentElement.lang = store.lang;
  injectShellIcons();
  syncShellLabels();
}

bootstrap();

/* ---------- Rate fetch with UI feedback ---------- */

async function fetchWithSpinner() {
  setRefreshSpinning(true);
  const result = await refreshRates();
  setRefreshSpinning(false);
  if (result.error) flashRefreshError();
  updateRateStatusUI();
  updateTimestamp();
  updateDisclaimerUI();
  return result;
}

/* ---------- Settings chrome ---------- */

function wireSettingsChrome() {
  document
    .getElementById("settings-btn")
    .addEventListener("click", openSettings);
  document
    .getElementById("settings-close")
    .addEventListener("click", closeSettings);
  document
    .getElementById("settings-done")
    .addEventListener("click", closeSettings);
  document.getElementById("settings-overlay").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeSettings();
  });
}

/* ---------- Refresh button ---------- */

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
    fetchWithSpinner();
  });
}

/* ---------- Service worker ---------- */

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

/* ---------- Initial view ---------- */

function bootstrapInitialView() {
  if (hasMinimumCurrencies()) {
    renderLoadingState();
    updateRateStatusUI();
    updateTimestamp();
    fetchWithSpinner().then(() => {
      renderConverter();
      updateRateStatusUI();
      updateTimestamp();
    });
  } else {
    renderEmptyState();
  }
}

/* ---------- Global listeners ---------- */

function refreshRateStatusAndTime() {
  updateRateStatusUI();
  updateTimestamp();
}

function onWindowLanguageChange() {
  resetNumberCache();
  refreshRateStatusAndTime();
  if (hasMinimumCurrencies()) {
    recalculateCardValues();
    updateRateLabels();
  }
}

function wireGlobalListeners() {
  window.addEventListener("online", refreshRateStatusAndTime);
  window.addEventListener("offline", refreshRateStatusAndTime);
  window.addEventListener("languagechange", onWindowLanguageChange);
  setInterval(refreshRateStatusAndTime, RATE_STATUS_REFRESH_MS);

  // Re-apply theme when OS dark/light preference changes (for "auto" theme)
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", () => {
      if (store.theme === "auto") applyTheme("auto");
    });
}

/* ---------- Wire everything ---------- */

wireSettingsChrome();
wireRefreshButton();
registerServiceWorker();
bootstrapInitialView();
wireGlobalListeners();
