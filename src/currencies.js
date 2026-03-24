/**
 * Static catalog for the settings UI. Order: Popular first, then geography; codes may appear only once.
 * Display names for the app come from i18n `currency.*` keys, not the `name` field below.
 */
export const CURRENCY_REGIONS = [
  { region: 'Popular', codes: ['USD', 'EUR', 'GBP', 'JPY', 'KRW', 'AUD', 'CAD', 'CHF', 'CNY'] },
  { region: 'Europe', codes: ['SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF', 'RON', 'BGN', 'ISK', 'RUB', 'UAH'] },
  { region: 'East Asia', codes: ['HKD', 'TWD', 'MOP'] },
  { region: 'North America', codes: ['MXN'] },
  { region: 'South America', codes: ['BRL', 'ARS', 'CLP', 'COP', 'PEN', 'UYU'] },
  { region: 'South Asia', codes: ['INR', 'PKR', 'BDT', 'LKR', 'NPR'] },
  { region: 'Southeast Asia', codes: ['SGD', 'THB', 'MYR', 'IDR', 'PHP', 'VND'] },
  { region: 'Middle East', codes: ['TRY', 'ILS', 'AED', 'SAR', 'QAR', 'KWD', 'BHD', 'OMR', 'JOD'] },
  { region: 'Africa', codes: ['ZAR', 'NGN', 'KES', 'EGP', 'MAD', 'GHS', 'TZS', 'UGX', 'ETB'] },
  { region: 'Oceania', codes: ['NZD', 'FJD'] },
];

