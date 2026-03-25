/**
 * Settings theme and language dropdowns (shared listbox behavior).
 */
import { store, saveState } from "../state.js";
import { THEMES, applyTheme } from "../theme.js";
import { t, LANGUAGES, setLang } from "../i18n.js";
import { CHEVRON_SVG } from "../../assets/ui/icons.js";
import { showSaveConfirmation } from "./overlay.js";

const DROPDOWN_TOGGLE_CLASS =
  "w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 border-brd bg-bg cursor-pointer transition-[border-color] duration-200 hover:border-accent";
const DROPDOWN_LISTBOX_CLASS =
  "absolute left-0 right-0 top-full mt-1 bg-surface border border-brd rounded-xl overflow-hidden z-10 hidden";
const DROPDOWN_OPTION_CLASS =
  "w-full flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-colors duration-150";

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

/**
 * @param {() => void} rerenderSettings
 */
export function renderLanguagePicker(rerenderSettings) {
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
      rerenderSettings();
      showSaveConfirmation();
    });

    dropdown.appendChild(opt);
  });

  attachDropdownBehavior(toggle, dropdown, ".lang-chevron");

  wrapper.appendChild(toggle);
  wrapper.appendChild(dropdown);
  picker.appendChild(wrapper);
}

export function renderThemePicker() {
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
