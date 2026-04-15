import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CARDS_STORAGE_KEY, createCardsBackup, loadCards, parseCardsBackup, saveCards } from './cardsStorage';

const card = {
  id: 'card-1',
  name: 'Carrefour',
  loyaltyNumber: '123456789',
  createdAt: '2026-04-15T10:00:00.000Z',
  updatedAt: '2026-04-15T10:00:00.000Z'
};

const activationZone = {
  id: 'zone-1',
  label: 'Lieu 1',
  latitude: 48.8566,
  longitude: 2.3522,
  radiusMeters: 250,
  createdAt: '2026-04-16T10:00:00.000Z',
  updatedAt: '2026-04-16T10:00:00.000Z'
};

describe('cardsStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('loads an empty list when storage is empty', () => {
    expect(loadCards()).toEqual([]);
  });

  it('saves and loads cards from a versioned key', () => {
    saveCards([card]);

    expect(CARDS_STORAGE_KEY).toBe('loyalty-cards:v1');
    expect(localStorage.getItem('loyalty-cards:v1')).toContain('Carrefour');
    expect(loadCards()).toEqual([card]);
  });

  it('saves and loads cards with activation zones', () => {
    const cardWithZones = { ...card, activationZones: [activationZone] };

    saveCards([cardWithZones]);

    expect(loadCards()).toEqual([cardWithZones]);
  });

  it('returns an empty list for malformed JSON', () => {
    localStorage.setItem(CARDS_STORAGE_KEY, '{broken');

    expect(loadCards()).toEqual([]);
  });

  it('returns an empty list for incompatible data', () => {
    localStorage.setItem(CARDS_STORAGE_KEY, JSON.stringify({ cards: [card] }));

    expect(loadCards()).toEqual([]);
  });

  it('filters cards with non-string optional fields', () => {
    localStorage.setItem(
      CARDS_STORAGE_KEY,
      JSON.stringify([
        { ...card, logoDataUrl: 123 },
        { ...card, id: 'card-2', accentColor: false },
        { ...card, id: 'card-3', note: null }
      ])
    );

    expect(loadCards()).toEqual([]);
  });

  it('does not throw when localStorage save fails', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    });

    expect(saveCards([card])).toEqual({
      ok: false,
      message: "Impossible d'enregistrer les cartes sur cet appareil."
    });
  });

  it('creates a versioned JSON backup from cards', () => {
    const backup = JSON.parse(createCardsBackup([card], '2026-04-16T12:00:00.000Z'));

    expect(backup).toEqual({
      version: 1,
      exportedAt: '2026-04-16T12:00:00.000Z',
      cards: [card],
      icons: []
    });
  });

  it('extracts card logos into an icons backup section', () => {
    const logoCard = {
      ...card,
      logoDataUrl: 'data:image/webp;base64,logo-data'
    };

    const backup = JSON.parse(
      createCardsBackup([logoCard], '2026-04-16T12:00:00.000Z', () => 'icon-1')
    );

    expect(backup).toEqual({
      version: 1,
      exportedAt: '2026-04-16T12:00:00.000Z',
      cards: [
        {
          ...card,
          image: 'icon-1'
        }
      ],
      icons: [
        {
          id: 'icon-1',
          name: 'Carrefour',
          data: 'data:image/webp;base64,logo-data'
        }
      ]
    });
  });

  it('parses a valid backup payload', () => {
    const backup = JSON.stringify({
      version: 1,
      exportedAt: '2026-04-16T12:00:00.000Z',
      cards: [card]
    });

    expect(parseCardsBackup(backup)).toEqual({ ok: true, cards: [card] });
  });

  it('hydrates card logos from backup icons', () => {
    const backup = JSON.stringify({
      version: 1,
      exportedAt: '2026-04-16T12:00:00.000Z',
      cards: [
        {
          ...card,
          image: 'icon-1'
        }
      ],
      icons: [
        {
          id: 'icon-1',
          name: 'Carrefour',
          data: 'data:image/webp;base64,logo-data'
          }
      ]
    });

    expect(parseCardsBackup(backup)).toEqual({
      ok: true,
      cards: [
        {
          ...card,
          logoDataUrl: 'data:image/webp;base64,logo-data'
        }
      ]
      });
  });

  it('parses a valid backup payload with activation zones', () => {
    const cardWithZones = { ...card, activationZones: [activationZone] };
    const backup = JSON.stringify({
      version: 1,
      exportedAt: '2026-04-16T12:00:00.000Z',
      cards: [cardWithZones]
    });

    expect(parseCardsBackup(backup)).toEqual({ ok: true, cards: [cardWithZones] });
  });

  it('rejects backups with invalid activation zones', () => {
    const backup = JSON.stringify({
      version: 1,
      exportedAt: '2026-04-16T12:00:00.000Z',
      cards: [
        {
          ...card,
          activationZones: [
            {
              ...activationZone,
              latitude: 120
            }
          ]
          }
      ]
    });

    expect(parseCardsBackup(backup)).toEqual({
      ok: false,
      message: 'Le backup contient des cartes invalides.'
    });
  });

  it('rejects malformed or incompatible backups', () => {
    expect(parseCardsBackup('{broken')).toEqual({
      ok: false,
      message: "Le fichier de backup n'est pas un JSON valide."
    });
    expect(parseCardsBackup(JSON.stringify({ version: 2, cards: [card] }))).toEqual({
      ok: false,
      message: 'Le format du backup est incompatible.'
    });
    expect(parseCardsBackup(JSON.stringify({ version: 1, cards: [{ ...card, id: 123 }] }))).toEqual({
      ok: false,
      message: 'Le backup contient des cartes invalides.'
    });
  });
});
