/**
 * Vitest global setup: replace happy-dom's incomplete localStorage
 * with a fully-spec-compliant in-memory implementation before each test.
 */
import { beforeEach, vi } from "vitest";

function makeLocalStorage() {
  let _store = {};
  return {
    getItem: (key) => (key in _store ? _store[key] : null),
    setItem: (key, value) => {
      _store[key] = String(value);
    },
    removeItem: (key) => {
      delete _store[key];
    },
    clear: () => {
      _store = {};
    },
    get length() {
      return Object.keys(_store).length;
    },
    key: (i) => Object.keys(_store)[i] ?? null,
  };
}

// Stub a fresh localStorage before every test so each test is isolated.
beforeEach(() => {
  vi.stubGlobal("localStorage", makeLocalStorage());
});
