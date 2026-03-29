/**
 * Horizontal swipe-to-dismiss for currency cards.
 *
 * Uses AbortController — re-calling `initSwipeToDismiss` cleanly tears down
 * the previous instance. 40% card width threshold; background interpolates
 * toward red as the user approaches commit.
 */
import { hapticCommit } from "../haptics.js";
import { getPointerClientXY } from "./pointer.js";

let swipeAbort = null;

const AXIS_LOCK_PX = 8;
const SWIPE_COMMIT_RATIO = 0.4;

const DELETE_ZONE_R = 239;
const DELETE_ZONE_G0 = 150;
const DELETE_ZONE_G1 = 68;
const DELETE_ZONE_B0 = 150;
const DELETE_ZONE_B1 = 68;

function shouldIgnoreStart(target) {
  return Boolean(
    target.closest(".drag-handle, input, .card-close, .card-copy"),
  );
}

function updateDeleteZone(zone, currentX, thresholdPx) {
  const progress = Math.min(1, Math.abs(currentX) / thresholdPx);
  const past = Math.abs(currentX) > thresholdPx;

  const g = Math.round(
    DELETE_ZONE_G0 + (DELETE_ZONE_G1 - DELETE_ZONE_G0) * progress,
  );
  const b = Math.round(
    DELETE_ZONE_B0 + (DELETE_ZONE_B1 - DELETE_ZONE_B0) * progress,
  );
  zone.style.backgroundColor = `rgb(${DELETE_ZONE_R}, ${g}, ${b})`;
  zone.style.opacity = String(Math.max(0.25, progress));
  zone.textContent = past ? zone.dataset.removing : zone.dataset.remove;
}

function snapBack(content, zone) {
  if (content) {
    content.style.transition = "transform 0.2s ease-out";
    content.style.transform = "";
  }
  if (zone) {
    zone.style.transition = "opacity 0.2s";
    zone.style.opacity = "0";
    zone.textContent = zone.dataset.remove;
  }
}

export function initSwipeToDismiss(container, onRemove) {
  swipeAbort?.abort();
  swipeAbort = new AbortController();
  const { signal } = swipeAbort;

  let activeCard = null;
  let content = null;
  let deleteZone = null;
  let startX = 0;
  let startY = 0;
  let currentX = 0;
  let locked = null;

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
        snapBack(content, deleteZone);
        return;
      }
    }

    e.preventDefault();
    currentX = Math.min(0, dx);
    content.style.transform = `translateX(${currentX}px)`;

    const threshold = activeCard.offsetWidth * SWIPE_COMMIT_RATIO;
    updateDeleteZone(deleteZone, currentX, threshold);
  }

  function detach() {
    document.removeEventListener("touchmove", onMove);
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("touchend", onEnd);
    document.removeEventListener("mouseup", onEnd);
    activeCard = null;
    content = null;
    deleteZone = null;
    locked = null;
  }

  function onEnd() {
    if (!activeCard) return;
    const threshold = activeCard.offsetWidth * SWIPE_COMMIT_RATIO;
    const code = activeCard.dataset.code;

    if (Math.abs(currentX) > threshold) {
      hapticCommit();
      content.style.transition = "transform 0.2s ease-out";
      content.style.transform = "translateX(-100%)";
      setTimeout(() => onRemove(code), 200);
    } else {
      snapBack(content, deleteZone);
    }

    detach();
  }

  function onStart(e) {
    if (shouldIgnoreStart(e.target)) return;
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

    content.style.transition = "none";
    deleteZone.style.transition = "none";
    deleteZone.style.opacity = "0";

    document.addEventListener("touchmove", onMove, { passive: false });
    document.addEventListener("mousemove", onMove);
    document.addEventListener("touchend", onEnd);
    document.addEventListener("mouseup", onEnd);
  }

  container.addEventListener("touchstart", onStart, { passive: true, signal });
  container.addEventListener("mousedown", onStart, { signal });
}
