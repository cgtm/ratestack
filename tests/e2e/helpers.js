/**
 * Shared E2E helpers: API mocking, localStorage seeding, and common selectors.
 */

/** All mock rates keyed by base — used by both Frankfurter and er-api responses. */
const ALL_RATES = {
  USD: { USD: 1, EUR: 0.92, GBP: 0.79, JPY: 149.5, KRW: 1320 },
  EUR: { EUR: 1, USD: 1.087, GBP: 0.858, JPY: 162.5, KRW: 1434 },
};

/** Mock exchange rate response for USD base (er-api shape, kept for test compatibility). */
export const MOCK_RATES_USD = {
  result: "success",
  base_code: "USD",
  rates: ALL_RATES.USD,
};

/** Mock exchange rate response for EUR base (er-api shape, kept for test compatibility). */
export const MOCK_RATES_EUR = {
  result: "success",
  base_code: "EUR",
  rates: ALL_RATES.EUR,
};

/**
 * Intercept exchange rate requests from both Frankfurter and er-api.
 * Must be called before `page.goto()`.
 */
export async function mockRatesApi(page, ratesByBase = {}) {
  const ratesMap = { ...ALL_RATES, ...ratesByBase };

  // Frankfurter: GET /latest?from=USD&symbols=EUR,GBP
  await page.route("**/frankfurter.app/**", (route) => {
    const url = new URL(route.request().url());
    const base = (url.searchParams.get("from") || "USD").toUpperCase();
    const symbols = (url.searchParams.get("symbols") || "")
      .split(",")
      .filter(Boolean);
    const allRates = ratesMap[base] ?? ratesMap.USD;
    const rates = {};
    for (const s of symbols) {
      if (allRates[s] !== undefined) rates[s] = allRates[s];
    }
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ base, date: "2026-01-01", rates }),
    });
  });

  // er-api: GET /v6/latest/USD (fallback for exotic currencies)
  await page.route("**/open.er-api.com/**", (route) => {
    const url = route.request().url();
    const base = url.split("/").pop().toUpperCase();
    const allRates = ratesMap[base] ?? ratesMap.USD;
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        result: "success",
        base_code: base,
        rates: allRates,
      }),
    });
  });
}

/**
 * Seed localStorage with a saved state before the page loads.
 * Call this in a `page.addInitScript` before `page.goto()`.
 */
export function seedState(state) {
  return { key: "ratestack", value: JSON.stringify(state) };
}

/** Pre-seed the page with 2 selected currencies and open the app. */
export async function openWithCurrencies(
  page,
  selected = ["USD", "EUR"],
  extra = {},
) {
  const state = { selected, theme: "default", lang: "en", ...extra };
  await page.addInitScript(
    ({ key, value }) => localStorage.setItem(key, value),
    seedState(state),
  );
  await page.goto("/");
}

/** Wait for the converter cards to be visible. */
export async function waitForConverter(page) {
  await page.waitForSelector(".currency-card", { timeout: 8000 });
}

/** Get the input element for a given currency code. */
export function cardInput(page, code) {
  return page.locator(`.currency-card[data-code="${code}"] .currency-input`);
}

/** Get the close button for a given currency code. */
export function cardClose(page, code) {
  return page.locator(`.currency-card[data-code="${code}"] .card-close`);
}
