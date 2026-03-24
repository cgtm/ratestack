import { store, formatNumber, getRateDisplay } from './state.js';
import { t, numberLocale } from './i18n.js';

const API_BASE = 'https://open.er-api.com/v6/latest';

export async function fetchRates() {
  const svg = document.querySelector('#refresh-btn svg');
  svg.classList.add('animate-spin');

  try {
    const promises = store.selected.map(async (code) => {
      const res = await fetch(`${API_BASE}/${code}`);
      const data = await res.json();
      if (data.result === 'success') {
        const relevant = {};
        store.selected.forEach((c) => {
          if (c !== code && data.rates[c] !== undefined) relevant[c] = data.rates[c];
        });
        store.rates[code] = relevant;
      }
    });
    await Promise.all(promises);
    updateTimestamp();
    recalculate();
  } catch (err) {
    console.error('Failed to fetch rates:', err);
  } finally {
    svg.classList.remove('animate-spin');
  }
}

export function updateTimestamp() {
  const el = document.getElementById('rate-timestamp');
  const now = new Date();
  const time = now.toLocaleTimeString(numberLocale(), { hour: '2-digit', minute: '2-digit' });
  el.textContent = t('rates.updated', { time });
}

export function recalculate() {
  if (!store.baseAmount || isNaN(parseFloat(store.baseAmount))) {
    store.selected.forEach((code) => {
      const input = document.querySelector(`.currency-card[data-code="${code}"] .currency-input`);
      if (input && code !== store.baseCurrency) input.value = '';
    });
    return;
  }

  const amount = parseFloat(store.baseAmount);

  store.selected.forEach((code) => {
    if (code === store.baseCurrency) return;
    const input = document.querySelector(`.currency-card[data-code="${code}"] .currency-input`);
    if (!input) return;

    if (store.rates[store.baseCurrency] && store.rates[store.baseCurrency][code]) {
      const converted = amount * store.rates[store.baseCurrency][code];
      input.value = formatNumber(converted, code);
    }
  });
}

export function updateRateLabels() {
  store.selected.forEach((code) => {
    const card = document.querySelector(`.currency-card[data-code="${code}"]`);
    if (!card) return;
    const rateEl = card.querySelector('.currency-rate');
    const rateText = code === store.baseCurrency ? '' : getRateDisplay(store.baseCurrency, code);
    if (rateEl) {
      rateEl.textContent = rateText || '';
      rateEl.style.display = rateText ? '' : 'none';
    } else if (rateText) {
      const span = document.createElement('span');
      span.className = 'currency-rate text-[11px] text-dim bg-bg px-2 py-0.5 rounded-md whitespace-nowrap';
      span.textContent = rateText;
      card.querySelector('.card-top').appendChild(span);
    }
  });
}
