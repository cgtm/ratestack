/**
 * Theme and language dropdown widgets (shared listbox behavior).
 */
import { store, saveState } from "../data/store.js";
import { THEMES, applyTheme } from "../theme.js";
import { t, LANGUAGES, setLang } from "../i18n.js";
import { CHEVRON_SVG } from "../../assets/ui/icons.js";
import { showSaveConfirmation } from "./settings.js";

const TOGGLE_CLASS =
  "w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 border-brd bg-bg cursor-pointer transition-[border-color] duration-200 hover:border-accent";
const LISTBOX_CLASS =
  "absolute left-0 right-0 top-full mt-1 bg-surface border border-brd rounded-xl overflow-hidden z-10 hidden";
const OPTION_CLASS =
  "w-full flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-colors duration-150";

function langOptionHTML(lang) {
  return `
    <span class="text-[20px] leading-none shrink-0">${lang.flag}</span>
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

/** Auto theme preview uses the OS-preferred palette's colors. */
function autoThemeOptionHTML() {
  const prefersDark =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  const resolved = prefersDark ? THEMES.default : THEMES.light;
  const bg = resolved.colors.bg;
  const accent = resolved.colors.accent;
  const secondary = resolved.colors["accent-secondary"];
  return `
    <div class="flex -space-x-1.5 shrink-0">
      <div class="w-5 h-5 rounded-full border-2" style="background:${accent}; border-color:${bg}"></div>
      <div class="w-5 h-5 rounded-full border-2" style="background:${secondary}; border-color:${bg}"></div>
    </div>
    <span class="text-[13px] font-medium text-main">${t("theme.auto")}</span>
  `;
}

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

function buildDropdownShell(listId) {
  const wrapper = document.createElement("div");
  wrapper.className = "relative";

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = TOGGLE_CLASS;
  toggle.setAttribute("aria-haspopup", "listbox");
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-controls", listId);

  const dropdown = document.createElement("div");
  dropdown.id = listId;
  dropdown.setAttribute("role", "listbox");
  dropdown.className = LISTBOX_CLASS;

  return { wrapper, toggle, dropdown };
}

export function renderLanguagePicker(rerenderSettings) {
  const picker = document.getElementById("language-picker");
  picker.innerHTML = "";

  const listId = "lang-dropdown-list";
  const { wrapper, toggle, dropdown } = buildDropdownShell(listId);

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
      OPTION_CLASS,
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
  const { wrapper, toggle, dropdown } = buildDropdownShell(listId);

  // +1 for the "auto" option
  const themeCount = Object.keys(THEMES).length + 1;

  // Current toggle display
  if (store.theme === "auto") {
    toggle.innerHTML = `
      ${autoThemeOptionHTML()}
      <div class="ml-auto flex items-center gap-1.5 shrink-0">
        <span class="text-[11px] text-dim">${t("settings.themeCount", { count: themeCount })}</span>
        <span class="text-dim transition-transform duration-200 theme-chevron">${CHEVRON_SVG}</span>
      </div>
    `;
  } else {
    const current = THEMES[store.theme] || THEMES.default;
    toggle.innerHTML = `
      ${themeOptionHTML(store.theme, current)}
      <div class="ml-auto flex items-center gap-1.5 shrink-0">
        <span class="text-[11px] text-dim">${t("settings.themeCount", { count: themeCount })}</span>
        <span class="text-dim transition-transform duration-200 theme-chevron">${CHEVRON_SVG}</span>
      </div>
    `;
  }

  // Auto option first
  const autoOpt = document.createElement("button");
  autoOpt.type = "button";
  autoOpt.setAttribute("role", "option");
  autoOpt.setAttribute(
    "aria-selected",
    store.theme === "auto" ? "true" : "false",
  );
  autoOpt.className = [
    OPTION_CLASS,
    store.theme === "auto" ? "bg-[var(--color-accent-bg)]" : "hover:bg-bg",
  ].join(" ");
  autoOpt.innerHTML = autoThemeOptionHTML();
  autoOpt.addEventListener("click", (e) => {
    e.stopPropagation();
    store.theme = "auto";
    applyTheme("auto");
    saveState();
    renderThemePicker();
    showSaveConfirmation();
  });
  dropdown.appendChild(autoOpt);

  // Named themes
  Object.entries(THEMES).forEach(([key, theme]) => {
    const isActive = key === store.theme;
    const opt = document.createElement("button");
    opt.type = "button";
    opt.setAttribute("role", "option");
    opt.setAttribute("aria-selected", isActive ? "true" : "false");
    opt.className = [
      OPTION_CLASS,
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
