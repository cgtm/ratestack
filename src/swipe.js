export function initSwipeToDismiss(container, onRemove) {
  if (container._swipeInit) return;
  container._swipeInit = true;

  let activeCard = null;
  let content = null;
  let deleteZone = null;
  let startX = 0;
  let startY = 0;
  let currentX = 0;
  let locked = null;

  function xy(e) {
    const p = e.touches ? e.touches[0] : e;
    return { x: p.clientX, y: p.clientY };
  }

  function onStart(e) {
    if (e.target.closest('.drag-handle, input, .card-close')) return;
    const card = e.target.closest('.currency-card');
    if (!card) return;

    activeCard = card;
    content = card.querySelector('.card-content');
    deleteZone = card.querySelector('.swipe-delete-zone');
    const p = xy(e);
    startX = p.x;
    startY = p.y;
    currentX = 0;
    locked = null;

    content.style.transition = 'none';
    deleteZone.style.transition = 'none';
    deleteZone.style.opacity = '0';

    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('mousemove', onMove);
    document.addEventListener('touchend', onEnd);
    document.addEventListener('mouseup', onEnd);
  }

  function onMove(e) {
    if (!activeCard) return;
    const p = xy(e);
    const dx = p.x - startX;
    const dy = p.y - startY;

    if (!locked) {
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
        locked = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
      }
      if (locked !== 'h') {
        snap();
        return;
      }
    }

    e.preventDefault();
    currentX = Math.min(0, dx);
    content.style.transform = `translateX(${currentX}px)`;

    const threshold = activeCard.offsetWidth * 0.4;
    const progress = Math.min(1, Math.abs(currentX) / threshold);
    const pastThreshold = Math.abs(currentX) > threshold;

    const r = 239, gStart = 150, gEnd = 68, bStart = 150, bEnd = 68;
    const g = Math.round(gStart + (gEnd - gStart) * progress);
    const b = Math.round(bStart + (bEnd - bStart) * progress);
    deleteZone.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
    deleteZone.style.opacity = String(Math.max(0.25, progress));

    deleteZone.textContent = pastThreshold
      ? deleteZone.dataset.removing
      : deleteZone.dataset.remove;
  }

  function onEnd() {
    if (!activeCard) return;
    const threshold = activeCard.offsetWidth * 0.4;
    const code = activeCard.dataset.code;

    if (Math.abs(currentX) > threshold) {
      content.style.transition = 'transform 0.2s ease-out';
      content.style.transform = 'translateX(-100%)';
      setTimeout(() => onRemove(code), 200);
    } else {
      snap();
    }

    detach();
  }

  function snap() {
    if (content) {
      content.style.transition = 'transform 0.2s ease-out';
      content.style.transform = '';
    }
    if (deleteZone) {
      deleteZone.style.transition = 'opacity 0.2s';
      deleteZone.style.opacity = '0';
      deleteZone.textContent = deleteZone.dataset.remove;
    }
    detach();
  }

  function detach() {
    document.removeEventListener('touchmove', onMove);
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('touchend', onEnd);
    document.removeEventListener('mouseup', onEnd);
    activeCard = null;
    content = null;
    deleteZone = null;
    locked = null;
  }

  container.addEventListener('touchstart', onStart, { passive: true });
  container.addEventListener('mousedown', onStart);
}
