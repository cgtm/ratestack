/**
 * Drag reorder using a placeholder + fixed-position clone.
 *
 * Uses AbortController for lifecycle management — calling `initDragAndDrop`
 * again aborts the previous instance's listeners cleanly.
 * Alt+Arrow on a focused card provides keyboard reorder.
 */
import { store, saveState } from "../data/store.js";
import { updateRateLabels } from "../ui/status.js";
import { getPointerClientXY } from "./pointer.js";

let dragAbort = null;

function persistCardOrder(container) {
  store.selected = [...container.querySelectorAll(".currency-card")].map(
    (c) => c.dataset.code,
  );
  saveState();
  updateRateLabels();
}

function measureCardRects(cards) {
  return cards.map((c) => {
    const r = c.getBoundingClientRect();
    return { el: c, top: r.top, height: r.height, mid: r.top + r.height / 2 };
  });
}

function resolveDragCard(e, container) {
  const handle = e.target.closest(".drag-handle");
  if (!handle) return null;
  const card = handle.closest(".currency-card");
  if (!card || !container.contains(card)) return null;
  return card;
}

function createPlaceholder(heightPx) {
  const ph = document.createElement("div");
  ph.className = "rounded-2xl border-2 border-dashed border-brd opacity-40";
  ph.style.height = heightPx + "px";
  return ph;
}

function applyFloatingStyles(card, rect) {
  card.style.position = "fixed";
  card.style.top = rect.top + "px";
  card.style.left = rect.left + "px";
  card.style.width = rect.width + "px";
  card.style.zIndex = "50";
  card.style.transition = "box-shadow 0.15s, transform 0.15s";
  card.style.transform = "scale(1.03)";
  card.style.boxShadow = "0 8px 30px rgba(0,0,0,0.4)";
}

function clearFloatingStyles(card) {
  card.style.position = "";
  card.style.top = "";
  card.style.left = "";
  card.style.width = "";
  card.style.zIndex = "";
  card.style.transition = "";
  card.style.transform = "";
  card.style.boxShadow = "";
}

function repositionPlaceholder(
  container,
  placeholder,
  dragCard,
  cardRects,
  dragMid,
) {
  const phIdx = [...container.children].indexOf(placeholder);

  for (let i = 0; i < cardRects.length; i++) {
    const r = cardRects[i];
    if (r.el === dragCard) continue;
    const elIdx = [...container.children].indexOf(r.el);
    if (elIdx === -1) continue;

    const elRect = r.el.getBoundingClientRect();
    const elMid = elRect.top + elRect.height / 2;

    if (dragMid < elMid && elIdx < phIdx) {
      container.insertBefore(placeholder, r.el);
      break;
    } else if (dragMid > elMid && elIdx > phIdx) {
      container.insertBefore(placeholder, r.el.nextSibling);
      break;
    }
  }
}

export function initDragAndDrop(container) {
  dragAbort?.abort();
  dragAbort = new AbortController();
  const { signal } = dragAbort;

  let dragCard = null;
  let placeholder = null;
  let startY = 0;
  let offsetY = 0;
  let cardRects = [];

  function onMove(e) {
    if (!dragCard) return;
    e.preventDefault();

    const currentY = getPointerClientXY(e).y;
    offsetY = currentY - startY;
    dragCard.style.transform = `translateY(${offsetY}px) scale(1.03)`;

    const origTop = parseFloat(dragCard.style.top);
    const dragMid =
      origTop + offsetY + dragCard.getBoundingClientRect().height / 2;
    repositionPlaceholder(container, placeholder, dragCard, cardRects, dragMid);
  }

  function onEnd() {
    if (!dragCard) return;

    container.insertBefore(dragCard, placeholder);
    placeholder.remove();

    clearFloatingStyles(dragCard);
    document.body.classList.remove("dragging");

    persistCardOrder(container);

    dragCard = null;
    placeholder = null;
  }

  function onStart(e) {
    const card = resolveDragCard(e, container);
    if (!card) return;
    dragCard = card;
    e.preventDefault();

    const cards = [...container.querySelectorAll(".currency-card")];
    cardRects = measureCardRects(cards);

    const rect = dragCard.getBoundingClientRect();
    startY = getPointerClientXY(e).y;
    offsetY = 0;

    placeholder = createPlaceholder(rect.height);
    applyFloatingStyles(dragCard, rect);

    dragCard.parentNode.insertBefore(placeholder, dragCard);
    document.body.appendChild(dragCard);
    document.body.classList.add("dragging");

    document.addEventListener("touchmove", onMove, { passive: false });
    document.addEventListener("mousemove", onMove);
    document.addEventListener("touchend", onEnd, { once: true });
    document.addEventListener("mouseup", onEnd, { once: true });
  }

  container.addEventListener("touchstart", onStart, { passive: false, signal });
  container.addEventListener("mousedown", onStart, { signal });

  container.addEventListener(
    "keydown",
    (e) => {
      if (!e.altKey || (e.key !== "ArrowUp" && e.key !== "ArrowDown")) return;
      const card = e.target.closest(".currency-card");
      if (!card || !container.contains(card)) return;
      e.preventDefault();
      if (e.key === "ArrowUp") {
        const prev = card.previousElementSibling;
        if (prev) container.insertBefore(card, prev);
      } else {
        const next = card.nextElementSibling;
        if (next) container.insertBefore(next, card);
      }
      persistCardOrder(container);
    },
    { signal },
  );
}
