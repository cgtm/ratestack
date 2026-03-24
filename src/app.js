import { store, loadState } from './state.js';
import { fetchRates, updateRateStatusUI } from './api.js';
import { renderConverter, renderEmptyState, renderLoadingState } from './converter.js';
import { openSettings, closeSettings } from './settings.js';
import { applyTheme } from './theme.js';
import { setLang, t } from './i18n.js';

loadState();
applyTheme(store.theme);
setLang(store.lang);
document.documentElement.lang = store.lang;

function showUpdateBanner() {
  let el = document.getElementById('update-banner');
  if (!el) return;
  el.classList.remove('hidden');
  const reloadBtn = el.querySelector('#update-reload');
  if (reloadBtn) {
    reloadBtn.textContent = t('update.reload');
    reloadBtn.onclick = () => {
      window.location.reload();
    };
  }
  const msg = el.querySelector('#update-banner-text');
  if (msg) msg.textContent = t('update.banner');
}

document.getElementById('settings-btn').addEventListener('click', openSettings);
document.getElementById('settings-close').addEventListener('click', closeSettings);
document.getElementById('settings-overlay').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeSettings();
});
document.getElementById('refresh-btn').addEventListener('click', fetchRates);

let swControlledOnce = false;
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!navigator.serviceWorker.controller) return;
    if (!swControlledOnce) {
      swControlledOnce = true;
      return;
    }
    showUpdateBanner();
  });

  navigator.serviceWorker.register('sw.js').then((reg) => {
    reg.update();
  });
}

if (store.selected.length >= 2) {
  renderLoadingState();
  fetchRates().then(() => {
    renderConverter();
    updateRateStatusUI();
  });
} else {
  renderEmptyState();
}

setInterval(() => updateRateStatusUI(), 60 * 1000);
