# Development

Everything you need to set up, test, build, and deploy the app locally.

## Prerequisites

- **Node.js 20+** (lockfile is generated with npm 10).
- **npm** — yarn and pnpm are not tested.
- Any modern browser for manual testing. The production target is mobile
  Chromium / WebKit; the dev experience is best on Chromium with DevTools.

## First-time setup

```bash
npm install
```

This pulls in React 19, Vite 5, Leaflet, `jsbarcode`, `react-barcode-scanner`
(and its bundled `zbar-wasm`), the Vitest stack, and the PWA plugin.

## Scripts

| Command               | What it does                                         |
|-----------------------|------------------------------------------------------|
| `npm run dev`         | Vite dev server. Open `http://localhost:5173/`.      |
| `npm run build`       | `tsc -b` then `vite build`. Output goes to `dist/`.  |
| `npm run preview`     | Serves the production build locally.                 |
| `npm run test`        | Vitest single run (config: `vitest.config.mjs`).     |
| `npm run test:watch`  | Vitest in watch mode.                                |
| `npm run lint`        | `tsc -b --pretty false` — strict type check as lint. |

There is no separate formatter — TypeScript plus consistent conventions do
the job.

## Dev-server URL

Vite is configured with `base: '/'`, so the app is served at the dev-server
root: `http://localhost:5173/`. If the app ever needs to be mounted under a
sub-path in production, update `base` in `vite.config.ts` together with the
manifest `start_url` / `scope`.

## Project layout

```
src/
├── App.tsx                       # View state, CRUD dispatch
├── App.test.tsx                  # Integration tests
├── main.tsx                      # React entry
├── types.ts                      # LoyaltyCard, ActivationZone
├── styles.css                    # Global styles, design tokens
├── components/                   # UI
├── hooks/                        # useCurrentPosition
├── storage/                      # localStorage persistence + backup
├── utils/                        # geo, barcode formats, image, brightness, ids
└── test/
    └── setup.ts                  # Vitest globals, mocks
```

## Testing

- **Framework:** Vitest 3 + `@testing-library/react` 16 + `happy-dom`.
- **Config:** `vitest.config.mjs` wires in `src/test/setup.ts` (stubs
  `localStorage`, `navigator.geolocation`, matchMedia, canvas where needed).
- **Test files:** unit tests next to their source (`foo.test.ts` beside
  `foo.ts`); the top-level integration test lives at `src/App.test.tsx`.
- **What to assert:** prefer Testing Library's *by role / label* queries over
  DOM-structure assertions. Integration tests drive whole flows (add a card,
  attach a zone, export backup, re-import).
- **Running a single file:** `npx vitest run src/utils/geo.test.ts`.

## PWA assets

Icons and maskable variants live under `public/` and were generated with
`@vite-pwa/assets-generator` from a source SVG. To regenerate:

```bash
npx pwa-assets-generator --preset minimal-2023 public/app-icon.svg
```

The generated PNGs (`pwa-64x64.png`, `pwa-192x192.png`, `pwa-512x512.png`,
`maskable-icon-512x512.png`) are referenced in `vite.config.ts`'s `manifest`
block and must be committed — the service-worker precache needs them at build
time.

## Build & deploy

```bash
npm run build
```

The output `dist/` is a static bundle. Serve it at the site root on any
HTTPS-capable static host. If the host mounts it under a sub-path instead,
update Vite's `base` and the manifest `start_url` / `scope` to match, and
ensure the `Service-Worker-Allowed` scope lines up.

**HTTPS is required** in production. Geolocation, MediaDevices, and the
service worker all refuse to work on non-secure origins (localhost excepted).

## Debugging tips

- **Blank page after a deploy.** Usually a stale service worker; hard-refresh
  the tab once to let `autoUpdate` take over.
- **Scanner never opens / never decodes.** Check the DevTools *Permissions*
  pane for the camera grant and that the page is served over HTTPS (or
  `localhost`).
- **Geolocation stuck at `checking`.** Usually a 10 s timeout without a fix.
  Check browser permissions and whether the OS is sharing location to the
  browser.
- **Barcode renders as text only.** Means the value didn't pass any
  format-specific checks. `utils/barcodeFormats.ts`'s `getBarcodeFormatCandidates`
  is where to investigate.
- **Service worker serving stale assets.** `registerType: 'autoUpdate'`
  picks up new versions on the next load — hard-refresh the tab once after a
  deploy to kick it.