export const CURRENCIES = {
  // North America
  USD: { flag: '\u{1F1FA}\u{1F1F8}', name: 'US Dollar', symbol: '$' },
  CAD: { flag: '\u{1F1E8}\u{1F1E6}', name: 'Canadian Dollar', symbol: 'C$' },
  MXN: { flag: '\u{1F1F2}\u{1F1FD}', name: 'Mexican Peso', symbol: 'Mex$' },
  // South America
  BRL: { flag: '\u{1F1E7}\u{1F1F7}', name: 'Brazilian Real', symbol: 'R$' },
  ARS: { flag: '\u{1F1E6}\u{1F1F7}', name: 'Argentine Peso', symbol: 'ARS$' },
  CLP: { flag: '\u{1F1E8}\u{1F1F1}', name: 'Chilean Peso', symbol: 'CLP$' },
  COP: { flag: '\u{1F1E8}\u{1F1F4}', name: 'Colombian Peso', symbol: 'COL$' },
  PEN: { flag: '\u{1F1F5}\u{1F1EA}', name: 'Peruvian Sol', symbol: 'S/' },
  UYU: { flag: '\u{1F1FA}\u{1F1FE}', name: 'Uruguayan Peso', symbol: '$U' },
  // Europe
  EUR: { flag: '\u{1F1EA}\u{1F1FA}', name: 'Euro', symbol: '\u20AC' },
  GBP: { flag: '\u{1F1EC}\u{1F1E7}', name: 'British Pound', symbol: '\u00A3' },
  CHF: { flag: '\u{1F1E8}\u{1F1ED}', name: 'Swiss Franc', symbol: 'Fr' },
  SEK: { flag: '\u{1F1F8}\u{1F1EA}', name: 'Swedish Krona', symbol: 'kr' },
  NOK: { flag: '\u{1F1F3}\u{1F1F4}', name: 'Norwegian Krone', symbol: 'kr' },
  DKK: { flag: '\u{1F1E9}\u{1F1F0}', name: 'Danish Krone', symbol: 'kr' },
  PLN: { flag: '\u{1F1F5}\u{1F1F1}', name: 'Polish Z\u0142oty', symbol: 'z\u0142' },
  CZK: { flag: '\u{1F1E8}\u{1F1FF}', name: 'Czech Koruna', symbol: 'K\u010D' },
  HUF: { flag: '\u{1F1ED}\u{1F1FA}', name: 'Hungarian Forint', symbol: 'Ft' },
  RON: { flag: '\u{1F1F7}\u{1F1F4}', name: 'Romanian Leu', symbol: 'lei' },
  BGN: { flag: '\u{1F1E7}\u{1F1EC}', name: 'Bulgarian Lev', symbol: '\u043B\u0432' },
  ISK: { flag: '\u{1F1EE}\u{1F1F8}', name: 'Icelandic Kr\u00F3na', symbol: 'kr' },
  RUB: { flag: '\u{1F1F7}\u{1F1FA}', name: 'Russian Ruble', symbol: '\u20BD' },
  UAH: { flag: '\u{1F1FA}\u{1F1E6}', name: 'Ukrainian Hryvnia', symbol: '\u20B4' },
  // Middle East
  TRY: { flag: '\u{1F1F9}\u{1F1F7}', name: 'Turkish Lira', symbol: '\u20BA' },
  ILS: { flag: '\u{1F1EE}\u{1F1F1}', name: 'Israeli Shekel', symbol: '\u20AA' },
  AED: { flag: '\u{1F1E6}\u{1F1EA}', name: 'UAE Dirham', symbol: '\u062F.\u0625' },
  SAR: { flag: '\u{1F1F8}\u{1F1E6}', name: 'Saudi Riyal', symbol: '\uFDFC' },
  QAR: { flag: '\u{1F1F6}\u{1F1E6}', name: 'Qatari Riyal', symbol: 'QR' },
  KWD: { flag: '\u{1F1F0}\u{1F1FC}', name: 'Kuwaiti Dinar', symbol: '\u062F.\u0643' },
  BHD: { flag: '\u{1F1E7}\u{1F1ED}', name: 'Bahraini Dinar', symbol: 'BD' },
  OMR: { flag: '\u{1F1F4}\u{1F1F2}', name: 'Omani Rial', symbol: '\uFDFC' },
  JOD: { flag: '\u{1F1EF}\u{1F1F4}', name: 'Jordanian Dinar', symbol: 'JD' },
  // Africa
  ZAR: { flag: '\u{1F1FF}\u{1F1E6}', name: 'South African Rand', symbol: 'R' },
  NGN: { flag: '\u{1F1F3}\u{1F1EC}', name: 'Nigerian Naira', symbol: '\u20A6' },
  KES: { flag: '\u{1F1F0}\u{1F1EA}', name: 'Kenyan Shilling', symbol: 'KSh' },
  EGP: { flag: '\u{1F1EA}\u{1F1EC}', name: 'Egyptian Pound', symbol: 'E\u00A3' },
  MAD: { flag: '\u{1F1F2}\u{1F1E6}', name: 'Moroccan Dirham', symbol: 'MAD' },
  GHS: { flag: '\u{1F1EC}\u{1F1ED}', name: 'Ghanaian Cedi', symbol: 'GH\u20B5' },
  TZS: { flag: '\u{1F1F9}\u{1F1FF}', name: 'Tanzanian Shilling', symbol: 'TSh' },
  UGX: { flag: '\u{1F1FA}\u{1F1EC}', name: 'Ugandan Shilling', symbol: 'USh' },
  ETB: { flag: '\u{1F1EA}\u{1F1F9}', name: 'Ethiopian Birr', symbol: 'Br' },
  // East Asia
  JPY: { flag: '\u{1F1EF}\u{1F1F5}', name: 'Japanese Yen', symbol: '\u00A5' },
  KRW: { flag: '\u{1F1F0}\u{1F1F7}', name: 'South Korean Won', symbol: '\u20A9' },
  CNY: { flag: '\u{1F1E8}\u{1F1F3}', name: 'Chinese Yuan', symbol: '\u00A5' },
  HKD: { flag: '\u{1F1ED}\u{1F1F0}', name: 'Hong Kong Dollar', symbol: 'HK$' },
  TWD: { flag: '\u{1F1F9}\u{1F1FC}', name: 'Taiwan Dollar', symbol: 'NT$' },
  MOP: { flag: '\u{1F1F2}\u{1F1F4}', name: 'Macanese Pataca', symbol: 'MOP$' },
  // South Asia
  INR: { flag: '\u{1F1EE}\u{1F1F3}', name: 'Indian Rupee', symbol: '\u20B9' },
  PKR: { flag: '\u{1F1F5}\u{1F1F0}', name: 'Pakistani Rupee', symbol: '\u20A8' },
  BDT: { flag: '\u{1F1E7}\u{1F1E9}', name: 'Bangladeshi Taka', symbol: '\u09F3' },
  LKR: { flag: '\u{1F1F1}\u{1F1F0}', name: 'Sri Lankan Rupee', symbol: 'Rs' },
  NPR: { flag: '\u{1F1F3}\u{1F1F5}', name: 'Nepalese Rupee', symbol: 'Rs' },
  // Southeast Asia
  SGD: { flag: '\u{1F1F8}\u{1F1EC}', name: 'Singapore Dollar', symbol: 'S$' },
  THB: { flag: '\u{1F1F9}\u{1F1ED}', name: 'Thai Baht', symbol: '\u0E3F' },
  MYR: { flag: '\u{1F1F2}\u{1F1FE}', name: 'Malaysian Ringgit', symbol: 'RM' },
  IDR: { flag: '\u{1F1EE}\u{1F1E9}', name: 'Indonesian Rupiah', symbol: 'Rp' },
  PHP: { flag: '\u{1F1F5}\u{1F1ED}', name: 'Philippine Peso', symbol: '\u20B1' },
  VND: { flag: '\u{1F1FB}\u{1F1F3}', name: 'Vietnamese Dong', symbol: '\u20AB' },
  // Oceania
  AUD: { flag: '\u{1F1E6}\u{1F1FA}', name: 'Australian Dollar', symbol: 'A$' },
  NZD: { flag: '\u{1F1F3}\u{1F1FF}', name: 'New Zealand Dollar', symbol: 'NZ$' },
  FJD: { flag: '\u{1F1EB}\u{1F1EF}', name: 'Fijian Dollar', symbol: 'FJ$' },
};
