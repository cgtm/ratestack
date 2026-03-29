import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "happy-dom",
    include: ["tests/unit/**/*.test.js"],
    setupFiles: ["tests/setup.js"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.js"],
      exclude: [
        "src/i18n/**", // locale string data — not logic
        "src/app.js", // DOM bootstrap and global event wiring
        "src/haptics.js", // browser vibration API
        "src/ui/**", // DOM manipulation — covered by Playwright
        "src/gestures/**", // touch/pointer event handlers — covered by Playwright
      ],
      reporter: ["text", "html"],
      reportsDirectory: "coverage",
    },
  },
});
