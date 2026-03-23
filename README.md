# RateStack

A fast, minimal currency converter designed for iPhone homescreens. Built as a Progressive Web App — no app store, no account, no install friction.

**Live:** [cgtm.github.io/ratestack](https://cgtm.github.io/ratestack/)

## Features

- **Instant conversion** — type in any currency field and all others update in real time
- **2–5 currencies** — pick your own set from 55 currencies across 9 regions
- **Drag to reorder** — hold the grip handle to rearrange cards
- **Live exchange rates** — fetched from [Open Exchange Rates API](https://open.er-api.com), refreshable on demand
- **Offline support** — service worker caches the app and last-fetched rates
- **Homescreen install** — add via Safari for a standalone, full-screen app experience
- **Dark UI** — designed for comfortable use at any time

## Install on iPhone

1. Open [cgtm.github.io/ratestack](https://cgtm.github.io/ratestack/) in Safari
2. Tap the **Share** button (square with arrow)
3. Tap **Add to Home Screen**
4. Open from your homescreen — it runs as a standalone app

## Tech Stack

- Vanilla JavaScript (ES modules, no framework, no build step)
- Tailwind CSS (CDN)
- Service worker for offline caching
- GitHub Pages for hosting
- GitHub Actions for automatic deployment

## Project Structure

```
app.js          → Entry point — event binding, boot logic
state.js        → Shared state, localStorage persistence, formatting
api.js          → Rate fetching, conversion calculation, rate labels
converter.js    → Converter card rendering, input handling
drag.js         → Touch and mouse drag-and-drop reordering
settings.js     → Settings panel UI, open/close logic
currencies.js   → Currency data and region groupings (55 currencies)
index.html      → App shell with Tailwind config
style.css       → Minimal custom CSS (gradient text, transitions, safe areas)
sw.js           → Service worker — caches static assets and API responses
manifest.json   → PWA manifest for homescreen install
deploy.yml      → GitHub Action — stamps cache version and deploys to Pages
```

## Development

Serve locally with any static HTTP server:

```sh
python3 -m http.server 8080
```

Then open [localhost:8080](http://localhost:8080).

## Deployment

Push to `main`. The GitHub Action automatically:

1. Stamps `sw.js` with the commit hash (busts the service worker cache)
2. Deploys to the `gh-pages` branch
3. GitHub Pages serves the updated app

The app detects new versions on launch and reloads automatically.
