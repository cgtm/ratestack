/**
 * Settings sheet: currency toggles (grouped by region + selected strip), theme/language dropdowns,
 * and accessibility (focus trap, Escape). Closing compares a snapshot to avoid refetching or
 * clearing the typed amount when nothing material changed.
 */
import { CURRENCIES, CURRENCY_REGIONS } from "./currencies.js";
import { store, saveState, hasMinimumCurrencies } from "./state.js";
import { fetchRates, updateTimestamp } from "./api.js";
import { renderConverter, renderEmptyState } from "./converter.js";
import { THEMES, applyTheme } from "./theme.js";
import { t, currencyName, regionName, LANGUAGES, setLang } from "./i18n.js";
import { CHEVRON_SVG } from "../assets/ui/chevron.js";

const DROPDOWN_TOGGLE_CLASS =
  "w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 border-brd bg-bg cursor-pointer transition-[border-color] duration-200 hover:border-accent";
const DROPDOWN_LISTBOX_CLASS =
  "absolute left-0 right-0 top-full mt-1 bg-surface border border-brd rounded-xl overflow-hidden z-10 hidden";
const DROPDOWN_OPTION_CLASS =
  "w-full flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-colors duration-150";

let saveTimer = null;
let settingsOpenSnapshot = null;
let settingsFocusTrapHandler = null;
let settingsOpenPrevFocus = null;

/** Single in-place confirmation; timer coalesces rapid toggles into one visible pulse. */
function showSaveConfirmation() {
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

function setTextById(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function setAriaLabelById(id, label) {
  document.getElementById(id)?.setAttribute("aria-label", label);
}

function langOptionHTML(lang) {
  return `
    <span class="text-lg shrink-0">${lang.flag}</span>
    <span class="text-[13px] font-medium text-main">${lang.label}</span>
  `;
}

function themeOptionHTML(key, theme) {
  const bg = theme.colors.bg;
  const accent = theme.colors.accent;
  const secondary = theme.colors["accent-secondary"];
  return `
    <div class="flex -space-x-1.5 shrink-0">
      <div class="w-5 h-5 rounded-full border-2" style="background:${accent}; border-color:${bg}"></div>
      <div class="w-5 h-5 rounded-full border-2" style="background:${secondary}; border-color:${bg}"></div>
    </div>
    <span class="text-[13px] font-medium text-main">${t("theme." + key)}</span>
  `;
}

/**
 * Shared listbox open/close: aria-expanded, chevron rotation, outside click to close.
 * @param {string} chevronSelector  e.g. '.lang-chevron'
 */
function attachDropdownBehavior(toggle, dropdown, chevronSelector) {
  function openDropdown() {
    dropdown.classList.remove("hidden");
    toggle.setAttribute("aria-expanded", "true");
    toggle.querySelector(chevronSelector).style.transform = "rotate(180deg)";
    // Defer outside-click so the same gesture that opened does not close immediately.
    setTimeout(
      () => document.addEventListener("click", closeDropdown, { once: true }),
      0,
    );
  }

  function closeDropdown() {
    dropdown.classList.add("hidden");
    toggle.setAttribute("aria-expanded", "false");
    toggle.querySelector(chevronSelector).style.transform = "";
  }

  toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    if (dropdown.classList.contains("hidden")) openDropdown();
    else closeDropdown();
  });
}

function buildListboxDropdownShell(listId) {
  const wrapper = document.createElement("div");
  wrapper.className = "relative";

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = DROPDOWN_TOGGLE_CLASS;
  toggle.setAttribute("aria-haspopup", "listbox");
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-controls", listId);

  const dropdown = document.createElement("div");
  dropdown.id = listId;
  dropdown.setAttribute("role", "listbox");
  dropdown.className = DROPDOWN_LISTBOX_CLASS;

  return { wrapper, toggle, dropdown };
}

