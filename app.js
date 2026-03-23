import { store, loadState } from './state.js';
import { fetchRates } from './api.js';
import { renderConverter } from './converter.js';
import { openSettings, closeSettings } from './settings.js';

loadState();

document.getElementById('settings-btn').addEventListener('click', openSettings);
document.getElementById('settings-close').addEventListener('click', closeSettings);
document.getElementById('settings-overlay').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeSettings();
});
document.getElementById('refresh-btn').addEventListener('click', fetchRates);

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}

if (store.selected.length < 2) {
  openSettings();
} else {
  fetchRates().then(() => renderConverter());
}
