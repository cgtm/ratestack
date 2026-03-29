import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 15000,
  retries: 1,

  use: {
    baseURL: "http://localhost:8080",
    // Mobile-first: test on a standard phone viewport
    ...devices["iPhone 14"],
    // Always use chromium headless shell (installed above)
    browserName: "chromium",
    // Intercept API calls so tests don't depend on live exchange rates
    serviceWorkers: "block",
  },

  projects: [
    { name: "mobile", use: { ...devices["iPhone 14"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],

  webServer: {
    command: "python3 -m http.server 8080",
    url: "http://localhost:8080",
    reuseExistingServer: !process.env.CI,
    timeout: 10000,
  },
});
