/**
 * Settings overlay: open/close, focus trap, Escape, save confirmation,
 * and applying changes after close.
 */
import { store, hasMinimumCurrencies } from "../data/store.js";
import { refreshRates } from "../actions.js";
import { t } from "../i18n.js";
import { syncShellLabels } from "./shell.js";
import { updateTimestamp, updateDisclaimerUI } from "./status.js";
import { renderConverter, renderEmptyState } from "./converter.js";
import { renderLanguagePicker, renderThemePicker } from "./dropdowns.js";
import {
  syncCurrencyHintAndCount,
  renderSelectedStrip,
  renderRegionalList,
} from "./currency-list.js";

let saveTimer = null;
let openSnapshot = null;
let focusTrapHandler = null;
let prevFocus = null;

/* ---------- Save confirmation ---------- */

export function showSaveConfirmation() {
  const el = document.getElementById("settings-saved");
  if (!el) return;
  el.textContent = t("settings.saved");
  el.style.opacity = "1";
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    el.style.opacity = "0";
  }, 1500);
}

/* ---------- Focus trap ---------- */

function getFocusableInPanel(panel) {
  const nodes = panel.querySelectorAll(
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
  );
  return [...nodes].filter((el) => {
    if (el.getAttribute("aria-hidden") === "true") return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  });
}

function trapFocus(panel, e) {
  if (e.key !== "Tab") return;
  const focusables = getFocusableInPanel(panel);
  if (focusables.length === 0) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (e.shiftKey) {
    if (document.activeElement === first) {
      e.preventDefault();
      last.focus();
    }
  } else if (document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

function installKeyHandler(panel) {
  if (focusTrapHandler) {
    document.removeEventListener("keydown", focusTrapHandler);
  }
  focusTrapHandler = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      closeSettings();
      return;
    }
    trapFocus(panel, e);
  };
  document.addEventListener("keydown", focusTrapHandler);
}

/* ---------- Render settings panel contents ---------- */

function renderSettingsPanel() {
  const list = document.getElementById("currency-list");
  list.innerHTML = "";

  syncShellLabels();
  updateTimestamp();
  renderLanguagePicker(() => renderSettingsPanel());
  renderThemePicker();

  syncCurrencyHintAndCount();
  renderSelectedStrip(() => renderSettingsPanel());
  renderRegionalList(list, () => renderSettingsPanel());
}

/* ---------- Open / Close ---------- */

function applyAfterClose(snapshot) {
  const selectedChanged =
    snapshot &&
    JSON.stringify(snapshot.selected) !== JSON.stringify(store.selected);
  const langChanged = snapshot && snapshot.lang !== store.lang;

  if (hasMinimumCurrencies()) {
    store.baseCurrency = store.selected.includes(store.baseCurrency)
      ? store.baseCurrency
      : store.selected[0];
    if (selectedChanged) {
      store.baseAmount = "";
      refreshRates().then(() => {
        renderConverter();
        updateDisclaimerUI();
      });
    } else if (langChanged) {
      renderConverter();
    }
  } else {
    renderEmptyState();
  }
}

export function openSettings() {
  openSnapshot = JSON.stringify({
    selected: store.selected,
    lang: store.lang,
    theme: store.theme,
  });

  renderSettingsPanel();

  const overlay = document.getElementById("settings-overlay");
  const panel = document.getElementById("settings-panel");
  const doneBar = document.getElementById("settings-done")?.parentElement;
  prevFocus = document.activeElement;
  overlay.classList.remove("opacity-0", "invisible", "pointer-events-none");
  panel.classList.remove("translate-y-full");
  doneBar?.classList.remove("translate-y-full");

  installKeyHandler(panel);
  requestAnimationFrame(() => {
    const focusables = getFocusableInPanel(panel);
    (focusables[0] || document.getElementById("settings-close"))?.focus();
  });
}

export function closeSettings() {
  const overlay = document.getElementById("settings-overlay");
  const panel = document.getElementById("settings-panel");
  const doneBar = document.getElementById("settings-done")?.parentElement;
  overlay.classList.add("opacity-0", "invisible", "pointer-events-none");
  panel.classList.add("translate-y-full");
  doneBar?.classList.add("translate-y-full");

  if (focusTrapHandler) {
    document.removeEventListener("keydown", focusTrapHandler);
    focusTrapHandler = null;
  }

  if (prevFocus && typeof prevFocus.focus === "function") {
    prevFocus.focus();
  }
  prevFocus = null;

  let snap = null;
  if (openSnapshot) {
    try {
      snap = JSON.parse(openSnapshot);
    } catch {
      /* ignore */
    }
  }
  openSnapshot = null;

  applyAfterClose(snap);
}
