/**
 * Application entry: restore persisted state, apply theme and language, wire global UI,
 * register the service worker, and load the converter or empty state.
 *
 * Why `loadState` / `setLang` / `updateSettingsLabels` run before listeners: the shell must
 * show correct copy (tagline, aria-labels) and theme colors before first paint as much as possible.
 */
import { store, loadState } from './state.js';
import { fetchRates, updateRateStatusUI, updateTimestamp, recalculate, updateRateLabels } from './api.js';
import { renderConverter, renderEmptyState, renderLoadingState } from './converter.js';
import { openSettings, closeSettings, updateSettingsLabels } from './settings.js';
import { applyTheme } from './theme.js';
import { setLang, t } from './i18n.js';

loadState();
applyTheme(store.theme);
setLang(store.lang);
document.documentElement.lang = store.lang;
updateSettingsLabels();

/** Shown when a new SW takes control; we avoid auto-reload so the user is not interrupted mid-edit. */
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
function acknowledgeRefreshTap() {
  const btn = document.getElementById('refresh-btn');
  if (!btn) return;
  btn.classList.remove('refresh-tap-anim');
  void btn.offsetWidth;
  btn.classList.add('refresh-tap-anim');
  const done = () => {
    btn.classList.remove('refresh-tap-anim');
    btn.removeEventListener('animationend', done);
  };
  btn.addEventListener('animationend', done);
}

document.getElementById('refresh-btn').addEventListener('click', () => {
  acknowledgeRefreshTap();
  fetchRates();
});

/**
 * First `controllerchange` fires when this page first gets a controlling SW — skip banner.
 * Later `controllerchange` means a new worker replaced the old one (deploy); show banner.
 */
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

function refreshRateStatusAndTime() {
  updateRateStatusUI();
  updateTimestamp();
}

if (store.selected.length >= 2) {
  renderLoadingState();
  refreshRateStatusAndTime();
  fetchRates().then(() => {
    renderConverter();
    refreshRateStatusAndTime();
  });
} else {
  renderEmptyState();
}

window.addEventListener('online', refreshRateStatusAndTime);
window.addEventListener('offline', refreshRateStatusAndTime);

/** OS / browser locale changed — refresh Intl-based numbers and “updated … ago” without reload. */
window.addEventListener('languagechange', () => {
  refreshRateStatusAndTime();
  if (store.selected.length >= 2) {
    recalculate();
    updateRateLabels();
  }
});

/** Stale line and relative “updated … ago” refresh on a steady cadence. */
setInterval(() => refreshRateStatusAndTime(), 60 * 1000);
