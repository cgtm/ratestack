import { test, expect } from "@playwright/test";
import {
  mockRatesApi,
  openWithCurrencies,
  waitForConverter,
  cardInput,
  cardClose,
} from "./helpers.js";

test.describe("Converter", () => {
  test.beforeEach(async ({ page }) => {
    await mockRatesApi(page);
  });

  test("shows loading skeleton then renders currency cards", async ({ page }) => {
    // Delay the API response so the loading skeleton is observable
    const delay = (route) => new Promise((r) => setTimeout(r, 600)).then(() => route.continue());
    await page.route("**/frankfurter.app/**", delay);
    await page.route("**/open.er-api.com/**", delay);

    await openWithCurrencies(page, ["USD", "EUR"]);

    // Loading skeleton should appear while waiting for rates
    await expect(page.locator('[aria-busy="true"]')).toBeVisible({ timeout: 3000 });

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

  test("rate label shows exchange rate below non-base card", async ({ page }) => {
    await openWithCurrencies(page, ["USD", "EUR"]);
    await waitForConverter(page);

    const rateLabel = page.locator('.currency-card[data-code="EUR"] .currency-rate');
    await expect(rateLabel).toContainText("1 USD");
    await expect(rateLabel).toContainText("EUR");
  });

  test("active card gets accent border, others get default border", async ({ page }) => {
    await openWithCurrencies(page, ["USD", "EUR", "GBP"]);
    await waitForConverter(page);

    // Click EUR input to make it active
    await cardInput(page, "EUR").click();

    const eurCard = page.locator('.currency-card[data-code="EUR"]');
    await expect(eurCard).toHaveClass(/border-accent/);

    const usdCard = page.locator('.currency-card[data-code="USD"]');
    await expect(usdCard).not.toHaveClass(/border-accent/);
  });

  test("removing a card via close button keeps converter visible", async ({ page }) => {
    await openWithCurrencies(page, ["USD", "EUR", "GBP"]);
    await waitForConverter(page);

    await cardClose(page, "GBP").click();

    await expect(page.locator('.currency-card[data-code="GBP"]')).not.toBeVisible();
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

    await expect(page.locator('.currency-card[data-code="USD"] .card-copy')).toBeVisible();
    await expect(page.locator('.currency-card[data-code="EUR"] .card-copy')).toBeVisible();
  });

  test("refresh button triggers spinner", async ({ page }) => {
    await openWithCurrencies(page, ["USD", "EUR"]);
    await waitForConverter(page);

    // Slow down the next API response so we can observe the spinner
    const delay = (route) => setTimeout(() => route.continue(), 500);
    await page.route("**/frankfurter.app/**", delay);
    await page.route("**/open.er-api.com/**", delay);

    const refreshBtn = page.locator("#refresh-btn");
    await refreshBtn.click();
    await expect(refreshBtn.locator("svg")).toHaveClass(/animate-spin/);
  });
});
