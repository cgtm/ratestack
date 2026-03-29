import { test, expect } from "@playwright/test";
import {
  mockRatesApi,
  openWithCurrencies,
  waitForConverter,
  cardInput,
  cardClose,
} from "./helpers.js";

function nativeBtn(page, code) {
  return page.locator(`.currency-card[data-code="${code}"] .native-format-btn`);
}

test.describe("Converter", () => {
  test.beforeEach(async ({ page }) => {
    await mockRatesApi(page);
  });

  test("shows loading skeleton then renders currency cards", async ({
    page,
  }) => {
    // Delay the API response so the loading skeleton is observable
    const delay = (route) =>
      new Promise((r) => setTimeout(r, 600)).then(() => route.fallback());
    await page.route(/frankfurter\.app/, delay);
    await page.route("**/open.er-api.com/**", delay);

    await openWithCurrencies(page, ["USD", "EUR"]);

    // Loading skeleton should appear while waiting for rates
    await expect(page.locator('[aria-busy="true"]')).toBeVisible({
      timeout: 3000,
    });

    // Cards appear after rates load
    await waitForConverter(page);
    await expect(page.locator('.currency-card[data-code="USD"]')).toBeVisible();
    await expect(page.locator('.currency-card[data-code="EUR"]')).toBeVisible();
  });

  test("shows empty state when no currencies selected", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/select between 2 and 5/i)).toBeVisible();
  });

  test("typing an amount converts other currencies", async ({ page }) => {
    await openWithCurrencies(page, ["USD", "EUR"]);
    await waitForConverter(page);

    await cardInput(page, "USD").fill("100");
    await cardInput(page, "USD").press("Tab"); // trigger recalculate via focus logic

    // 100 USD * 0.92 = 92.00 EUR
    await expect(cardInput(page, "EUR")).toHaveValue(/92/);
  });

  test("rate label shows exchange rate below non-base card", async ({
    page,
  }) => {
    await openWithCurrencies(page, ["USD", "EUR"]);
    await waitForConverter(page);

    const rateLabel = page.locator(
      '.currency-card[data-code="EUR"] .currency-rate',
    );
    await expect(rateLabel).toContainText("1 USD");
    await expect(rateLabel).toContainText("EUR");
  });

  test("active card gets accent border, others get default border", async ({
    page,
  }) => {
    await openWithCurrencies(page, ["USD", "EUR", "GBP"]);
    await waitForConverter(page);

    // Click EUR input to make it active
    await cardInput(page, "EUR").click();

    const eurCard = page.locator('.currency-card[data-code="EUR"]');
    await expect(eurCard).toHaveClass(/border-accent/);

    const usdCard = page.locator('.currency-card[data-code="USD"]');
    await expect(usdCard).not.toHaveClass(/border-accent/);
  });

  test("removing a card via close button keeps converter visible", async ({
    page,
  }) => {
    await openWithCurrencies(page, ["USD", "EUR", "GBP"]);
    await waitForConverter(page);

    await cardClose(page, "GBP").click();

    await expect(
      page.locator('.currency-card[data-code="GBP"]'),
    ).not.toBeVisible();
    await expect(page.locator('.currency-card[data-code="USD"]')).toBeVisible();
  });

  test("removing card below minimum shows empty state", async ({ page }) => {
    await openWithCurrencies(page, ["USD", "EUR"]);
    await waitForConverter(page);

    await cardClose(page, "EUR").click();

    await expect(page.getByText(/select between 2 and 5/i)).toBeVisible();
  });

  test("copy button is present on each card", async ({ page }) => {
    await openWithCurrencies(page, ["USD", "EUR"]);
    await waitForConverter(page);

    await expect(
      page.locator('.currency-card[data-code="USD"] .card-copy'),
    ).toBeVisible();
    await expect(
      page.locator('.currency-card[data-code="EUR"] .card-copy'),
    ).toBeVisible();
  });

  test.describe("native number format", () => {
    // KRW rate: 1320/USD. Typing "1" → 1,320 KRW (below 10,000 threshold).
    // Typing "10" → 13,200 KRW (above threshold).
    // INR rate: 83.5/USD. Typing "1500" → 125,250 INR (above 100,000 threshold).

    test("native format button hidden when value below threshold", async ({
      page,
    }) => {
      await openWithCurrencies(page, ["USD", "KRW"]);
      await waitForConverter(page);
      await cardInput(page, "USD").fill("1");
      await cardInput(page, "USD").press("Tab");
      // 1,320 KRW — below 10,000
      await expect(nativeBtn(page, "KRW")).toBeHidden();
    });

    test("native format button appears when KRW value reaches threshold", async ({
      page,
    }) => {
      await openWithCurrencies(page, ["USD", "KRW"]);
      await waitForConverter(page);
      await cardInput(page, "USD").fill("10");
      await cardInput(page, "USD").press("Tab");
      // 13,200 KRW — above 10,000
      await expect(nativeBtn(page, "KRW")).toBeVisible();
    });

    test("tapping native format button switches to 만-grouped display", async ({
      page,
    }) => {
      await openWithCurrencies(page, ["USD", "KRW"]);
      await waitForConverter(page);
      await cardInput(page, "USD").fill("10");
      await cardInput(page, "USD").press("Tab");
      await nativeBtn(page, "KRW").click();
      // 13,200 → "1만 3,200원"
      await expect(cardInput(page, "KRW")).toHaveValue("1만 3,200원");
    });

    test("tapping native format button again reverts to standard display", async ({
      page,
    }) => {
      await openWithCurrencies(page, ["USD", "KRW"]);
      await waitForConverter(page);
      await cardInput(page, "USD").fill("10");
      await cardInput(page, "USD").press("Tab");
      await nativeBtn(page, "KRW").click();
      await nativeBtn(page, "KRW").click();
      await expect(cardInput(page, "KRW")).toHaveValue("13,200");
    });

    test("native format button absent on the active (base) card", async ({
      page,
    }) => {
      await openWithCurrencies(page, ["USD", "KRW"]);
      await waitForConverter(page);
      // USD is the base card — no native format button regardless of value
      await expect(nativeBtn(page, "USD")).toBeHidden();
    });

    test("clicking base card in native mode resets to standard and makes it base", async ({
      page,
    }) => {
      await openWithCurrencies(page, ["USD", "KRW"]);
      await waitForConverter(page);
      // Set KRW as base with a high value, then enable native mode on USD
      await cardInput(page, "USD").fill("10");
      await cardInput(page, "USD").press("Tab");
      // KRW is now non-base; put it in native mode
      await nativeBtn(page, "KRW").click();
      await expect(cardInput(page, "KRW")).toHaveValue("1만 3,200원");
      // Now click the KRW input to make it the base — native mode should reset
      await cardInput(page, "KRW").click();
      // Input should be editable and show a standard numeric value (no 만/원)
      const val = await cardInput(page, "KRW").inputValue();
      expect(val).not.toContain("만");
      expect(val).not.toContain("원");
    });

    test("native format button appears for INR when value reaches lakh threshold", async ({
      page,
    }) => {
      await openWithCurrencies(page, ["USD", "INR"]);
      await waitForConverter(page);
      await cardInput(page, "USD").fill("1500");
      await cardInput(page, "USD").press("Tab");
      // 1500 * 83.5 = 125,250 INR — above 100,000
      await expect(nativeBtn(page, "INR")).toBeVisible();
    });

    test("INR native format uses lakh grouping", async ({ page }) => {
      await openWithCurrencies(page, ["USD", "INR"]);
      await waitForConverter(page);
      await cardInput(page, "USD").fill("1500");
      await cardInput(page, "USD").press("Tab");
      await nativeBtn(page, "INR").click();
      // 125,250 → "1,25,250.00"
      await expect(cardInput(page, "INR")).toHaveValue("1,25,250.00");
    });

    test("native format button absent for non-native currency (EUR)", async ({
      page,
    }) => {
      await openWithCurrencies(page, ["USD", "EUR"]);
      await waitForConverter(page);
      await cardInput(page, "USD").fill("1000000");
      await cardInput(page, "USD").press("Tab");
      await expect(nativeBtn(page, "EUR")).toBeHidden();
    });
  });

  test("refresh button triggers spinner", async ({ page }) => {
    await openWithCurrencies(page, ["USD", "EUR"]);
    await waitForConverter(page);

    // Slow down the next API response so we can observe the spinner
    const delay = (route) => setTimeout(() => route.fallback(), 500);
    await page.route(/frankfurter\.app/, delay);
    await page.route("**/open.er-api.com/**", delay);

    const refreshBtn = page.locator("#refresh-btn");
    await refreshBtn.click();
    await expect(refreshBtn.locator("svg")).toHaveClass(/animate-spin/);
  });
});
