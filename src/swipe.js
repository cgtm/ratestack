import { hapticCommit } from "./haptics.js";
import { getPointerClientXY } from "./pointer.js";

/**
 * Horizontal swipe on the card body removes a currency; vertical intent is ignored so scrolling
 * still works. Ignores starts on grip, input, copy, and close to avoid fighting drag and typing.
 * Threshold is 40% of card width; background interpolates toward red as the user approaches commit.
 */

const AXIS_LOCK_PX = 8;
const SWIPE_COMMIT_RATIO = 0.4;

/** Delete zone background: fixed R, G/B interpolate with swipe progress toward red. */
const DELETE_ZONE_R = 239;
const DELETE_ZONE_G0 = 150;
const DELETE_ZONE_G1 = 68;
const DELETE_ZONE_B0 = 150;
const DELETE_ZONE_B1 = 68;

function swipeCommitThresholdPx(card) {
  return card.offsetWidth * SWIPE_COMMIT_RATIO;
}

function shouldIgnoreSwipeStart(target) {
  return Boolean(
    target.closest(".drag-handle, input, .card-close, .card-copy"),
  );
}

function updateDeleteZoneForSwipe(deleteZone, currentX, thresholdPx) {
  const progress = Math.min(1, Math.abs(currentX) / thresholdPx);
  const pastThreshold = Math.abs(currentX) > thresholdPx;

  const g = Math.round(
    DELETE_ZONE_G0 + (DELETE_ZONE_G1 - DELETE_ZONE_G0) * progress,
  );
  const b = Math.round(
    DELETE_ZONE_B0 + (DELETE_ZONE_B1 - DELETE_ZONE_B0) * progress,
  );
  deleteZone.style.backgroundColor = `rgb(${DELETE_ZONE_R}, ${g}, ${b})`;
  deleteZone.style.opacity = String(Math.max(0.25, progress));

  deleteZone.textContent = pastThreshold
    ? deleteZone.dataset.removing
    : deleteZone.dataset.remove;
}

function prepareCardForSwipeTracking(content, deleteZone) {
  content.style.transition = "none";
  deleteZone.style.transition = "none";
  deleteZone.style.opacity = "0";
}

function snapCardSwipe(content, deleteZone) {
  if (content) {
    content.style.transition = "transform 0.2s ease-out";
    content.style.transform = "";
  }
  if (deleteZone) {
    deleteZone.style.transition = "opacity 0.2s";
    deleteZone.style.opacity = "0";
    deleteZone.textContent = deleteZone.dataset.remove;
  }
}

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

  function attachGlobalSwipeListeners() {
    document.addEventListener("touchmove", onMove, { passive: false });
    document.addEventListener("mousemove", onMove);
    document.addEventListener("touchend", onEnd);
    document.addEventListener("mouseup", onEnd);
  }

  function detachGlobalSwipeListeners() {
    document.removeEventListener("touchmove", onMove);
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("touchend", onEnd);
    document.removeEventListener("mouseup", onEnd);
  }

  function onStart(e) {
    if (shouldIgnoreSwipeStart(e.target)) return;
    const card = e.target.closest(".currency-card");
    if (!card || !container.contains(card)) return;

    activeCard = card;
    content = card.querySelector(".card-content");
    deleteZone = card.querySelector(".swipe-delete-zone");
    const p = getPointerClientXY(e);
    startX = p.x;
    startY = p.y;
    currentX = 0;
    locked = null;

    prepareCardForSwipeTracking(content, deleteZone);

    attachGlobalSwipeListeners();
  }

  function onMove(e) {
    if (!activeCard) return;
    const p = getPointerClientXY(e);
    const dx = p.x - startX;
    const dy = p.y - startY;

    if (!locked) {
      if (Math.abs(dx) > AXIS_LOCK_PX || Math.abs(dy) > AXIS_LOCK_PX) {
        locked = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
      }
      if (locked !== "h") {
        snapCardSwipe(content, deleteZone);
        return;
      }
    }

    e.preventDefault();
    currentX = Math.min(0, dx);
    content.style.transform = `translateX(${currentX}px)`;

    const threshold = swipeCommitThresholdPx(activeCard);
    updateDeleteZoneForSwipe(deleteZone, currentX, threshold);
  }

  function onEnd() {
    if (!activeCard) return;
    const threshold = swipeCommitThresholdPx(activeCard);
    const code = activeCard.dataset.code;

    if (Math.abs(currentX) > threshold) {
      hapticCommit();
      content.style.transition = "transform 0.2s ease-out";
      content.style.transform = "translateX(-100%)";
      setTimeout(() => onRemove(code), 200);
    } else {
      snapCardSwipe(content, deleteZone);
    }

    detach();
  }

  function detach() {
    detachGlobalSwipeListeners();
    activeCard = null;
    content = null;
    deleteZone = null;
    locked = null;
  }

  container.addEventListener("touchstart", onStart, { passive: true });
  container.addEventListener("mousedown", onStart);
}
