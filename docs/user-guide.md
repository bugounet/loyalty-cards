# User guide

A walk through every screen of the app, in the order most users encounter them.
In-app copy is in French; feature names in this guide are given with their
French label in parentheses.

## Installing the app

On Chrome/Edge/Safari, the browser offers an *Install* option once the site has
been visited. Installed, the app runs standalone with its own icon, works
offline (shell + last-seen cards), and auto-updates to the latest version on
launch. Nothing else changes — the PWA shares the same `localStorage` as the
browser tab that installed it.

## The wallet (`Mes cartes`)

The landing screen. It lists every stored card and offers:

- A **search field** — filters by card name, French-locale aware (accent and
  case insensitive).
- An **"Autour de toi"** block at the top when the device is inside one or more
  activation zones (see the *GPS activation zones* section below).
- A **"Nearby unavailable"** block at the bottom when location is denied,
  unsupported, or otherwise unreachable — with a retry button.
- A **+** button to add a new card.

Tapping a card opens its detail page (see below).

### Empty state

When the wallet is empty, a short illustrated prompt invites the user to add
their first card instead of showing an empty list.

## Adding or editing a card (`Ajouter / Modifier`)

The form has the same shape for both flows:

| Field           | Required | Notes                                               |
|-----------------|----------|-----------------------------------------------------|
| Name            | yes      | Used for search and fallback initials               |
| Loyalty number  | yes      | Can be typed, pasted, or scanned                    |
| Logo            | no       | From a local file or a URL; dominant colour is extracted for the accent |
| Accent colour   | no       | Auto-derived from the logo; user-overridable        |
| Note            | no       | Free text (e.g. "carte de Paul")                    |

### Scanning a barcode

Inside the form, a **"Scanner le code-barres"** button opens a compact camera
panel. The rear camera is preferred (`facingMode: 'environment'`). As soon as
the scanner decodes a value:

1. The field is populated with the decoded value.
2. A green confirmation message appears (*"Code détecté."*).
3. The scanner panel closes automatically.

If the camera can't be accessed (denied, no camera, insecure origin), an inline
error message explains the problem and the form stays usable — manual entry
always works.

### Logo upload

Two sources:

- **Local file** — image is read as a data URL and stored inline (so backups
  remain portable and work offline).
- **URL** — fetched once, rasterised into a data URL; if the fetch fails the
  form keeps the previously entered data untouched.

In both cases the dominant colour is computed and suggested as the accent
colour, which the user can override from the built-in palette.

## Card detail page (`Détails de la carte`)

Opened from the wallet. Sections top-to-bottom:

1. **Identity header** — logo (or fallback initials on the accent colour), card
   name, optional note.
2. **Scannable barcode** — rendered with [`jsbarcode`](./features/barcode-display.md).
   The readable loyalty number appears directly below.
3. **Brightness boost** — on mount, the page silently asks the browser to bump
   the screen brightness. Successes, "unsupported", and "rejected" states are
   all memoised so later visits don't trigger a permission prompt loop.
4. **Activation zones panel** — list of zones attached to this card, with an
   *Add zone at current location* action and per-zone edit/delete.
5. **Back / Edit / Delete** actions.

See [features/barcode-display.md](./features/barcode-display.md) for how the
right barcode format is chosen.

## GPS activation zones

A zone is a point (lat/lng) plus a radius in metres — a circle on the map. The
app uses zones to decide which cards to surface in the *"Autour de toi"*
section.

### Adding a zone

From the card detail page:

1. Tap **"Ajouter un lieu"**.
2. The app requests the current GPS position (one-shot, 10 s timeout, no
   high-accuracy request, no cache).
3. The new zone is stored with that position, a default radius of **250 m**,
   and an auto-generated label (*Lieu 1*, *Lieu 2*, …) that is freely editable.

A preset radius picker offers **50 / 100 / 250 / 500 m** for quick tuning.

### Viewing zones on a map

Each zone appears as a circle on a Leaflet map backed by OpenStreetMap tiles.
Attribution is shown per the OSM usage policy. There is no geocoding, no place
search, and no manual lat/lng entry — zones are always captured from the
current GPS reading. Tiles are fetched on demand; there is no offline caching.

### Editing / deleting a zone

Each zone row in the panel exposes rename, radius, and delete controls. No
confirmation dialog for delete — undo is out of scope.

### Surfacing nearby cards in the wallet

Opening the wallet asks for the current GPS position if at least one card has
zones attached and the status is `idle`. When a position is obtained:

- For each card, the **closest matching zone** (distance ≤ radius) is selected.
- Matching cards are sorted by distance and rendered under the *"Autour de
  toi"* block.
- If no card matches, the block disappears.
- If the user denies the permission or the device is offline from GPS, a retry
  prompt is shown instead at the bottom of the wallet.

Distance is computed with the Haversine formula against the centre of each
zone (`src/utils/geo.ts`).

## Settings and backup / restore

The settings view exposes:

- **Export** — generates a JSON backup (`version: 1`, cards with their icons
  inlined as a separate `icons` array tied by id). The file is handed to the
  browser's download flow.
- **Import** — accepts a v1 JSON file. Invalid files are rejected with a
  descriptive message; no partial import.

See [data-model.md](./data-model.md) for the exact backup schema.
