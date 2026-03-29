import { test, expect } from "@playwright/test";
import {
  mockRatesApi,
  openWithCurrencies,
  waitForConverter,
} from "./helpers.js";

test.describe("Settings", () => {
  test.beforeEach(async ({ page }) => {
    await mockRatesApi(page);
  });

  async function openSettings(page) {
    await page.locator("#settings-btn").click();
    await expect(page.locator("#settings-panel")).toBeVisible();
  }

  async function closeSettings(page) {
    await page.locator("#settings-close").click();
    await expect(page.locator("#settings-panel")).not.toBeVisible();
  }

  test("settings panel opens and closes", async ({ page }) => {
    await openWithCurrencies(page, ["USD", "EUR"]);
    await waitForConverter(page);

    await openSettings(page);
    await expect(page.locator("#settings-title")).toBeVisible();

    await closeSettings(page);
  });

  test("Escape key closes settings", async ({ page }) => {
    await openWithCurrencies(page, ["USD", "EUR"]);
    await waitForConverter(page);

    await openSettings(page);
    await page.keyboard.press("Escape");
    await expect(page.locator("#settings-panel")).not.toBeVisible();
  });

  test("clicking overlay backdrop closes settings", async ({ page }) => {
    await openWithCurrencies(page, ["USD", "EUR"]);
    await waitForConverter(page);

    await openSettings(page);
    // Click the overlay but not the panel itself
    await page.locator("#settings-overlay").click({ position: { x: 10, y: 10 } });
    await expect(page.locator("#settings-panel")).not.toBeVisible();
  });

  test("selecting a currency adds it to the converter", async ({ page }) => {
    await openWithCurrencies(page, ["USD", "EUR"]);
    await waitForConverter(page);

    await openSettings(page);
    // GBP should be in the list — click it to select
    await page.locator('[role="checkbox"][aria-checked="false"]')
      .filter({ hasText: "GBP" })
      .click();

    await closeSettings(page);

    await expect(page.locator('.currency-card[data-code="GBP"]')).toBeVisible();
  });

  test("deselecting a currency removes it from the converter", async ({ page }) => {
    await openWithCurrencies(page, ["USD", "EUR", "GBP"]);
    await waitForConverter(page);

    await openSettings(page);
    // GBP should be in the selected strip — click it to deselect
    await page.locator("#selected-list [role=\"checkbox\"][aria-checked=\"true\"]")
      .filter({ hasText: "GBP" })
      .click();

    await closeSettings(page);

    await expect(page.locator('.currency-card[data-code="GBP"]')).not.toBeVisible();
  });

  test("cannot select more than 5 currencies", async ({ page }) => {
    await openWithCurrencies(page, ["USD", "EUR", "GBP", "JPY", "KRW"]);
    await waitForConverter(page);

    await openSettings(page);

    // All unselected items should be disabled (opacity class)
    const unselected = page.locator('[role="checkbox"][aria-checked="false"]').first();
    await expect(unselected).toHaveClass(/cursor-not-allowed/);
  });

  test("changing theme applies new CSS variables", async ({ page }) => {
    await openWithCurrencies(page, ["USD", "EUR"]);
    await waitForConverter(page);

    await openSettings(page);

    // Open theme dropdown
    await page.locator("#theme-picker button[aria-haspopup='listbox']").click();

    // Select Arctic Dark
    await page.locator("#theme-dropdown-list [role='option']")
      .filter({ hasText: "Arctic Dark" })
      .click();

    // CSS var should now reflect arctic theme's accent color
    const accent = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--color-accent").trim()
    );
    expect(accent).toBe("#00d4aa");
  });

  test("changing language updates shell labels", async ({ page }) => {
    await openWithCurrencies(page, ["USD", "EUR"]);
    await waitForConverter(page);

    await openSettings(page);

    // Open language dropdown
    await page.locator("#language-picker button[aria-haspopup='listbox']").click();

    // Select Korean
    await page.locator("#lang-dropdown-list [role='option']")
      .filter({ hasText: "한국어" })
      .click();

    // Settings title should now be in Korean
    await expect(page.locator("#settings-title")).toHaveText("설정");
  });

  test("currency count display updates as currencies selected", async ({ page }) => {
    await openWithCurrencies(page, ["USD", "EUR"]);
    await waitForConverter(page);

    await openSettings(page);

    await expect(page.locator("#settings-count")).toHaveText("2 / 5");

    // Select one more
    await page.locator('[role="checkbox"][aria-checked="false"]')
      .filter({ hasText: "GBP" })
      .click();

    await expect(page.locator("#settings-count")).toHaveText("3 / 5");
  });
});
