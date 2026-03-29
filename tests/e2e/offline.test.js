import { test, expect } from "@playwright/test";
import {
  mockRatesApi,
  openWithCurrencies,
  waitForConverter,
} from "./helpers.js";

test.describe("Offline behaviour", () => {
  test("shows offline banner when network is unavailable", async ({
    page,
    context,
  }) => {
    await mockRatesApi(page);
    await openWithCurrencies(page, ["USD", "EUR"]);
    await waitForConverter(page);

    await context.setOffline(true);

    // Trigger a status refresh (the app polls every 60s, but we can trigger
    // it directly by clicking refresh)
    await page.locator("#refresh-btn").click();

    await expect(page.locator("#rate-offline")).toBeVisible();
    await expect(page.locator("#rate-offline")).toContainText(/offline/i);
  });

  test("hides offline banner when network returns", async ({
    page,
    context,
  }) => {
    await mockRatesApi(page);
    await openWithCurrencies(page, ["USD", "EUR"]);
    await waitForConverter(page);

    await context.setOffline(true);
    await page.locator("#refresh-btn").click();
    await expect(page.locator("#rate-offline")).toBeVisible();

    await context.setOffline(false);
    await page.locator("#refresh-btn").click();
    await expect(page.locator("#rate-offline")).not.toBeVisible();
  });

  test("shows error indicator when API request fails", async ({ page }) => {
    // Override both APIs to return a 500
    const fail500 = (route) =>
      route.fulfill({ status: 500, body: "Internal Server Error" });
    await page.route("**/frankfurter.app/**", fail500);
    await page.route("**/open.er-api.com/**", fail500);
    await openWithCurrencies(page, ["USD", "EUR"]);

    // Wait for the error state to appear
    await expect(page.locator("#rate-error")).toBeVisible({ timeout: 8000 });
    await expect(page.locator("#rate-error")).toContainText(
      /could not update/i,
    );
  });
});
