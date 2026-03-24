import { CURRENCIES, CURRENCY_REGIONS } from './currencies.js';
import { store, saveState } from './state.js';
import { fetchRates } from './api.js';
import { renderConverter } from './converter.js';
import { THEMES, applyTheme } from './theme.js';

export function renderSettings() {
  const list = document.getElementById('currency-list');
  list.innerHTML = '';

  renderThemePicker();

  const closeBtn = document.getElementById('settings-close');
  const canClose = store.selected.length >= 2;
  closeBtn.classList.toggle('opacity-30', !canClose);
  closeBtn.classList.toggle('pointer-events-none', !canClose);

  const hint = document.querySelector('#settings-panel .settings-hint');
  if (hint) {
    hint.textContent = store.selected.length < 2
      ? `Select at least ${2 - store.selected.length} more currency${store.selected.length === 1 ? '' : ' currencies'}`
      : 'Select 2\u20135 currencies';
  }

  const countEl = document.getElementById('settings-count');
  if (countEl) countEl.textContent = `${store.selected.length} / 5`;

  function buildOption(code) {
    const info = CURRENCIES[code];
    if (!info) return null;
    const isSelected = store.selected.includes(code);
    const atMax = store.selected.length >= 5 && !isSelected;
    const atMin = store.selected.length <= 2 && isSelected;

    const opt = document.createElement('div');
    opt.className = [
      'flex items-center gap-3 px-3.5 py-3 border rounded-xl cursor-pointer',
      'transition-[border-color,opacity] duration-200 select-none',
      isSelected ? 'border-accent bg-[var(--color-accent-bg)]' : 'border-transparent bg-bg',
      atMax ? 'opacity-[0.35] !cursor-not-allowed' : '',
    ].join(' ');

    opt.innerHTML = `
      <span class="text-2xl">${info.flag}</span>
      <div class="flex-1">
        <div class="text-[15px] font-semibold">${code}</div>
        <div class="text-xs text-dim">${info.name}</div>
      </div>
      <div class="w-[22px] h-[22px] rounded-md border-2 ${isSelected ? 'bg-accent border-accent' : 'border-brd'} flex items-center justify-center transition-[background,border-color] duration-200 shrink-0">
        <svg class="${isSelected ? 'opacity-100' : 'opacity-0'} transition-opacity duration-150" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>
    `;

    opt.addEventListener('click', () => {
      if (isSelected && atMin) return;
      if (!isSelected && atMax) return;

      if (isSelected) {
        store.selected = store.selected.filter((c) => c !== code);
      } else {
        store.selected.push(code);
      }

      saveState();
      renderSettings();
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
    header.textContent = region;
    list.appendChild(header);

    unselected.forEach((code) => {
      const opt = buildOption(code);
      if (opt) list.appendChild(opt);
    });
  });
}

export function openSettings() {
  renderSettings();
  const overlay = document.getElementById('settings-overlay');
  const panel = document.getElementById('settings-panel');
  overlay.classList.remove('opacity-0', 'invisible', 'pointer-events-none');
  panel.classList.remove('translate-y-full');
}

function renderThemePicker() {
  const picker = document.getElementById('theme-picker');
  picker.innerHTML = '';

  Object.entries(THEMES).forEach(([key, theme]) => {
    const isActive = store.theme === key;
    const btn = document.createElement('button');
    btn.className = [
      'flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 transition-[border-color] duration-200 cursor-pointer',
      isActive ? 'border-accent' : 'border-transparent bg-bg',
    ].join(' ');

    const accent = theme.colors.accent;
    const secondary = theme.colors['accent-secondary'];

    btn.innerHTML = `
      <div class="flex -space-x-1.5">
        <div class="w-5 h-5 rounded-full border-2 border-surface" style="background:${accent}"></div>
        <div class="w-5 h-5 rounded-full border-2 border-surface" style="background:${secondary}"></div>
      </div>
      <span class="text-[13px] font-medium text-main">${theme.label}</span>
    `;

    btn.addEventListener('click', () => {
      store.theme = key;
      applyTheme(key);
      saveState();
      renderThemePicker();
    });

    picker.appendChild(btn);
  });
}

export function closeSettings() {
  if (store.selected.length < 2) return;
  const overlay = document.getElementById('settings-overlay');
  const panel = document.getElementById('settings-panel');
  overlay.classList.add('opacity-0', 'invisible', 'pointer-events-none');
  panel.classList.add('translate-y-full');
  store.baseCurrency = store.selected.includes(store.baseCurrency) ? store.baseCurrency : store.selected[0];
  store.baseAmount = '';
  fetchRates().then(() => renderConverter());
}
