# RateStack

A fast, minimal currency converter designed for mobile homescreens. Built as a Progressive Web App — no app store, no account, no install friction.

**Live:** [cgtm.github.io/ratestack](https://cgtm.github.io/ratestack/)

## Features

- **Instant conversion** — type in any currency field and all others update in real time
- **2–5 currencies** — pick your own set from 55+ currencies across 10 regions
- **Drag to reorder** — hold the grip handle to rearrange cards
- **Swipe to remove** — swipe a card left to remove it from your set
- **Close button** — tap the X on any card to remove it quickly
- **Live exchange rates** — fetched from [Open Exchange Rates API](https://open.er-api.com), refreshable on demand
- **Offline support** — service worker caches the app and last-fetched rates
- **Homescreen install** — add via Safari (iOS) or Chrome (Android) for a standalone, full-screen app experience
- **10 themes** — five dark/light pairs: Default, Glowing, Arctic, Forest, and Ember
- **5 languages** — English, Korean, Chinese, Hindi, and Spanish with locale-aware number formatting
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
- [Tailwind CSS v4](https://tailwindcss.com) (standalone CLI build)
- Service worker for offline caching
- GitHub Pages for hosting
- GitHub Actions for CI/CD (build, version tagging, deploy, releases)

## Project Structure

```
index.html                  App shell and layout
style.css                   Built CSS output (generated, do not edit)
sw.js                       Service worker — caches static assets and API responses
manifest.json               PWA manifest for homescreen install

src/
  app.js                    Entry point — event binding, service worker registration, boot
  state.js                  Shared store, localStorage persistence, number formatting
  api.js                    Rate fetching, conversion math, timestamp display
  converter.js              Currency card rendering, input handling, remove logic
  drag.js                   Touch and mouse drag-and-drop reordering
  swipe.js                  Swipe-to-dismiss gesture handler
  settings.js               Settings panel UI, theme/language dropdowns, save confirmation
  currencies.js             Currency metadata and region groupings
  theme.js                  Theme definitions (10 themes) and runtime application
  i18n.js                   i18n orchestrator — language state, translation lookup
  styles.css                Tailwind v4 source CSS (@theme, custom styles)
  i18n/
    en.js                   English translations
    ko.js                   Korean translations
    zh.js                   Chinese (Mandarin) translations
    hi.js                   Hindi translations
    es.js                   Spanish translations

assets/
  favicon.ico               Favicon (48×48)
  favicon-32.png            Favicon (32×32)
  icon.svg                  SVG icon
  icon-192.png              PWA icon (192×192)
  icon-512.png              PWA icon (512×512)
  apple-touch-icon.png      iOS homescreen icon (180×180)

.github/workflows/
  deploy.yml                CI/CD — build, version bump, deploy, release
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

## Deployment

Push to `main`. The GitHub Action automatically:

1. **Bumps the version** if the commit message contains `[patch]`, `[minor]`, or `[major]`
2. **Builds Tailwind CSS** using the standalone CLI
3. **Stamps** the version into the app footer and the commit hash into the service worker cache name
4. **Deploys** to the `gh-pages` branch (served by GitHub Pages)
5. **Creates a GitHub Release** with auto-generated notes (pre-release while < v1.0.0)

The workflow can also be triggered manually from the Actions tab via `workflow_dispatch`.

### Versioning

Semver tags are managed automatically by the CI pipeline. Add a keyword to your commit message to trigger a bump:

- `[patch]` — bug fixes, small tweaks (v0.1.0 → v0.1.1)
- `[minor]` — new features (v0.1.1 → v0.2.0)
- `[major]` — breaking changes (v0.2.0 → v1.0.0)

Commits without a keyword deploy normally but don't create a new version.
