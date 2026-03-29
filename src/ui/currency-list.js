/**
 * Settings currency selection: selected strip + regional grouped list.
 */
import { CURRENCIES, CURRENCY_REGIONS } from "../currencies.js";
import { store, saveState } from "../data/store.js";
import { currencyName, regionName, t } from "../i18n.js";
import { showSaveConfirmation } from "./settings.js";
import { SETTINGS_CURRENCY_CHECK_SVG_TEMPLATE } from "../../assets/ui/icons.js";

function createCurrencyOption(code, rerenderSettings) {
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
      ${SETTINGS_CURRENCY_CHECK_SVG_TEMPLATE.replace(
        "__CLASS__",
        `${isSelected ? "opacity-100" : "opacity-0"} transition-opacity duration-150`,
      )}
    </div>
  `;

  function toggle() {
    if (!isSelected && atMax) return;
    if (isSelected) {
      store.selected = store.selected.filter((c) => c !== code);
    } else {
      store.selected.push(code);
    }
    saveState();
    rerenderSettings();
    showSaveConfirmation();
  }

  opt.addEventListener("click", toggle);
  opt.addEventListener("keydown", (e) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      toggle();
    }
  });

  return opt;
}

export function syncCurrencyHintAndCount() {
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

export function renderSelectedStrip(rerenderSettings) {
  const selectedList = document.getElementById("selected-list");
  const divider = document.getElementById("selected-divider");
  selectedList.innerHTML = "";

  if (store.selected.length > 0) {
    divider.classList.remove("hidden");
    store.selected.forEach((code) => {
      const opt = createCurrencyOption(code, rerenderSettings);
      if (opt) selectedList.appendChild(opt);
    });
  } else {
    divider.classList.add("hidden");
  }
}

export function renderRegionalList(listEl, rerenderSettings) {
  CURRENCY_REGIONS.forEach(({ region, codes }) => {
    const unselected = codes.filter((c) => !store.selected.includes(c));
    if (unselected.length === 0) return;

    const header = document.createElement("div");
    header.className =
      "text-xs font-semibold text-dim uppercase tracking-widest pt-4 pb-1.5 first:pt-0";
    header.textContent = regionName(region);
    listEl.appendChild(header);

    unselected.forEach((code) => {
      const opt = createCurrencyOption(code, rerenderSettings);
      if (opt) listEl.appendChild(opt);
    });
  });
}
