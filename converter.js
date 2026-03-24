import { CURRENCIES } from './currencies.js';
import { store, getRateDisplay } from './state.js';
import { recalculate, updateRateLabels } from './api.js';
import { initDragAndDrop } from './drag.js';
import { currencyName, t } from './i18n.js';

const CARD_BASE = 'currency-card bg-surface border rounded-2xl px-[18px] py-4 transition-[border-color,box-shadow] duration-200 relative';
const CARD_ACTIVE = 'border-accent shadow-accent-glow';
const CARD_INACTIVE = 'border-brd';
const ACTIVE_CLASSES = CARD_ACTIVE.split(' ');
const INACTIVE_CLASSES = CARD_INACTIVE.split(' ');

const GRIP_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="5" r="2"/><circle cx="15" cy="5" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="9" cy="19" r="2"/><circle cx="15" cy="19" r="2"/></svg>`;

export function renderConverter() {
  document.getElementById('rate-info').classList.remove('hidden');
  const container = document.getElementById('converter');
  container.innerHTML = '';

  store.selected.forEach((code) => {
    const info = CURRENCIES[code];
    const isActive = code === store.baseCurrency;
    const card = document.createElement('div');
    card.className = `${CARD_BASE} ${isActive ? CARD_ACTIVE : CARD_INACTIVE}`;
    card.dataset.code = code;

    const rateText = isActive ? '' : getRateDisplay(store.baseCurrency, code);

    card.innerHTML = `
      <div class="card-top flex items-center justify-between mb-2">
        <div class="flex items-center gap-2.5">
          <span class="drag-handle touch-none cursor-grab active:cursor-grabbing text-dim/60 hover:text-dim transition-colors p-1 -ml-1">${GRIP_SVG}</span>
          <span class="text-[28px] leading-none">${info.flag}</span>
          <div>
            <span class="text-lg font-semibold tracking-[0.5px]">${code}</span>
            <span class="text-xs text-dim font-normal ml-1">${currencyName(code)}</span>
          </div>
        </div>
        ${rateText ? `<span class="currency-rate text-[11px] text-dim bg-bg px-2 py-0.5 rounded-md whitespace-nowrap">${rateText}</span>` : ''}
      </div>
      <div class="flex items-baseline gap-1">
        <span class="text-[32px] font-semibold text-dim select-none">${info.symbol}</span>
        <input
          class="currency-input flex-1 min-w-0 bg-transparent border-none outline-none text-main text-[32px] font-semibold font-sans tracking-[-0.5px] caret-accent placeholder:text-brd"
          type="text"
          inputmode="decimal"
          placeholder="0"
          ${isActive && store.baseAmount ? `value="${store.baseAmount}"` : ''}
        >
      </div>
    `;

    const input = card.querySelector('.currency-input');

    input.addEventListener('focus', () => {
      document.querySelectorAll('.currency-card').forEach((c) => {
        c.classList.remove(...ACTIVE_CLASSES);
        c.classList.add(...INACTIVE_CLASSES);
      });
      card.classList.remove(...INACTIVE_CLASSES);
      card.classList.add(...ACTIVE_CLASSES);
      store.baseCurrency = code;
      store.baseAmount = input.value.replace(/[^0-9.]/g, '');
      input.value = store.baseAmount;
      recalculate();
      updateRateLabels();
    });

    input.addEventListener('input', () => {
      const raw = input.value.replace(/[^0-9.]/g, '');
      const parts = raw.split('.');
      const sanitized = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : raw;
      input.value = sanitized;
      store.baseAmount = sanitized;
      store.baseCurrency = code;
      recalculate();
    });

    container.appendChild(card);
  });

  recalculate();
  initDragAndDrop(container);
}

export function renderEmptyState() {
  document.getElementById('rate-info').classList.add('hidden');
  const container = document.getElementById('converter');
  container.innerHTML = '';

  const wrapper = document.createElement('div');
  wrapper.className = 'flex flex-col items-center justify-center text-center py-20 gap-3';

  const msg = document.createElement('p');
  msg.className = 'text-dim text-[15px] leading-relaxed';
  msg.textContent = t('empty.message');

  const link = document.createElement('button');
  link.className = 'text-accent font-semibold text-[15px] underline underline-offset-2 cursor-pointer bg-transparent border-none';
  link.textContent = t('empty.link');
  link.addEventListener('click', () => {
    document.getElementById('settings-btn').click();
  });

  wrapper.appendChild(msg);
  wrapper.appendChild(link);
  container.appendChild(wrapper);
}
