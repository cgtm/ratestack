/**
 * Settings overlay: focus trap, Escape, open/close, save confirmation pulse, and applying
 * changes after close (rates refetch vs. converter re-render).
 */
import { store, hasMinimumCurrencies } from "../state.js";
import { fetchRates } from "../api.js";
import { renderConverter, renderEmptyState } from "../converter.js";
import { t } from "../i18n.js";

let saveTimer = null;
let settingsOpenSnapshot = null;
let settingsFocusTrapHandler = null;
let settingsOpenPrevFocus = null;

/** Single in-place confirmation; timer coalesces rapid toggles into one visible pulse. */
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

/** Cycle Tab within the panel instead of sending focus to the main view underneath. */
function trapSettingsFocus(panel, e) {
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

function installSettingsKeyHandler(panel) {
  if (settingsFocusTrapHandler) {
    document.removeEventListener("keydown", settingsFocusTrapHandler);
  }
  settingsFocusTrapHandler = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      closeSettings();
      return;
    }
    trapSettingsFocus(panel, e);
  };
  document.addEventListener("keydown", settingsFocusTrapHandler);
}

function focusFirstSettingsControl(panel) {
  requestAnimationFrame(() => {
    const focusables = getFocusableInPanel(panel);
    (focusables[0] || document.getElementById("settings-close"))?.focus();
  });
}

function parseSettingsSnapshot(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function applyAfterSettingsClose(snapshot) {
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
      fetchRates().then(() => renderConverter());
    } else if (langChanged) {
      renderConverter();
    }
  } else {
    renderEmptyState();
  }
}

/**
 * @param {() => void} renderSettingsPanel
 */
export function openSettings(renderSettingsPanel) {
  settingsOpenSnapshot = JSON.stringify({
    selected: store.selected,
    lang: store.lang,
    theme: store.theme,
  });
  renderSettingsPanel();
  const overlay = document.getElementById("settings-overlay");
  const panel = document.getElementById("settings-panel");
  settingsOpenPrevFocus = document.activeElement;
  overlay.classList.remove("opacity-0", "invisible", "pointer-events-none");
  panel.classList.remove("translate-y-full");

  installSettingsKeyHandler(panel);
  focusFirstSettingsControl(panel);
}

export function closeSettings() {
  const overlay = document.getElementById("settings-overlay");
  const panel = document.getElementById("settings-panel");
  overlay.classList.add("opacity-0", "invisible", "pointer-events-none");
  panel.classList.add("translate-y-full");

  if (settingsFocusTrapHandler) {
    document.removeEventListener("keydown", settingsFocusTrapHandler);
    settingsFocusTrapHandler = null;
  }

  if (
    settingsOpenPrevFocus &&
    typeof settingsOpenPrevFocus.focus === "function"
  ) {
    settingsOpenPrevFocus.focus();
  }
  settingsOpenPrevFocus = null;

  const snap = parseSettingsSnapshot(settingsOpenSnapshot);
  settingsOpenSnapshot = null;

  applyAfterSettingsClose(snap);
}
