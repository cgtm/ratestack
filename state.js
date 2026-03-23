const STORAGE_KEY = 'ratestack';

export const store = {
  selected: [],
  rates: {},
  baseCurrency: '',
  baseAmount: '',
};

export function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && saved.selected && saved.selected.length >= 0) {
      store.selected = saved.selected;
    }
  } catch {}
  store.baseCurrency = store.selected[0] || '';
}

export function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ selected: store.selected }));
}

const NO_DECIMALS = ['KRW', 'JPY', 'CLP', 'VND', 'IDR', 'UGX', 'TZS', 'HUF', 'ISK', 'COP', 'PYG'];

export function formatNumber(value, code) {
  if (value === 0) return '';
  const decimals = NO_DECIMALS.includes(code) ? 0 : 2;
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function getRateDisplay(fromCode, toCode) {
  if (!store.rates[fromCode] || !store.rates[fromCode][toCode]) return '';
  const rate = store.rates[fromCode][toCode];
  return `1 ${fromCode} = ${formatNumber(rate, toCode)} ${toCode}`;
}