function createCurrencyOptionElement(code) {
  const info = CURRENCIES[code];
  if (!info) return null;
  const isSelected = store.selected.includes(code);
  const atMax = store.selected.length >= 5 && !isSelected;

  const opt = document.createElement("div");
  opt.setAttribute("role", "checkbox");
  opt.setAttribute("aria-checked", isSelected ? "true" : "false");
  opt.tabIndex = 0;
  opt.className = [
    "flex items-center gap-3 px-3.5 py-3 border rounded-xl cursor-pointer",
    "transition-[border-color,opacity] duration-200 select-none",
    isSelected
      ? "border-accent bg-[var(--color-accent-bg)]"
      : "border-brd bg-bg",
    atMax ? "opacity-[0.35] !cursor-not-allowed" : "",
  ].join(" ");

  opt.innerHTML = `
      <span class="text-2xl">${info.flag}</span>
      <div class="flex-1">
        <div class="text-[15px] font-semibold">${code}</div>
        <div class="text-xs text-dim">${currencyName(code)}</div>
      </div>
      <div class="w-[22px] h-[22px] rounded-md border-2 ${isSelected ? "bg-accent border-accent" : "border-brd"} flex items-center justify-center transition-[background,border-color] duration-200 shrink-0">
        <svg class="${isSelected ? "opacity-100" : "opacity-0"} transition-opacity duration-150" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>
    `;

  function toggleSelection() {
    if (!isSelected && atMax) return;

    if (isSelected) {
      store.selected = store.selected.filter((c) => c !== code);
    } else {
      store.selected.push(code);
    }

    saveState();
    renderSettings();
    showSaveConfirmation();
  }

  opt.addEventListener("click", toggleSelection);
  opt.addEventListener("keydown", (e) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      toggleSelection();
    }
  });

  return opt;
}

function syncCurrencyHintAndCount() {
  const hint = document.querySelector("#settings-panel .settings-hint");
  if (hint) {
    hint.textContent =
      store.selected.length < 2
        ? t("settings.hintMore", { count: 2 - store.selected.length })
        : t("settings.hint");
  }

  const countEl = document.getElementById("settings-count");
  if (countEl) countEl.textContent = `${store.selected.length} / 5`;
}

function renderSelectedCurrencyStrip() {
  const selectedList = document.getElementById("selected-list");
  const divider = document.getElementById("selected-divider");
  selectedList.innerHTML = "";

  if (store.selected.length > 0) {
    divider.classList.remove("hidden");
    store.selected.forEach((code) => {
      const opt = createCurrencyOptionElement(code);
      if (opt) selectedList.appendChild(opt);
    });
  } else {
    divider.classList.add("hidden");
  }
}

function renderRegionalCurrencyList(listEl) {
  CURRENCY_REGIONS.forEach(({ region, codes }) => {
    const unselected = codes.filter((c) => !store.selected.includes(c));
    if (unselected.length === 0) return;

    const header = document.createElement("div");
    header.className =
      "text-xs font-semibold text-dim uppercase tracking-widest pt-4 pb-1.5 first:pt-0";
    header.textContent = regionName(region);
    listEl.appendChild(header);

    unselected.forEach((code) => {
      const opt = createCurrencyOptionElement(code);
      if (opt) listEl.appendChild(opt);
    });
  });
}

export function renderSettings() {
  const list = document.getElementById("currency-list");
  list.innerHTML = "";

  updateSettingsLabels();
  renderLanguagePicker();
  renderThemePicker();

  syncCurrencyHintAndCount();
  renderSelectedCurrencyStrip();
  renderRegionalCurrencyList(list);
}

