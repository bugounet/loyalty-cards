import { describe, expect, it } from 'vitest';
import type { LoyaltyCard } from '../types';
import { distanceMeters, findNearbyCards, isInsideZone } from './geo';

const baseCard: LoyaltyCard = {
  id: 'card-1',
  name: 'Carrefour',
  loyaltyNumber: '123456789',
  createdAt: '2026-04-16T10:00:00.000Z',
  updatedAt: '2026-04-16T10:00:00.000Z'
};

describe('geo utilities', () => {
  it('computes distance between two coordinates in meters', () => {
    const parisToEiffelTower = distanceMeters(
      { latitude: 48.8566, longitude: 2.3522 },
      { latitude: 48.8584, longitude: 2.2945 }
    );

    expect(parisToEiffelTower).toBeGreaterThan(4200);
    expect(parisToEiffelTower).toBeLessThan(4400);
  });

  it('detects when a coordinate is inside an activation zone', () => {
    const zone = {
      id: 'zone-1',
      label: 'Lieu 1',
      latitude: 48.8566,
      longitude: 2.3522,
      radiusMeters: 250,
      createdAt: '2026-04-16T10:00:00.000Z',
      updatedAt: '2026-04-16T10:00:00.000Z'
    };

    expect(isInsideZone({ latitude: 48.857, longitude: 2.352 }, zone)).toBe(true);
    expect(isInsideZone({ latitude: 48.86, longitude: 2.36 }, zone)).toBe(false);
  });

  it('returns nearby cards sorted by closest matching zone', () => {
    const cards: LoyaltyCard[] = [
      {
        ...baseCard,
        id: 'far-card',
        name: 'Far Store',
        activationZones: [
          {
            id: 'far-zone',
            label: 'Lieu 1',
            latitude: 48.858,
            longitude: 2.3522,
            radiusMeters: 500,
            createdAt: '2026-04-16T10:00:00.000Z',
            updatedAt: '2026-04-16T10:00:00.000Z'
          }
        ]
      },
      {
        ...baseCard,
        id: 'near-card',
        name: 'Near Store',
        activationZones: [
          {
            id: 'near-zone',
            label: 'Lieu 1',
            latitude: 48.8567,
            longitude: 2.3522,
            radiusMeters: 250,
            createdAt: '2026-04-16T10:00:00.000Z',
            updatedAt: '2026-04-16T10:00:00.000Z'
          }
        ]
      },
      {
        ...baseCard,
        id: 'outside-card',
        name: 'Outside Store',
        activationZones: [
          {
            id: 'outside-zone',
            label: 'Lieu 1',
            latitude: 48.9,
            longitude: 2.4,
            radiusMeters: 50,
            createdAt: '2026-04-16T10:00:00.000Z',
            updatedAt: '2026-04-16T10:00:00.000Z'
          }
        ]
      }
    ];

    const nearby = findNearbyCards(cards, { latitude: 48.8566, longitude: 2.3522 });

    expect(nearby.map((match) => match.card.id)).toEqual(['near-card', 'far-card']);
    expect(nearby[0].zone.id).toBe('near-zone');
    expect(nearby[0].distanceMeters).toBeLessThan(nearby[1].distanceMeters);
  });
});
