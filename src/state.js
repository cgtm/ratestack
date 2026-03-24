import { numberLocale, t } from './i18n.js';
import { CURRENCIES } from './currencies.js';

const STORAGE_KEY = 'ratestack';

export const store = {
  selected: [],
  rates: {},
  baseCurrency: '',
  baseAmount: '',
  theme: 'default',
  lang: 'en',
  ratesLastSuccessAt: null,
  ratesFetchError: false,
};

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Separators for the active number locale (grouping + decimal). */
export function getLocaleSeparators() {
  const locale = numberLocale();
  const parts = new Intl.NumberFormat(locale).formatToParts(1234567.89);
  let group = ',';
  let decimal = '.';
  for (const p of parts) {
    if (p.type === 'group') group = p.value;
    if (p.type === 'decimal') decimal = p.value;
  }
  return { group, decimal };
}

/**
 * Parse a display string (Intl-formatted or typed) into a canonical amount: digits with at most one '.'.
 */
export function parseLocaleAmountString(str) {
  if (str == null || str === '') return '';
  const { group, decimal } = getLocaleSeparators();
  let s = String(str).replace(/\u00a0/g, ' ').trim().replace(/\s/g, '');
  if (group) {
    s = s.replace(new RegExp(escapeRe(group), 'g'), '');
  }
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma >= 0 && lastDot >= 0) {
    if (lastComma > lastDot) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
  } else if (lastComma >= 0 && lastDot < 0) {
    if (decimal === ',') s = s.replace(',', '.');
    else s = s.replace(/,/g, '');
  } else if (lastDot >= 0 && lastComma < 0 && decimal !== '.') {
    /* e.g. typed "1.5" while locale uses comma as decimal — treat dot as decimal */
  }
  if (decimal !== '.' && decimal !== ',') {
    s = s.replace(new RegExp(escapeRe(decimal), 'g'), '.');
  }
  s = s.replace(/[^\d.]/g, '');
  const partsDot = s.split('.');
  if (partsDot.length > 2) {
    s = partsDot[0] + '.' + partsDot.slice(1).join('');
  }
  return s;
}

/**
 * Normalize raw typing/paste to canonical amount string (one optional dot).
 */
export function normalizeTypingAmount(raw) {
  let s = String(raw).replace(/[^\d.,]/g, '');
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma >= 0 && lastDot >= 0) {
    if (lastComma > lastDot) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
  } else if (lastComma >= 0 && lastDot < 0) {
    const { decimal } = getLocaleSeparators();
    if (decimal === ',') {
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
  } else if (lastDot >= 0 && lastComma < 0) {
    const { decimal } = getLocaleSeparators();
    if (decimal !== ',') {
      s = s.replace(/,/g, '');
    }
  }
  const idx = s.indexOf('.');
  if (idx !== -1) {
    s = s.slice(0, idx + 1) + s.slice(idx + 1).replace(/\./g, '');
  }
  return s;
}

export function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.selected)) {
      store.selected = saved.selected.filter((c) => CURRENCIES[c]);
    }
    if (saved && saved.theme) {
      store.theme = saved.theme;
    }
    if (saved && saved.lang) {
      store.lang = saved.lang;
    }
  } catch {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
  store.baseCurrency = store.selected[0] || '';
}

export function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    selected: store.selected,
    theme: store.theme,
    lang: store.lang,
  }));
}

const NO_DECIMALS = ['KRW', 'JPY', 'CLP', 'VND', 'IDR', 'UGX', 'TZS', 'HUF', 'ISK', 'COP'];

export function formatNumber(value, code) {
  const decimals = NO_DECIMALS.includes(code) ? 0 : 2;
  return new Intl.NumberFormat(numberLocale(), {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function getRateDisplay(fromCode, toCode) {
  if (!store.rates[fromCode] || !store.rates[fromCode][toCode]) return '';
  const rate = store.rates[fromCode][toCode];
  return t('rate.display', { from: fromCode, value: formatNumber(rate, toCode), to: toCode });
}