/** Syncs all static chrome strings (header tagline, settings labels, main aria-labels) to `t()`. */
export function updateSettingsLabels() {
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

function renderLanguagePicker() {
  const picker = document.getElementById("language-picker");
  picker.innerHTML = "";

  const listId = "lang-dropdown-list";
  const { wrapper, toggle, dropdown } = buildListboxDropdownShell(listId);

  const current = LANGUAGES[store.lang] || LANGUAGES.en;
  const langCount = Object.keys(LANGUAGES).length;

  toggle.innerHTML = `
    ${langOptionHTML(current)}
    <div class="ml-auto flex items-center gap-1.5 shrink-0">
      <span class="text-[11px] text-dim">${t("settings.langCount", { count: langCount })}</span>
      <span class="text-dim transition-transform duration-200 lang-chevron">${CHEVRON_SVG}</span>
    </div>
  `;

  Object.entries(LANGUAGES).forEach(([key, lang]) => {
    const isActive = key === store.lang;
    const opt = document.createElement("button");
    opt.type = "button";
    opt.setAttribute("role", "option");
    opt.setAttribute("aria-selected", isActive ? "true" : "false");
    opt.className = [
      DROPDOWN_OPTION_CLASS,
      isActive ? "bg-[var(--color-accent-bg)]" : "hover:bg-bg",
    ].join(" ");
    opt.innerHTML = langOptionHTML(lang);

    opt.addEventListener("click", (e) => {
      e.stopPropagation();
      store.lang = key;
      setLang(key);
      document.documentElement.lang = key;
      saveState();
      renderSettings();
      showSaveConfirmation();
    });

    dropdown.appendChild(opt);
  });

  attachDropdownBehavior(toggle, dropdown, ".lang-chevron");

  wrapper.appendChild(toggle);
  wrapper.appendChild(dropdown);
  picker.appendChild(wrapper);
}

function renderThemePicker() {
  const picker = document.getElementById("theme-picker");
  picker.innerHTML = "";

  const listId = "theme-dropdown-list";
  const { wrapper, toggle, dropdown } = buildListboxDropdownShell(listId);

  const current = THEMES[store.theme] || THEMES.default;
  const themeCount = Object.keys(THEMES).length;

  toggle.innerHTML = `
    ${themeOptionHTML(store.theme, current)}
    <div class="ml-auto flex items-center gap-1.5 shrink-0">
      <span class="text-[11px] text-dim">${t("settings.themeCount", { count: themeCount })}</span>
      <span class="text-dim transition-transform duration-200 theme-chevron">${CHEVRON_SVG}</span>
    </div>
  `;

  Object.entries(THEMES).forEach(([key, theme]) => {
    const isActive = key === store.theme;
    const opt = document.createElement("button");
    opt.type = "button";
    opt.setAttribute("role", "option");
    opt.setAttribute("aria-selected", isActive ? "true" : "false");
    opt.className = [
      DROPDOWN_OPTION_CLASS,
      isActive ? "bg-[var(--color-accent-bg)]" : "hover:bg-bg",
    ].join(" ");
    opt.innerHTML = themeOptionHTML(key, theme);

    opt.addEventListener("click", (e) => {
      e.stopPropagation();
      store.theme = key;
      applyTheme(key);
      saveState();
      renderThemePicker();
      showSaveConfirmation();
    });

    dropdown.appendChild(opt);
  });

  attachDropdownBehavior(toggle, dropdown, ".theme-chevron");

  wrapper.appendChild(toggle);
  wrapper.appendChild(dropdown);
  picker.appendChild(wrapper);
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

export function openSettings() {
  settingsOpenSnapshot = JSON.stringify({
    selected: store.selected,
    lang: store.lang,
    theme: store.theme,
  });
  renderSettings();
  const overlay = document.getElementById("settings-overlay");
  const panel = document.getElementById("settings-panel");
  settingsOpenPrevFocus = document.activeElement;
  overlay.classList.remove("opacity-0", "invisible", "pointer-events-none");
  panel.classList.remove("translate-y-full");

  installSettingsKeyHandler(panel);
  focusFirstSettingsControl(panel);
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
    // Theme applies live via `applyTheme` in the picker; no extra pass needed here for theme-only edits.
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
