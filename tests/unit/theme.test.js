import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { resolveThemeName, applyTheme, THEMES } from "../../src/theme.js";

// ─── resolveThemeName ─────────────────────────────────────────────────────────

describe("resolveThemeName", () => {
  function mockPrefersDark(matches) {
    vi.stubGlobal("window", {
      matchMedia: vi.fn(() => ({ matches })),
    });
  }

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the name unchanged for any named theme", () => {
    for (const name of Object.keys(THEMES)) {
      expect(resolveThemeName(name)).toBe(name);
    }
  });

  it("resolves 'auto' to 'default' when OS prefers dark", () => {
    mockPrefersDark(true);
    expect(resolveThemeName("auto")).toBe("default");
  });

  it("resolves 'auto' to 'light' when OS prefers light", () => {
    mockPrefersDark(false);
    expect(resolveThemeName("auto")).toBe("light");
  });

  it("handles window being undefined gracefully", () => {
    vi.stubGlobal("window", undefined);
    // Should not throw; picks the dark default (matches = undefined → falsy)
    expect(() => resolveThemeName("auto")).not.toThrow();
  });
});

// ─── THEMES catalog ───────────────────────────────────────────────────────────

describe("THEMES", () => {
  const REQUIRED_KEYS = [
    "bg", "surface", "brd", "main", "dim",
    "accent", "accent-secondary", "accent-glow", "accent-bg",
  ];

  it("every theme has all required color keys", () => {
    for (const [name, theme] of Object.entries(THEMES)) {
      for (const key of REQUIRED_KEYS) {
        expect(theme.colors[key], `${name} missing colors.${key}`).toBeDefined();
      }
    }
  });

  it("paired dark/light themes all exist", () => {
    const pairs = ["default/light", "sunset/sunset-light", "arctic/arctic-light", "forest/forest-light", "ember/ember-light"];
    for (const pair of pairs) {
      const [dark, light] = pair.split("/");
      expect(THEMES[dark], `missing dark theme: ${dark}`).toBeDefined();
      expect(THEMES[light], `missing light theme: ${light}`).toBeDefined();
    }
  });
});

// ─── applyTheme ───────────────────────────────────────────────────────────────

describe("applyTheme", () => {
  let rootStyle;
  let metaContent;

  beforeEach(() => {
    // happy-dom provides document; spy on setProperty and meta
    rootStyle = {};
    vi.spyOn(document.documentElement.style, "setProperty").mockImplementation(
      (key, value) => { rootStyle[key] = value; },
    );

    const meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    document.head.appendChild(meta);

    vi.spyOn(meta, "setAttribute").mockImplementation((attr, val) => {
      if (attr === "content") metaContent = val;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.head.innerHTML = "";
    rootStyle = {};
    metaContent = undefined;
  });

  it("sets CSS variables for a named theme", () => {
    applyTheme("arctic");
    expect(rootStyle["--color-bg"]).toBe(THEMES.arctic.colors.bg);
    expect(rootStyle["--color-accent"]).toBe(THEMES.arctic.colors.accent);
  });

  it("falls back to default theme for unknown name", () => {
    applyTheme("nonexistent-theme");
    expect(rootStyle["--color-bg"]).toBe(THEMES.default.colors.bg);
  });
});
