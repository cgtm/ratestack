/**
 * Empty and loading placeholder views for the converter area.
 */
import { t } from "../i18n.js";
import { store } from "../state.js";
import {
  mountConverterRoot,
  setRateInfoVisible,
  setRateTimestampPending,
} from "./mount.js";

const LOADING_SKEL_CARD =
  "rounded-2xl border border-brd bg-surface px-[18px] py-4 animate-pulse";

function buildEmptyStateContent() {
  const wrapper = document.createElement("div");
  wrapper.className =
    "flex flex-col items-center justify-center text-center py-20 gap-3";

  const msg = document.createElement("p");
  msg.className = "main-view-muted text-[15px] leading-relaxed";
  msg.textContent = t("empty.message");

  const btn = document.createElement("button");
  btn.className =
    "text-accent font-semibold text-[15px] underline underline-offset-2 cursor-pointer bg-transparent border-none";
  btn.textContent = t("empty.link");
  btn.addEventListener("click", () => {
    document.getElementById("settings-btn").click();
  });

  wrapper.appendChild(msg);
  wrapper.appendChild(btn);
  return wrapper;
}

export function renderEmptyState() {
  setRateInfoVisible(false);
  mountConverterRoot(buildEmptyStateContent());
}

function loadingSkeletonCardCount() {
  return Math.max(2, Math.min(store.selected.length || 3, 5));
}

function buildLoadingSkeletonInnerHtml() {
  return `
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2.5">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded bg-brd/80"></div>
            <div class="space-y-1.5">
              <div class="h-4 w-14 rounded bg-brd/80"></div>
              <div class="h-3 w-24 rounded bg-brd/60"></div>
            </div>
          </div>
        </div>
        <div class="flex gap-1">
          <div class="w-8 h-8 rounded bg-brd/60"></div>
          <div class="w-8 h-8 rounded bg-brd/60"></div>
        </div>
      </div>
      <div class="flex items-baseline gap-1">
        <div class="h-4 w-6 rounded bg-brd/60"></div>
        <div class="h-9 flex-1 rounded bg-brd/50"></div>
      </div>
      <div class="h-3 w-32 rounded bg-brd/40 mt-3"></div>
    `;
}

function buildLoadingStateContent() {
  const wrap = document.createElement("div");
  wrap.className = "flex flex-col gap-3 w-full";
  wrap.setAttribute("aria-busy", "true");
  wrap.setAttribute("aria-label", t("rates.loading"));

  const n = loadingSkeletonCardCount();
  for (let i = 0; i < n; i++) {
    const sk = document.createElement("div");
    sk.className = LOADING_SKEL_CARD;
    sk.setAttribute("aria-hidden", "true");
    sk.innerHTML = buildLoadingSkeletonInnerHtml();
    wrap.appendChild(sk);
  }

  const hint = document.createElement("p");
  hint.className = "text-center text-xs main-view-muted pt-1";
  hint.textContent = t("rates.loading");
  wrap.appendChild(hint);

  return wrap;
}

export function renderLoadingState() {
  setRateInfoVisible(true);
  setRateTimestampPending();
  mountConverterRoot(buildLoadingStateContent());
}
