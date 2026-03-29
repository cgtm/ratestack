# RateStack

A fast, minimal currency converter designed for mobile homescreens. Built as a Progressive Web App — no app store, no account, no install friction.

**Live:** [cgtm.github.io/ratestack](https://cgtm.github.io/ratestack/)

## Features

- **Instant conversion** — type in any currency field and all others update in real time
- **2–5 currencies** — pick your own set from 60+ currencies across 10 regions
- **Drag to reorder** — hold the grip handle to rearrange cards
- **Swipe to remove** — swipe a card left to remove it from your set
- **Live exchange rates** — fetched from [Frankfurter](https://frankfurter.dev) (ECB data, no auth) for major currencies, with automatic fallback to [ExchangeRate-API](https://www.exchangerate-api.com) for exotic currencies; refreshable on demand
- **Offline support** — service worker caches the app and last-fetched rates
- **Homescreen install** — add via Safari (iOS) or Chrome (Android) for a standalone, full-screen app experience
- **10 themes** — five dark/light pairs: Default, Glowing, Arctic, Forest, and Ember; plus an Auto option that follows the OS preference
- **6 languages** — English, Korean, Chinese (Mandarin), Hindi, Spanish, and Japanese, with locale-aware number formatting
- **Native number formats** — tap the format icon on a card to switch between standard and native grouping (만/억 for CJK currencies; lakh/crore for South Asian currencies) — useful for copying a value to paste elsewhere
- **Settings saved automatically** — changes apply immediately; a Done button closes the panel

## Install

### iPhone

1. Open [cgtm.github.io/ratestack](https://cgtm.github.io/ratestack/) in Safari
2. Tap the **Share** button (square with arrow)
3. Tap **Add to Home Screen**
4. Open from your homescreen — it runs as a standalone app

### Android

1. Open [cgtm.github.io/ratestack](https://cgtm.github.io/ratestack/) in Chrome
2. Tap the **menu** (three dots) → **Add to Home screen** (or accept the install banner if prompted)

## Tech Stack

- Vanilla JavaScript (ES modules, no framework, no bundler)
- [Tailwind CSS v4](https://tailwindcss.com) (CLI via `@tailwindcss/cli` devDependency)
- [Prettier](https://prettier.io) — auto-applied on commit via pre-commit hook
- [Vitest](https://vitest.dev) — unit tests (130 tests, ~400ms)
- [Playwright](https://playwright.dev) — E2E tests (60 tests across mobile and desktop viewports)
- Service worker for offline caching
- GitHub Pages for hosting
- GitHub Actions for CI/CD (unit + E2E tests, build, version stamp, deploy, releases)

## Project Structure

```
index.html                  App shell and layout
style.css                   Built CSS output (generated, do not edit)
sw.template.js              Service worker source (STATIC_ASSETS filled by script)
sw.js                       Generated service worker — do not edit by hand
manifest.json               PWA manifest for homescreen install

scripts/
  generate-sw.mjs           Builds sw.js precache list from src/app.js imports + assets/
  commit.mjs                Version-aware commit wrapper (used via git c alias)

src/
  app.js                    Entry — bootstrap, wiring, global listeners, service worker registration
  actions.js                Coordination layer — bridges data and UI, owns rate fetch logic
  currencies.js             Currency metadata and region groupings
  theme.js                  Theme definitions (10 themes + auto) and runtime application
  haptics.js                Light haptic feedback where supported
  i18n.js                   i18n orchestrator — language state, translation lookup
  styles.css                Tailwind v4 source CSS (@theme, custom styles)

  data/
    store.js                Shared state object and localStorage persistence
    numbers.js              Number parsing, formatting, conversion math (cached Intl formatters)
    rates.js                Rate fetching — Frankfurter for ECB currencies, er-api fallback
    native-format.js        Native number grouping (CJK 万/億, South Asian lakh/crore)

  ui/
    shell.js                Shell icon injection and label sync
    converter.js            Main conversion view — card list, empty state, loading skeleton
    cards.js                Card DOM, inputs, copy/close button wiring
    card-format.js          Per-card value formatting helpers (native vs standard mode)
    status.js               Timestamp, stale/error/offline banners, disclaimer, refresh spinner
    settings.js             Settings overlay — open/close, focus trap, save confirmation
    dropdowns.js            Theme and language picker dropdowns
    currency-list.js        Currency selection list, selected strip, region groups

  gestures/
    drag.js                 Touch and mouse drag-and-drop reordering
    swipe.js                Swipe-to-dismiss gesture handler
    pointer.js              Shared pointer coordinates (touch/mouse) for drag & swipe

  i18n/
    en.js, es.js, hi.js, ja.js, ko.js, zh.js   Locale string modules

assets/
  ui/icons.js               All inline SVG strings (shell, cards, settings)
  icon.svg, icon-*.png      PWA icons; favicon.ico, favicon-32.png, apple-touch-icon.png

tests/
  setup.js                  Vitest global setup (localStorage stub)
  unit/
    actions.test.js         Rate refresh, currency removal, stale detection
    numbers.test.js         Locale parsing, formatting, conversion math
    native-format.test.js   Native number grouping (CJK 万/億, lakh/crore)
    rates.test.js           API routing (Frankfurter vs er-api), response parsing, errors
    store.test.js           State persistence, corrupted JSON recovery
    theme.test.js           Theme resolution, CSS variable application
  e2e/
    helpers.js              Shared fixtures — API mocks, localStorage seeding, selectors
    converter.test.js       Conversion flow, card interactions, loading states
    settings.test.js        Settings panel, currency selection, theme/language switching
    offline.test.js         Offline banner, reconnect, API error states

.github/workflows/
  deploy.yml                CI — unit tests, E2E tests, build, version stamp, deploy, releases
.githooks/
  pre-commit                Auto-formats with Prettier, runs unit tests
```

## Development

### Setup

```sh
npm install   # installs devDependencies and wires git hooks + push.followTags
```

### Local server

```sh
npm run dev   # python3 -m http.server 8080
```

Then open [localhost:8080](http://localhost:8080).

### Building CSS

```sh
npm run build:css   # builds style.css from src/styles.css
```

Use `--watch` during development for automatic rebuilds:

```sh
npx tailwindcss -i src/styles.css -o style.css --watch
```

`style.css` is generated output — do not edit it directly. All custom CSS lives in `src/styles.css`.

### Service worker

The deploy workflow regenerates `sw.js` from the current module graph before every deploy. Run it locally if you want the committed `sw.js` to reflect recent changes to `src/` or `assets/`:

```sh
npm run build:sw
```

### Testing

```sh
npm test              # unit tests (Vitest)
npm run test:watch    # unit tests in watch mode
npm run test:e2e      # E2E tests (Playwright) — requires a server on :8080
npm run test:all      # unit + E2E
```

The pre-commit hook runs `npm test` automatically before every commit.

### Formatting

Prettier runs automatically on commit. To format manually:

```sh
npm run format
```

## Deployment

Push to `main`. The GitHub Action automatically:

1. **Runs unit tests** (Vitest)
2. **Runs E2E tests** (Playwright, Chromium only in CI)
3. **Builds Tailwind CSS** via `npm run build:css`
4. **Generates `sw.js`** from `sw.template.js` and the module graph
5. **Stamps** the version from `package.json` into the app footer and the commit hash into the service worker cache name
6. **Deploys** to the `gh-pages` branch (served by GitHub Pages)
7. **Creates a GitHub Release** with auto-generated notes if a version tag points to the deployed commit (marked pre-release while major version is 0)

The workflow can also be triggered manually from the Actions tab via `workflow_dispatch`.

### Versioning

Version bumps happen automatically on commit via git hooks. Include a keyword in any commit message:

```sh
git commit -m "fix: something [patch]"    # bumps patch, e.g. 0.9.1 → 0.9.2
git commit -m "feat: something [minor]"   # bumps minor, e.g. 0.9.2 → 0.10.0
git commit -m "feat: something [major]"   # bumps major, e.g. 0.10.0 → 1.0.0
git commit -m "chore: something"          # no bump, deploys as-is
```

The `prepare-commit-msg` hook bumps `package.json` and stages it automatically. The `post-commit` hook creates an annotated tag. `push.followTags` (set by `npm install`) pushes the tag alongside the branch automatically.

- `[patch]` — bug fixes, small tweaks
- `[minor]` — new features
- `[major]` — breaking changes
