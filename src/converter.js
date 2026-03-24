/**
 * Main converter UI: builds currency cards, wires input (active = base currency), drag reorder,
 * and swipe-to-remove. Full re-render on `renderConverter` keeps the implementation simple;
 * `updateRateLabels` in api.js is used where we must avoid tearing down the DOM (focus).
 */
import { CURRENCIES } from './currencies.js';
import { store, saveState, getRateDisplay, parseLocaleAmountString, normalizeTypingAmount } from './state.js';
import { recalculate, updateRateLabels, fetchRatesIfNeeded } from './api.js';
import { hapticSuccess } from './haptics.js';
import { initDragAndDrop } from './drag.js';
import { initSwipeToDismiss } from './swipe.js';
import { currencyName, t } from './i18n.js';

const CLOSE_SVG = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
const COPY_SVG = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
const GRIP_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="5" r="2"/><circle cx="15" cy="5" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="9" cy="19" r="2"/><circle cx="15" cy="19" r="2"/></svg>`;

const CARD_BASE = 'currency-card border rounded-2xl transition-[border-color,box-shadow] duration-200 relative overflow-hidden';
const CARD_ACTIVE = 'border-accent shadow-accent-glow';
const CARD_INACTIVE = 'border-brd';
const ACTIVE_CLASSES = CARD_ACTIVE.split(' ');
const INACTIVE_CLASSES = CARD_INACTIVE.split(' ');

/** Persist order and base currency fallback when the active card is removed. */
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
  document.getElementById('rate-disclaimer')?.classList.remove('hidden');
  const container = document.getElementById('converter');
  container.innerHTML = '';

  store.selected.forEach((code) => {
    const info = CURRENCIES[code];
    const isActive = code === store.baseCurrency;
    const card = document.createElement('div');
    card.className = `${CARD_BASE} ${isActive ? CARD_ACTIVE : CARD_INACTIVE}`;
    card.dataset.code = code;
    card.tabIndex = 0; // keyboard reorder (Alt+arrows) when the card is focused

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
          <div class="flex items-center shrink-0 gap-0.5">
            <button type="button" class="card-copy rounded-md text-dim/60 hover:text-main transition-[color,background-color,box-shadow] duration-200 p-1" aria-label="${t('aria.copyValue', { code })}">
              ${COPY_SVG}
            </button>
            <button type="button" class="card-close text-dim/60 hover:text-main transition-colors p-1 -mr-1" aria-label="${t('aria.removeCurrency', { code })}">
              ${CLOSE_SVG}
            </button>
          </div>
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
      // Visual active state + sync base; parse display text in case Intl formatted this field
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
      // Typing always updates the base amount; baseCurrency was set on focus
      const sanitized = normalizeTypingAmount(input.value);
      input.value = sanitized;
      store.baseAmount = sanitized;
      recalculate();
    });

    card.querySelector('.card-close').addEventListener('click', () => removeCurrency(code));

    card.querySelector('.card-copy').addEventListener('click', (ev) => {
      ev.stopPropagation();
      const inp = card.querySelector('.currency-input');
      const sym = info.symbol;
      const raw = (inp?.value || '').trim();
      const text = raw ? `${sym}${raw}` : `${sym}`;
      const copyBtn = ev.currentTarget;
      const copyLabel = () => t('aria.copyValue', { code });

      copyBtn.classList.remove('card-copy-tap-anim');
      void copyBtn.offsetWidth;
      copyBtn.classList.add('card-copy-tap-anim');
      const endTap = () => {
        copyBtn.classList.remove('card-copy-tap-anim');
        copyBtn.removeEventListener('animationend', endTap);
      };
      copyBtn.addEventListener('animationend', endTap);

      const done = () => {
        hapticSuccess();
        copyBtn.classList.add('card-copy-done');
        clearTimeout(copyBtn._copyDoneTimer);
        copyBtn._copyDoneTimer = setTimeout(() => {
          copyBtn.classList.remove('card-copy-done');
        }, 1500);
        copyBtn.setAttribute('aria-label', t('card.copied'));
        setTimeout(() => copyBtn.setAttribute('aria-label', copyLabel()), 1500);
      };
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(() => {});
      }
    });

    container.appendChild(card);
  });

  recalculate();
  // Guards inside these ensure listeners attach once per container despite re-renders.
  initDragAndDrop(container);
  initSwipeToDismiss(container, removeCurrency);
}

export function renderEmptyState() {
  document.getElementById('rate-info').classList.add('hidden');
  document.getElementById('rate-disclaimer')?.classList.add('hidden');
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
  document.getElementById('rate-info')?.classList.remove('hidden');
  document.getElementById('rate-disclaimer')?.classList.remove('hidden');
  const ts = document.getElementById('rate-timestamp');
  if (ts) ts.textContent = t('rates.pending');
  const container = document.getElementById('converter');
  container.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'flex flex-col gap-3 w-full';
  wrap.setAttribute('aria-busy', 'true');
  wrap.setAttribute('aria-label', t('rates.loading'));

  const n = Math.max(2, Math.min(store.selected.length || 3, 5));
  for (let i = 0; i < n; i++) {
    const sk = document.createElement('div');
    sk.className =
      'rounded-2xl border border-brd bg-surface px-[18px] py-4 animate-pulse';
    sk.setAttribute('aria-hidden', 'true');
    sk.innerHTML = `
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2.5">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded bg-brd/80"></div>
            <div class="space-y-1.5">
              <div class="h-4 w-14 rounded bg-brd/80"></div>
              <div class="h-3 w-24 rounded bg-brd/60"></div>
            </div>
          </div>
        </div>
        <div class="flex gap-1">
          <div class="w-8 h-8 rounded bg-brd/60"></div>
          <div class="w-8 h-8 rounded bg-brd/60"></div>
        </div>
      </div>
      <div class="flex items-baseline gap-1">
        <div class="h-4 w-6 rounded bg-brd/60"></div>
        <div class="h-9 flex-1 rounded bg-brd/50"></div>
      </div>
      <div class="h-3 w-32 rounded bg-brd/40 mt-3"></div>
    `;
    wrap.appendChild(sk);
  }

  const hint = document.createElement('p');
  hint.className = 'text-center text-xs text-dim pt-1';
  hint.textContent = t('rates.loading');
  wrap.appendChild(hint);

  container.appendChild(wrap);
}
