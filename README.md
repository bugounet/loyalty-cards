# Loyalty Cards

A local-first loyalty card wallet — install it as a PWA, keep your cards on-device,
scan or type in loyalty numbers, and let your phone surface the right card when you
walk into the shop.

## Features

- **Manual wallet** — add, edit, search, and delete loyalty cards with logo, accent
  colour, and free-form note.
- **Camera barcode scanner** — point the rear camera at a barcode to fill the
  loyalty-number field automatically (`react-barcode-scanner`, zbar-wasm under the
  hood).
- **Scannable barcode display** — the card detail page renders a real barcode
  (EAN-13 / EAN-8 / UPC / CODE39 / ITF / codabar / CODE128) and, when supported,
  boosts screen brightness so checkout scanners can read it.
- **GPS activation zones** — attach one or more activation zones to a card from
  your current position; the wallet automatically surfaces nearby cards when you
  open the app inside a zone.
- **Backup & restore** — export your wallet (icons included) to a portable JSON
  file and re-import it on another device.
- **Installable PWA** — standalone install on Android / iOS / desktop, offline
  shell via a service worker that auto-updates.
- **Local-first & private** — no accounts, no sync, no server. Everything lives in
  `localStorage`. Geolocation is one-shot; nothing runs in the background.

## Quick start

```bash
npm install
npm run dev         # http://localhost:5173/
```

The app is served at the site root (see [`vite.config.ts`](./vite.config.ts)).

Build and preview the production bundle:

```bash
npm run build
npm run preview
```

## Tech stack

| Layer      | Choice                                            |
|------------|---------------------------------------------------|
| UI         | React 19 + TypeScript 5 (strict)                  |
| Build      | Vite 5, `vite-plugin-pwa` (autoUpdate)            |
| Barcode    | `jsbarcode` (render) + `react-barcode-scanner` (scan) |
| Maps       | Leaflet + OpenStreetMap tiles                     |
| Icons      | `lucide-react`                                    |
| Storage    | `localStorage` (key `loyalty-cards:v1`)           |
| Testing    | Vitest + Testing Library + happy-dom              |

See [`docs/technical-choices.md`](./docs/technical-choices.md) for the rationale
behind each choice.

## Project structure

```
src/
├── App.tsx               # Top-level view state & routing
├── components/           # UI components (wallet, forms, barcode, map, nearby)
├── hooks/                # useCurrentPosition
├── storage/              # localStorage persistence + backup format
├── utils/                # geo, barcode formats, image & brightness helpers
└── types.ts              # LoyaltyCard, ActivationZone
docs/                     # Official documentation
public/                   # PWA icons, favicons
```

## Documentation

Start with [`docs/README.md`](./docs/README.md). Highlights:

- [Overview](./docs/overview.md) — what the app is and where the boundaries are.
- [User guide](./docs/user-guide.md) — every screen and flow, in plain English.
- [Architecture](./docs/architecture.md) — layers, data flow, mermaid diagrams.
- [Technical choices](./docs/technical-choices.md) — why React 19, why Leaflet,
  why `localStorage`, why no router…
- [Data model](./docs/data-model.md) — `LoyaltyCard`, `ActivationZone`, storage
  keys, backup format.
- Feature deep-dives under [`docs/features/`](./docs/features/).
- [Development](./docs/development.md) — scripts, testing, deployment.
- [Design system](./docs/design/SYSTEMDESIGN.md) — visual language and tokens.

## Testing

```bash
npm run test          # single run
npm run test:watch    # watch mode
npm run lint          # tsc -b, strict type check
```

## License

[MIT](./LICENSE) © 2026 bugounet.
