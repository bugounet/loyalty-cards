# Overview

Loyalty Cards is a **local-first progressive web app** for storing, retrieving,
and presenting loyalty cards at checkout. It replaces the plastic-and-paper
wallet with a private, installable app that runs entirely on the device.

## What it does

- **Holds a wallet of cards.** Each card has a name, a loyalty number, and
  optionally a logo, an accent colour, and a free-form note.
- **Presents them at checkout.** The detail page renders a real, scannable
  barcode and — when the platform allows — brightens the screen automatically
  so cashiers' scanners can read it.
- **Captures numbers without typing.** The add/edit form can invoke the camera
  to scan an existing card's barcode and fill the number field.
- **Finds the right card at the right time.** Each card can be pinned to one or
  more GPS *activation zones* (for example, the front door of a supermarket).
  When the app opens inside a zone, the matching cards float to the top of the
  wallet under an *"Autour de toi"* section.
- **Backs itself up.** The settings screen exports the wallet — icons included —
  to a JSON file that can be re-imported on another device.

## Who it's for

People who carry too many loyalty cards, prefer offline-first tools, and don't
want to hand their shopping history over to a third-party wallet service. The UI
copy is in French; the codebase and this documentation are in English.

## Principles

- **Local-first.** Data lives in `localStorage`. There is no account, no server,
  no sync. Losing the device (or clearing site data) loses the wallet — hence
  the backup export.
- **Privacy-preserving geolocation.** GPS is sampled on demand, one shot per
  session, and never runs in the background. Matching is done locally with a
  Haversine distance calculation.
- **Progressive enhancement.** Missing APIs degrade gracefully: no camera →
  manual entry still works; no Geolocation / permission denied → the *nearby*
  section is just hidden or replaced by a retry prompt; no Screen Brightness API
  → the barcode simply displays at the ambient brightness.
- **Mobile-first, no compromises on layout.** 44-pixel touch targets, tonal
  surfaces instead of 1px dividers, type scale tuned for a phone held at arm's
  length. See the [design system](./design/SYSTEMDESIGN.md).

## Out of scope

The app intentionally does **not** ship:

- Accounts, auth, or cross-device sync.
- Server-side storage or analytics.
- A rewards, offers, or transactions feed.
- Address / place search or reverse geocoding.
- Continuous background location tracking.
- Offline map tiles or custom tile caching.
- Polygon activation zones (only circular, radius-based).
- QR code scanning or generation.

These constraints are deliberate — they keep the code small, the permissions
footprint minimal, and the privacy promise real.

## Where to go next

- End-user workflows: [User guide](./user-guide.md).
- How it's built: [Architecture](./architecture.md).
- Why it's built that way: [Technical choices](./technical-choices.md).
