# RateStack

A fast, minimal currency converter designed for mobile homescreens. Built as a Progressive Web App — no app store, no account, no install friction.

**Live:** [cgtm.github.io/ratestack](https://cgtm.github.io/ratestack/)

## Features

- **Instant conversion** — type in any currency field and all others update in real time
- **2–5 currencies** — pick your own set from 60+ currencies across 10 regions
- **Drag to reorder** — hold the grip handle to rearrange cards
- **Swipe to remove** — swipe a card left to remove it from your set
- **Close button** — tap the X on any card to remove it quickly
- **Live exchange rates** — fetched from [Open Exchange Rates API](https://open.er-api.com), refreshable on demand
- **Offline support** — service worker caches the app and last-fetched rates
- **Homescreen install** — add via Safari (iOS) or Chrome (Android) for a standalone, full-screen app experience
- **10 themes** — five dark/light pairs: Default, Glowing, Arctic, Forest, and Ember
- **6 languages** — English, Korean, Chinese (Mandarin), Hindi, Spanish, and Japanese, with locale-aware number formatting
- **Settings saved** — inline confirmation whenever preferences change
- **Version footer** — version number and GitHub Issues link in the main view

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

- Vanilla JavaScript (ES modules, no framework)
- [Tailwind CSS v4](https://tailwindcss.com) (standalone CLI build in CI; optional Homebrew CLI locally)
- [Prettier](https://prettier.io) — formatting verified in CI (`npx`); no `package.json` required for local use
- Service worker for offline caching
- GitHub Pages for hosting
- GitHub Actions for CI/CD (format check, build, version tagging, deploy, releases)

## Project Structure

```
index.html                  App shell and layout
style.css                   Built CSS output (generated, do not edit)
sw.template.js              Service worker source (STATIC_ASSETS filled by script)
sw.js                       Generated service worker — do not edit by hand
manifest.json               PWA manifest for homescreen install
.prettierignore             Excludes generated CSS, sw.js, and build output from Prettier

scripts/
  generate-sw.mjs           Builds sw.js precache list from src/app.js imports + assets/

src/
  app.js                    Entry — bootstrap, wiring, service worker registration
  state.js                  Shared store, localStorage persistence, number formatting
  api.js                    Rate fetching, conversion math, timestamp / status UI
  converter.js              Re-exports `./converter/index.js` (stable import path)
  converter/
    index.js                Main conversion view — card list + gestures
    mount.js                Converter mount + rate row visibility
    cards.js                Card DOM, inputs, copy/close, drag/swipe wiring
    states.js               Empty and loading placeholder views
  drag.js                   Touch and mouse drag-and-drop reordering
  swipe.js                  Swipe-to-dismiss gesture handler
  pointer.js                Shared pointer coordinates (touch/mouse) for drag & swipe
  settings.js               Re-exports `./settings/index.js` (stable import path)
  settings/
    index.js                Settings facade — `syncShellLabels`, open/close, render panel
    overlay.js              Overlay open/close, focus trap, save confirmation
    dropdowns.js            Theme and language dropdowns
    currency.js             Currency list and region groups
  currencies.js             Currency metadata and region groupings
  theme.js                  Theme definitions (10 themes) and runtime application
  haptics.js                Light haptic feedback where supported
  i18n.js                   i18n orchestrator — language state, translation lookup
  styles.css                Tailwind v4 source CSS (@theme, custom styles)
  i18n/
    en.js, es.js, hi.js, ja.js, ko.js, zh.js   Locale JSON modules

assets/
  ui/icons.js               All inline SVG strings (shell, cards, settings; shell icons injected from app.js)
  icon.svg, icon-*.png      PWA icons; favicon.ico, favicon-32.png, apple-touch-icon.png

.github/workflows/
  deploy.yml                CI — Prettier check, pinned Tailwind build, generate sw.js, stamp, deploy
```

## Development

### Local server

Serve with any static HTTP server:

```sh
python3 -m http.server 8080
```

Then open [localhost:8080](http://localhost:8080).

### Building CSS

Install the Tailwind CLI via Homebrew:

```sh
brew install tailwindcss
```

Build (or rebuild) the output CSS:

```sh
tailwindcss -i src/styles.css -o style.css --minify
```

Use `--watch` during development for automatic rebuilds:

```sh
tailwindcss -i src/styles.css -o style.css --watch
```

`style.css` is the generated output and should not be edited directly. All custom CSS lives in `src/styles.css`.

### Service worker precache

The deploy workflow runs `node scripts/generate-sw.mjs` after the CSS build and before copying to `dist/`, so **the live site always gets a correct `sw.js`** from the current tree—you do not need to run the script locally for production.

Run it yourself when you change modules or assets under `src/` or `assets/` if you want the **committed** `sw.js` to match (and for accurate local offline/service-worker testing). Same idea as rebuilding `style.css` after editing `src/styles.css`.

```sh
node scripts/generate-sw.mjs
```

It reads `sw.template.js` and writes `sw.js`. The precache list follows the `import` graph from `src/app.js` plus every file under `assets/`.

### Formatting (Prettier)

CI runs `prettier --check` on every deploy. Format locally without a `package.json` (pin matches CI):

```sh
npx --yes prettier@3.5.3 --write .
```

Generated `style.css`, `sw.js`, and `dist/` are ignored via `.prettierignore`.

## Deployment

Push to `main`. The GitHub Action automatically:

1. **Bumps the version** if the commit message contains `[patch]`, `[minor]`, or `[major]`
2. **Checks Prettier** — fails the job if the repo is not formatted
3. **Builds Tailwind CSS** using the standalone Linux CLI (release pinned in the workflow file)
4. **Generates `sw.js`** from `sw.template.js` and the module graph
5. **Stamps** the version into the app footer and the commit hash into the service worker cache name
6. **Deploys** to the `gh-pages` branch (served by GitHub Pages)
7. **Creates a GitHub Release** with auto-generated notes (marked pre-release while the major version is 0)

The workflow can also be triggered manually from the Actions tab via `workflow_dispatch`.

### Versioning

Semver tags are managed automatically by the CI pipeline. Add a keyword to your commit message to trigger a bump:

- `[patch]` — bug fixes, small tweaks (v0.1.0 → v0.1.1)
- `[minor]` — new features (v0.1.1 → v0.2.0)
- `[major]` — breaking changes (v0.2.0 → v1.0.0)

Commits without a keyword deploy normally but don't create a new version.
