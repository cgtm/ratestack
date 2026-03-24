/**
 * Drag reorder using a placeholder + fixed-position clone (works with touch and mouse).
 * `container._dragInit` prevents duplicate listeners when `renderConverter` runs again.
 * Alt+Arrow on a focused card duplicates reorder for keyboard users.
 */
import { store, saveState } from './state.js';
import { updateRateLabels } from './api.js';

export function initDragAndDrop(container) {
  if (container._dragInit) return;
  container._dragInit = true;

  let dragCard = null;
  let placeholder = null;
  let startY = 0;
  let offsetY = 0;
  let cardRects = [];

  function getY(e) {
    return e.touches ? e.touches[0].clientY : e.clientY;
  }

  function onStart(e) {
    const handle = e.target.closest('.drag-handle');
    if (!handle) return;
    dragCard = handle.closest('.currency-card');
    if (!dragCard) return;

    e.preventDefault();

    const cards = [...container.querySelectorAll('.currency-card')];
    cardRects = cards.map((c) => {
      const r = c.getBoundingClientRect();
      return { el: c, top: r.top, height: r.height, mid: r.top + r.height / 2 };
    });

    const rect = dragCard.getBoundingClientRect();
    startY = getY(e);
    offsetY = 0;

    placeholder = document.createElement('div');
    placeholder.className = 'rounded-2xl border-2 border-dashed border-brd opacity-40';
    placeholder.style.height = rect.height + 'px';

    dragCard.style.position = 'fixed';
    dragCard.style.top = rect.top + 'px';
    dragCard.style.left = rect.left + 'px';
    dragCard.style.width = rect.width + 'px';
    dragCard.style.zIndex = '50';
    dragCard.style.transition = 'box-shadow 0.15s, transform 0.15s';
    dragCard.style.transform = 'scale(1.03)';
    dragCard.style.boxShadow = '0 8px 30px rgba(0,0,0,0.4)';

    // Lift the card out of the flow so it can float above siblings while dragging.
    dragCard.parentNode.insertBefore(placeholder, dragCard);
    document.body.appendChild(dragCard);
    document.body.classList.add('dragging');

    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('mousemove', onMove);
    document.addEventListener('touchend', onEnd);
    document.addEventListener('mouseup', onEnd);
  }

  function onMove(e) {
    if (!dragCard) return;
    e.preventDefault();

    const currentY = getY(e);
    offsetY = currentY - startY;
    const origTop = parseFloat(dragCard.style.top);
    dragCard.style.transform = `translateY(${offsetY}px) scale(1.03)`;

    const dragMid = origTop + offsetY + dragCard.getBoundingClientRect().height / 2;

    const placeholderIdx = [...container.children].indexOf(placeholder);

    for (let i = 0; i < cardRects.length; i++) {
      const r = cardRects[i];
      if (r.el === dragCard) continue;
      const elIdx = [...container.children].indexOf(r.el);
      if (elIdx === -1) continue;

      const elRect = r.el.getBoundingClientRect();
      const elMid = elRect.top + elRect.height / 2;

      if (dragMid < elMid && elIdx < placeholderIdx) {
        container.insertBefore(placeholder, r.el);
        break;
      } else if (dragMid > elMid && elIdx > placeholderIdx) {
        container.insertBefore(placeholder, r.el.nextSibling);
        break;
      }
    }
  }

  function onEnd() {
    if (!dragCard) return;

    document.removeEventListener('touchmove', onMove);
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('touchend', onEnd);
    document.removeEventListener('mouseup', onEnd);

    container.insertBefore(dragCard, placeholder);
    placeholder.remove();

    dragCard.style.position = '';
    dragCard.style.top = '';
    dragCard.style.left = '';
    dragCard.style.width = '';
    dragCard.style.zIndex = '';
    dragCard.style.transition = '';
    dragCard.style.transform = '';
    dragCard.style.boxShadow = '';
    document.body.classList.remove('dragging');

    store.selected = [...container.querySelectorAll('.currency-card')].map((c) => c.dataset.code);
    saveState();

    dragCard = null;
    placeholder = null;

    updateRateLabels();
  }

  container.addEventListener('touchstart', onStart, { passive: false });
  container.addEventListener('mousedown', onStart);

  container.addEventListener('keydown', (e) => {
    if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
    const card = e.target.closest('.currency-card');
    if (!card || !container.contains(card)) return;
    e.preventDefault();
    if (e.key === 'ArrowUp') {
      const prev = card.previousElementSibling;
      if (prev) container.insertBefore(card, prev);
    } else {
      const next = card.nextElementSibling;
      if (next) container.insertBefore(next, card);
    }
    store.selected = [...container.querySelectorAll('.currency-card')].map((c) => c.dataset.code);
    saveState();
    updateRateLabels();
  });
}
