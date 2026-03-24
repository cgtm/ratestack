import { CURRENCIES, CURRENCY_REGIONS } from './currencies.js';
import { store, saveState } from './state.js';
import { fetchRates } from './api.js';
import { renderConverter, renderEmptyState } from './converter.js';
import { THEMES, applyTheme } from './theme.js';
import { t, currencyName, regionName, LANGUAGES, setLang } from './i18n.js';

const CHEVRON_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;

let saveTimer = null;
let settingsOpenSnapshot = null;
let settingsFocusTrapHandler = null;
let settingsOpenPrevFocus = null;

function showSaveConfirmation() {
  const el = document.getElementById('settings-saved');
  if (!el) return;
  el.textContent = t('settings.saved');
  el.style.opacity = '1';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { el.style.opacity = '0'; }, 1500);
}

function getFocusableInPanel(panel) {
  const nodes = panel.querySelectorAll(
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );
  return [...nodes].filter((el) => {
    if (el.getAttribute('aria-hidden') === 'true') return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  });
}

function trapSettingsFocus(panel, e) {
  if (e.key !== 'Tab') return;
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

export function renderSettings() {
  const list = document.getElementById('currency-list');
  list.innerHTML = '';

  updateSettingsLabels();
  renderLanguagePicker();
  renderThemePicker();

  const hint = document.querySelector('#settings-panel .settings-hint');
  if (hint) {
    hint.textContent = store.selected.length < 2
      ? t('settings.hintMore', { count: 2 - store.selected.length })
      : t('settings.hint');
  }

  const countEl = document.getElementById('settings-count');
  if (countEl) countEl.textContent = `${store.selected.length} / 5`;

  function buildOption(code) {
    const info = CURRENCIES[code];
    if (!info) return null;
    const isSelected = store.selected.includes(code);
    const atMax = store.selected.length >= 5 && !isSelected;

    const opt = document.createElement('div');
    opt.setAttribute('role', 'checkbox');
    opt.setAttribute('aria-checked', isSelected ? 'true' : 'false');
    opt.tabIndex = 0;
    opt.className = [
      'flex items-center gap-3 px-3.5 py-3 border rounded-xl cursor-pointer',
      'transition-[border-color,opacity] duration-200 select-none',
      isSelected ? 'border-accent bg-[var(--color-accent-bg)]' : 'border-brd bg-bg',
      atMax ? 'opacity-[0.35] !cursor-not-allowed' : '',
    ].join(' ');

    opt.innerHTML = `
      <span class="text-2xl">${info.flag}</span>
      <div class="flex-1">
        <div class="text-[15px] font-semibold">${code}</div>
        <div class="text-xs text-dim">${currencyName(code)}</div>
      </div>
      <div class="w-[22px] h-[22px] rounded-md border-2 ${isSelected ? 'bg-accent border-accent' : 'border-brd'} flex items-center justify-center transition-[background,border-color] duration-200 shrink-0">
        <svg class="${isSelected ? 'opacity-100' : 'opacity-0'} transition-opacity duration-150" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
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
      renderSettings();
      showSaveConfirmation();
    }

    opt.addEventListener('click', toggle);
    opt.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        toggle();
      }
    });

    return opt;
  }

  const selectedList = document.getElementById('selected-list');
  selectedList.innerHTML = '';
  const divider = document.getElementById('selected-divider');

  if (store.selected.length > 0) {
    divider.classList.remove('hidden');
    store.selected.forEach((code) => {
      const opt = buildOption(code);
      if (opt) selectedList.appendChild(opt);
    });
  } else {
    divider.classList.add('hidden');
  }

  CURRENCY_REGIONS.forEach(({ region, codes }) => {
    const unselected = codes.filter((c) => !store.selected.includes(c));
    if (unselected.length === 0) return;

    const header = document.createElement('div');
    header.className = 'text-xs font-semibold text-dim uppercase tracking-widest pt-4 pb-1.5 first:pt-0';
    header.textContent = regionName(region);
    list.appendChild(header);

    unselected.forEach((code) => {
      const opt = buildOption(code);
      if (opt) list.appendChild(opt);
    });
  });
}

function updateSettingsLabels() {
  const title = document.getElementById('settings-title');
  if (title) title.textContent = t('settings.title');

  const themeLabel = document.getElementById('theme-label');
  if (themeLabel) themeLabel.textContent = t('theme.section');

  const langLabel = document.getElementById('language-label');
  if (langLabel) langLabel.textContent = t('language.section');

  const currLabel = document.getElementById('currencies-label');
  if (currLabel) currLabel.textContent = t('settings.currencies');

  document.getElementById('settings-close')?.setAttribute('aria-label', t('aria.close'));
  document.getElementById('settings-btn')?.setAttribute('aria-label', t('aria.settings'));
  document.getElementById('refresh-btn')?.setAttribute('aria-label', t('aria.refresh'));
}

function langOptionHTML(lang) {
  return `
    <span class="text-lg shrink-0">${lang.flag}</span>
    <span class="text-[13px] font-medium text-main">${lang.label}</span>
  `;
}

function renderLanguagePicker() {
  const picker = document.getElementById('language-picker');
  picker.innerHTML = '';

  const wrapper = document.createElement('div');
  wrapper.className = 'relative';

  const current = LANGUAGES[store.lang] || LANGUAGES.en;
  const langCount = Object.keys(LANGUAGES).length;

  const listId = 'lang-dropdown-list';
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 border-brd bg-bg cursor-pointer transition-[border-color] duration-200 hover:border-accent';
  toggle.setAttribute('aria-haspopup', 'listbox');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', listId);
  toggle.innerHTML = `
    ${langOptionHTML(current)}
    <div class="ml-auto flex items-center gap-1.5 shrink-0">
      <span class="text-[11px] text-dim">${t('settings.langCount', { count: langCount })}</span>
      <span class="text-dim transition-transform duration-200 lang-chevron">${CHEVRON_SVG}</span>
    </div>
  `;

  const dropdown = document.createElement('div');
  dropdown.id = listId;
  dropdown.setAttribute('role', 'listbox');
  dropdown.className = 'absolute left-0 right-0 top-full mt-1 bg-surface border border-brd rounded-xl overflow-hidden z-10 hidden';

  Object.entries(LANGUAGES).forEach(([key, lang]) => {
    const isActive = key === store.lang;
    const opt = document.createElement('button');
    opt.type = 'button';
    opt.setAttribute('role', 'option');
    opt.setAttribute('aria-selected', isActive ? 'true' : 'false');
    opt.className = [
      'w-full flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-colors duration-150',
      isActive ? 'bg-[var(--color-accent-bg)]' : 'hover:bg-bg',
    ].join(' ');
    opt.innerHTML = langOptionHTML(lang);

    opt.addEventListener('click', (e) => {
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

  function openDropdown() {
    dropdown.classList.remove('hidden');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.querySelector('.lang-chevron').style.transform = 'rotate(180deg)';
    setTimeout(() => document.addEventListener('click', closeDropdown, { once: true }), 0);
  }

  function closeDropdown() {
    dropdown.classList.add('hidden');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.querySelector('.lang-chevron').style.transform = '';
  }

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    if (dropdown.classList.contains('hidden')) {
      openDropdown();
    } else {
      closeDropdown();
    }
  });

  wrapper.appendChild(toggle);
  wrapper.appendChild(dropdown);
  picker.appendChild(wrapper);
}

function themeOptionHTML(key, theme) {
  const bg = theme.colors.bg;
  const accent = theme.colors.accent;
  const secondary = theme.colors['accent-secondary'];
  return `
    <div class="flex -space-x-1.5 shrink-0">
      <div class="w-5 h-5 rounded-full border-2" style="background:${accent}; border-color:${bg}"></div>
      <div class="w-5 h-5 rounded-full border-2" style="background:${secondary}; border-color:${bg}"></div>
    </div>
    <span class="text-[13px] font-medium text-main">${t('theme.' + key)}</span>
  `;
}

function renderThemePicker() {
  const picker = document.getElementById('theme-picker');
  picker.innerHTML = '';

  const wrapper = document.createElement('div');
  wrapper.className = 'relative';

  const current = THEMES[store.theme] || THEMES.default;
  const themeCount = Object.keys(THEMES).length;

  const listId = 'theme-dropdown-list';
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 border-brd bg-bg cursor-pointer transition-[border-color] duration-200 hover:border-accent';
  toggle.setAttribute('aria-haspopup', 'listbox');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', listId);
  toggle.innerHTML = `
    ${themeOptionHTML(store.theme, current)}
    <div class="ml-auto flex items-center gap-1.5 shrink-0">
      <span class="text-[11px] text-dim">${t('settings.themeCount', { count: themeCount })}</span>
      <span class="text-dim transition-transform duration-200 theme-chevron">${CHEVRON_SVG}</span>
    </div>
  `;

  const dropdown = document.createElement('div');
  dropdown.id = listId;
  dropdown.setAttribute('role', 'listbox');
  dropdown.className = 'absolute left-0 right-0 top-full mt-1 bg-surface border border-brd rounded-xl overflow-hidden z-10 hidden';

  Object.entries(THEMES).forEach(([key, theme]) => {
    const isActive = key === store.theme;
    const opt = document.createElement('button');
    opt.type = 'button';
    opt.setAttribute('role', 'option');
    opt.setAttribute('aria-selected', isActive ? 'true' : 'false');
    opt.className = [
      'w-full flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-colors duration-150',
      isActive ? 'bg-[var(--color-accent-bg)]' : 'hover:bg-bg',
    ].join(' ');
    opt.innerHTML = themeOptionHTML(key, theme);

    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      store.theme = key;
      applyTheme(key);
      saveState();
      renderThemePicker();
      showSaveConfirmation();
    });

    dropdown.appendChild(opt);
  });

  function openDropdown() {
    dropdown.classList.remove('hidden');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.querySelector('.theme-chevron').style.transform = 'rotate(180deg)';
    setTimeout(() => document.addEventListener('click', closeDropdown, { once: true }), 0);
  }

  function closeDropdown() {
    dropdown.classList.add('hidden');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.querySelector('.theme-chevron').style.transform = '';
  }

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    if (dropdown.classList.contains('hidden')) {
      openDropdown();
    } else {
      closeDropdown();
    }
  });

  wrapper.appendChild(toggle);
  wrapper.appendChild(dropdown);
  picker.appendChild(wrapper);
}

export function openSettings() {
  settingsOpenSnapshot = JSON.stringify({
    selected: store.selected,
    lang: store.lang,
    theme: store.theme,
  });
  renderSettings();
  const overlay = document.getElementById('settings-overlay');
  const panel = document.getElementById('settings-panel');
  settingsOpenPrevFocus = document.activeElement;
  overlay.classList.remove('opacity-0', 'invisible', 'pointer-events-none');
  panel.classList.remove('translate-y-full');

  if (settingsFocusTrapHandler) {
    document.removeEventListener('keydown', settingsFocusTrapHandler);
  }
  settingsFocusTrapHandler = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeSettings();
      return;
    }
    trapSettingsFocus(panel, e);
  };
  document.addEventListener('keydown', settingsFocusTrapHandler);

  requestAnimationFrame(() => {
    const focusables = getFocusableInPanel(panel);
    (focusables[0] || document.getElementById('settings-close'))?.focus();
  });
}

export function closeSettings() {
  const overlay = document.getElementById('settings-overlay');
  const panel = document.getElementById('settings-panel');
  overlay.classList.add('opacity-0', 'invisible', 'pointer-events-none');
  panel.classList.add('translate-y-full');

  if (settingsFocusTrapHandler) {
    document.removeEventListener('keydown', settingsFocusTrapHandler);
    settingsFocusTrapHandler = null;
  }

  if (settingsOpenPrevFocus && typeof settingsOpenPrevFocus.focus === 'function') {
    settingsOpenPrevFocus.focus();
  }
  settingsOpenPrevFocus = null;

  let snap = null;
  try {
    snap = settingsOpenSnapshot ? JSON.parse(settingsOpenSnapshot) : null;
  } catch {
    snap = null;
  }
  settingsOpenSnapshot = null;

  const selectedChanged = snap && JSON.stringify(snap.selected) !== JSON.stringify(store.selected);
  const langChanged = snap && snap.lang !== store.lang;

  if (store.selected.length >= 2) {
    store.baseCurrency = store.selected.includes(store.baseCurrency) ? store.baseCurrency : store.selected[0];
    if (selectedChanged) {
      store.baseAmount = '';
      fetchRates().then(() => renderConverter());
    } else if (langChanged) {
      renderConverter();
    }
  } else {
    renderEmptyState();
  }
}
