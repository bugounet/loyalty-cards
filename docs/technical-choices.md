# Technical choices

A short justification for every non-obvious pick in the stack, and the
trade-offs it implies.

## React 19 + TypeScript (strict) + Vite 5

- **React 19.** Latest stable major; ergonomic hooks, good DevTools, small API
  surface — a safe default for an app that is mostly view state and form
  handling.
- **TypeScript strict mode.** `tsc -b --pretty false` is the `lint` script:
  type errors *are* the lint. The data-model validators in
  `cardsStorage.ts` then enforce that the types actually match what lives on
  disk.
- **Vite 5.** Fast dev server, first-class PWA plugin, ESM-native, no Webpack
  configuration. The base path is the site root (`/`), configured in
  `vite.config.ts`; adjust it if the app ever needs to be mounted under a
  sub-path.

## No router

There is no `react-router` or equivalent. `App.tsx` manages a
`View = 'wallet' | 'add' | 'edit' | 'detail' | 'settings'` in `useState`.

**Why:** the app has no shareable URLs and no back-stack semantics that the
browser can meaningfully help with. Adding a router would mean 10+ kB of code,
URL parsing, and a second source of truth for navigation — for no user-visible
benefit.

**Cost:** deep-linking to a specific card would require a rework. Acceptable
today; flag to re-evaluate if a *"share this card"* feature is ever introduced.

## `localStorage` over IndexedDB

Every card (including inline-encoded logos) is serialised in a single JSON
blob under `loyalty-cards:v1`.

**Why:**
- Loyalty wallets are small (tens, not thousands of cards). The full payload
  fits well under the typical 5 MB per-origin quota even with inline logos.
- Synchronous access simplifies the render path — no `await` on boot, no
  suspense juggling.
- Export/import becomes a one-liner: `JSON.parse` / `JSON.stringify` the same
  shape the app already uses at runtime.

**Cost:**
- Quota is a hard ceiling. If it's hit, `saveCards` returns a failure and the
  UI flags it — but there's no graceful migration story. Logos are data URLs
  inline, which is the first thing we'd move to IndexedDB if pressure appears.

## `jsbarcode` for rendering

Dedicated, format-aware barcode renderer — 7 formats supported (EAN-13, EAN-8,
UPC, CODE39, ITF, codabar, CODE128). We use it in tandem with a custom
format-picker (`utils/barcodeFormats.ts`) that validates EAN-13 checksums and
falls back through the supported formats before defaulting to CODE128. See
[features/barcode-display.md](./features/barcode-display.md).

Alternatives considered: rolling our own SVG renderer (too much format
surface) or embedding the number as plain text (cashier scanners need actual
bars — plain text fails the primary use case).

## `react-barcode-scanner` + inline `zbar-wasm`

- **Why this scanner library:** it wraps `zbar-wasm` with a React-friendly
  component, supports rear-camera preference via `trackConstraints`, and hands
  us decoded values in a single callback — no state machine to wire up.
- **Why the `zbar-inlined` Vite condition:** by default, `zbar-wasm` ships as a
  separate file loaded at runtime. For a PWA that wants to work on first
  launch after install, we want the wasm inlined into the bundle. The custom
  condition (`resolve.conditions: ['zbar-inlined']` in `vite.config.ts`)
  selects the in-lined entry point.

**Cost:** a heavier JS bundle. In exchange, the scanner works offline and on
the first open.

## Leaflet + OpenStreetMap tiles

- **Why Leaflet:** small, stable, imperative API that plays nicely with
  React via `react-leaflet`. No API key, no billing setup.
- **Why OSM tiles:** free, open-data licence, good enough coverage for a
  feature that only needs to show a circle on a map.

**Cost:** tiles require a network round-trip on first view and respect the OSM
attribution / usage policy (rendered in the map widget). No offline tile
caching — intentional; see *Out of scope* in the [overview](./overview.md).

### Licence note on `react-leaflet`

`react-leaflet` has historically shipped under the Hippocratic License 2.1.
That license imposes usage restrictions on the library itself but **does not
restrict downstream projects**, which are free to choose their own licence —
hence this project being MIT. If the upstream licence changes again, this
remains compatible as long as the downstream MIT does not import clauses from
it.

## Native Geolocation, one-shot, no background

`useCurrentPosition` calls `navigator.geolocation.getCurrentPosition` with
`enableHighAccuracy: false`, `maximumAge: 0`, `timeout: 10000`. Never
`watchPosition`.

**Why:**
- Battery: no background sampling.
- Privacy: a loyalty wallet has no business knowing where the user is at all
  times. One-shot matches the actual use case (*"am I at the shop right
  now?"*).
- Permissions UX: browsers are increasingly aggressive about re-prompting for
  `watchPosition`. One-shot keeps the prompt to once per session.

The state machine (`idle | checking | granted | denied | unavailable |
unsupported`) gives the UI the vocabulary it needs without leaking the raw
`GeolocationPositionError` into components.

## Haversine over planar approximation

`utils/geo.ts` uses the full Haversine formula with Earth radius
6 371 000 m. Planar approximations are faster but break at high latitudes and
near the antimeridian. For tens of zones per user, the cost is nil and the
guarantees are worth it.

## `vite-plugin-pwa` with `registerType: 'autoUpdate'`

A new service worker takes over on the next page load without asking the user.

**Why:** for a private, single-user app, the refresh-loop friction of `prompt`
mode isn't worth it. The worker is small, updates are rare, and the manifest
`start_url` / `scope` pin everything to the site root (`/`).

**Cost:** a user on a stale tab can briefly have outdated assets. Accepted —
the app has no long-lived views where this matters.

## Vitest + happy-dom + Testing Library

- **Vitest** reuses Vite's resolver and transform — no duplicated build
  pipeline.
- **happy-dom** rather than jsdom: faster, good enough for this feature set
  (we don't test heavy CSS or canvas internals — canvas used by jsbarcode is
  stubbed where needed).
- **Testing Library**'s *query by role / label* pattern is enforced in every
  integration test; component internals are not asserted.

## Icons: `lucide-react`

Tree-shakeable, 2 px-stroke line icons that match the design system's no-line
rule (outlines stay visually light). Consistent visual weight across the app
with no custom SVG pipeline.

## What was considered and dropped

| Alternative                 | Why not                                         |
|-----------------------------|-------------------------------------------------|
| `react-router`              | No URL semantics needed.                        |
| IndexedDB (via Dexie, idb-keyval) | Overkill for current data volume.         |
| A state manager (Zustand, Redux) | `useState` + persistence is sufficient.    |
| Mapbox / Google Maps        | API keys, billing, attribution overhead.        |
| Tailwind / CSS-in-JS        | Global CSS with tokens matches the design system's tonal approach cleanly. |
| QR scanning/generation      | Loyalty barcodes are almost always 1D.          |
