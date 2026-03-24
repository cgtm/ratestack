import en from './i18n/en.js';
import ko from './i18n/ko.js';

let _lang = 'en';

export function setLang(lang) { _lang = lang; }
export function getLang() { return _lang; }

export const LANGUAGES = {
  en: { label: 'English', flag: '\u{1F1EC}\u{1F1E7}', numberLocale: 'en-US' },
  ko: { label: '\uD55C\uAD6D\uC5B4',   flag: '\u{1F1F0}\u{1F1F7}', numberLocale: 'ko-KR' },
};

const translations = { en, ko };

export function t(key, params) {
  let str = translations[_lang]?.[key] ?? translations.en[key] ?? key;
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      str = str.replace(`{{${k}}}`, v);
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
