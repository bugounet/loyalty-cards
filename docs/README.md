# Loyalty Cards — Documentation

Official documentation for the Loyalty Cards app. Start here and drill down.

## Product

- [**Overview**](./overview.md) — what the app does, who it's for, what it
  deliberately is *not*.
- [**User guide**](./user-guide.md) — screen-by-screen walkthrough: wallet,
  search, add/edit, scanner, card detail, activation zones, backup & restore.

## Engineering

- [**Architecture**](./architecture.md) — top-down view of the system (layers, nearby-cards flow).
- [**Data model**](./data-model.md) — `LoyaltyCard`, `ActivationZone`, storage
  keys, backup v1 format.
- [**Technical choices**](./technical-choices.md) — rationale and trade-offs for
  every major decision (React 19, Vite, `localStorage`, jsbarcode, Leaflet,
  Geolocation, PWA…).
- [**Development**](./development.md) — prerequisites, scripts, tests, build,
  deployment, PWA asset generation.

## Features

- [Card management](./features/card-management.md) — CRUD, search, logo, notes.
- [Barcode display](./features/barcode-display.md) — format detection chain and
  brightness boost.
- [Barcode scanner](./features/barcode-scanner.md) — camera input into the form.
- [GPS activation zones](./features/gps-activation.md) — nearby-card surfacing
  and zone management.

## Design

- [Design system](./design/SYSTEMDESIGN.md) — visual tokens, tonal layering, the
  no-line rule, typography.

