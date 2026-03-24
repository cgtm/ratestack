import en from './i18n/en.js';
import zh from './i18n/zh.js';
import hi from './i18n/hi.js';
import es from './i18n/es.js';
import ko from './i18n/ko.js';

let _lang = 'en';

export function setLang(lang) { _lang = lang; }
export function getLang() { return _lang; }

export const LANGUAGES = {
  en: { label: 'English',  flag: '\u{1F1EC}\u{1F1E7}', numberLocale: 'en-US' },
  ko: { label: '한국어',     flag: '\u{1F1F0}\u{1F1F7}', numberLocale: 'ko-KR' },
  zh: { label: '中文',      flag: '\u{1F1E8}\u{1F1F3}', numberLocale: 'zh-CN' },
  hi: { label: 'हिन्दी',     flag: '\u{1F1EE}\u{1F1F3}', numberLocale: 'hi-IN' },
  es: { label: 'Español',  flag: '\u{1F1EA}\u{1F1F8}', numberLocale: 'es-ES' },
};

const translations = { en, zh, hi, es, ko };

export function t(key, params) {
  let str = translations[_lang]?.[key] ?? translations.en[key] ?? key;
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      str = str.replace(`{{${k}}}`, v == null ? '' : String(v));
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

export function numberLocale() {
  return LANGUAGES[_lang]?.numberLocale ?? 'en-US';
}
