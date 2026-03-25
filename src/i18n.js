/**
 * Translation lookup and locale metadata. Language state lives here (not in `state.js`) so
 * `state.js` can import `numberLocale` / `t` without a circular import with the store.
 */
import en from "./i18n/en.js";
import zh from "./i18n/zh.js";
import hi from "./i18n/hi.js";
import es from "./i18n/es.js";
import ko from "./i18n/ko.js";
import ja from "./i18n/ja.js";

let _lang = "en";

export function setLang(lang) {
  _lang = lang;
}
export function getLang() {
  return _lang;
}

export const LANGUAGES = {
  en: { label: "English", flag: "\u{1F1EC}\u{1F1E7}", numberLocale: "en-US" },
  ko: { label: "한국어", flag: "\u{1F1F0}\u{1F1F7}", numberLocale: "ko-KR" },
  zh: { label: "中文", flag: "\u{1F1E8}\u{1F1F3}", numberLocale: "zh-CN" },
  hi: { label: "हिन्दी", flag: "\u{1F1EE}\u{1F1F3}", numberLocale: "hi-IN" },
  es: { label: "Español", flag: "\u{1F1EA}\u{1F1F8}", numberLocale: "es-ES" },
  ja: { label: "日本語", flag: "\u{1F1EF}\u{1F1F5}", numberLocale: "ja-JP" },
};

const translations = { en, zh, hi, es, ko, ja };

export function t(key, params) {
  let str = translations[_lang]?.[key] ?? translations.en[key] ?? key;
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      str = str.replace(`{{${k}}}`, v == null ? "" : String(v));
    });
  }
  return str;
}

export function currencyName(code) {
  return t(`currency.${code}`);
}

export function regionName(region) {
  return t(`region.${region}`);
}

/**
 * Locale for `Intl` number formatting, separators, and relative time — prefers the browser /
 * system language (`navigator.language`) so digits match the user’s OS even when UI language
 * differs; falls back to the app language’s default when needed.
 */
export function numberLocale() {
  const fallback = LANGUAGES[getLang()]?.numberLocale ?? "en-US";
  if (typeof navigator === "undefined") return fallback;
  const raw =
    navigator.language || (navigator.languages && navigator.languages[0]);
  if (!raw || typeof raw !== "string") return fallback;
  const candidate = raw.trim();
  if (!candidate) return fallback;
  try {
    const resolved = Intl.NumberFormat.supportedLocalesOf([candidate], {
      localeMatcher: "lookup",
    });
    if (resolved.length > 0) return resolved[0];
  } catch {
    /* invalid tag */
  }
  return fallback;
}
