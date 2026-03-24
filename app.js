import { store, loadState } from './state.js';
import { fetchRates } from './api.js';
import { renderConverter, renderEmptyState } from './converter.js';
import { openSettings, closeSettings } from './settings.js';
import { applyTheme } from './theme.js';
import { setLang } from './i18n.js';

loadState();
applyTheme(store.theme);
setLang(store.lang);
document.documentElement.lang = store.lang;

document.getElementById('settings-btn').addEventListener('click', openSettings);
document.getElementById('settings-close').addEventListener('click', closeSettings);
document.getElementById('settings-overlay').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeSettings();
});
document.getElementById('refresh-btn').addEventListener('click', fetchRates);

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').then((reg) => {
    reg.addEventListener('updatefound', () => {
      const newWorker = reg.installing;
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'activated') {
          window.location.reload();
        }
      });
    });

    // Check for updates on every launch
    reg.update();
  });
}

if (store.selected.length >= 2) {
  fetchRates().then(() => renderConverter());
} else {
  renderEmptyState();
}
