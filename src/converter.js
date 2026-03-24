import { CURRENCIES } from './currencies.js';
import { store, saveState, getRateDisplay, parseLocaleAmountString, normalizeTypingAmount } from './state.js';
import { recalculate, updateRateLabels, fetchRatesIfNeeded } from './api.js';
import { initDragAndDrop } from './drag.js';
import { initSwipeToDismiss } from './swipe.js';
import { currencyName, t } from './i18n.js';

const CLOSE_SVG = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
const GRIP_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="5" r="2"/><circle cx="15" cy="5" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="9" cy="19" r="2"/><circle cx="15" cy="19" r="2"/></svg>`;

const CARD_BASE = 'currency-card border rounded-2xl transition-[border-color,box-shadow] duration-200 relative overflow-hidden';
const CARD_ACTIVE = 'border-accent shadow-accent-glow';
const CARD_INACTIVE = 'border-brd';
const ACTIVE_CLASSES = CARD_ACTIVE.split(' ');
const INACTIVE_CLASSES = CARD_INACTIVE.split(' ');

function removeCurrency(code) {
  store.selected = store.selected.filter((c) => c !== code);
  if (store.baseCurrency === code) {
    store.baseCurrency = store.selected[0] || '';
  }
  saveState();
  if (store.selected.length >= 2) {
    fetchRatesIfNeeded().then(() => renderConverter());
  } else {
    renderEmptyState();
  }
}

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
    card.tabIndex = 0;

    const rateText = isActive ? '' : getRateDisplay(store.baseCurrency, code);
    const inputLabel = `${currencyName(code)} — ${t('aria.amount')}`;

    card.innerHTML = `
      <div class="swipe-delete-zone absolute inset-0 flex items-center justify-end text-white font-semibold text-[13px] pr-6 select-none opacity-0"
           data-remove="${t('card.remove')}" data-removing="${t('card.removing')}">
        ${t('card.remove')}
      </div>
      <div class="card-content relative z-[1] bg-surface px-[18px] py-4 touch-pan-y">
        <div class="card-top flex items-center justify-between mb-2">
          <div class="flex items-center gap-2.5">
            <span class="drag-handle touch-none cursor-grab active:cursor-grabbing text-dim/70 hover:text-dim transition-colors p-1 -ml-1" tabindex="-1" role="img" aria-label="${t('aria.dragReorder')}">${GRIP_SVG}</span>
            <span class="text-[28px] leading-none">${info.flag}</span>
            <div>
              <span class="text-lg font-semibold tracking-[0.5px]">${code}</span>
              <span class="text-xs text-dim font-normal ml-1">${currencyName(code)}</span>
            </div>
          </div>
          <button type="button" class="card-close text-dim/60 hover:text-main transition-colors p-1 -mr-1" aria-label="${t('aria.removeCurrency', { code })}">
            ${CLOSE_SVG}
          </button>
        </div>
        <div class="flex items-baseline gap-1">
          <span class="text-[32px] font-semibold text-dim select-none">${info.symbol}</span>
          <input
            class="currency-input flex-1 min-w-0 bg-transparent border-none outline-none text-main text-[32px] font-semibold font-sans tracking-[-0.5px] caret-accent placeholder:text-brd"
            type="text"
            inputmode="decimal"
            placeholder="0"
            aria-label="${inputLabel}"
            ${isActive && store.baseAmount ? `value="${store.baseAmount}"` : ''}
          >
        </div>
        <span class="currency-rate text-[11px] text-dim mt-2 block ${rateText ? '' : 'hidden'}">${rateText}</span>
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
      store.baseAmount = parseLocaleAmountString(input.value);
      input.value = store.baseAmount;
      fetchRatesIfNeeded().then(() => {
        recalculate();
        updateRateLabels();
      });
    });

    input.addEventListener('input', () => {
      const sanitized = normalizeTypingAmount(input.value);
      input.value = sanitized;
      store.baseAmount = sanitized;
      recalculate();
    });

    card.querySelector('.card-close').addEventListener('click', () => removeCurrency(code));

    container.appendChild(card);
  });

  recalculate();
  initDragAndDrop(container);
  initSwipeToDismiss(container, removeCurrency);
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

export function renderLoadingState() {
  const container = document.getElementById('converter');
  container.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'flex flex-col items-center justify-center py-16 gap-3 text-dim';
  wrap.innerHTML = `
    <div class="w-8 h-8 border-2 border-brd border-t-accent rounded-full animate-spin" aria-hidden="true"></div>
    <p class="text-sm">${t('rates.loading')}</p>
  `;
  container.appendChild(wrap);
}
