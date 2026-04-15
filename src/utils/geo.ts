import type { ActivationZone, LoyaltyCard } from '../types';

export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type NearbyCardMatch = {
  card: LoyaltyCard;
  zone: ActivationZone;
  distanceMeters: number;
};

const EARTH_RADIUS_METERS = 6371000;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function distanceMeters(from: Coordinates, to: Coordinates): number {
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const fromLatitude = toRadians(from.latitude);
  const toLatitude = toRadians(to.latitude);

  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
}

export function isInsideZone(position: Coordinates, zone: ActivationZone): boolean {
  return distanceMeters(position, zone) <= zone.radiusMeters;
}

export function findNearbyCards(cards: LoyaltyCard[], position: Coordinates): NearbyCardMatch[] {
  return cards
    .map((card) => {
      const closestZone = (card.activationZones ?? []).reduce<NearbyCardMatch | undefined>((closest, zone) => {
        const distance = distanceMeters(position, zone);
        if (distance > zone.radiusMeters) return closest;
        if (!closest || distance < closest.distanceMeters) {
          return {
            card,
            zone,
            distanceMeters: distance
          };
        }
        return closest;
      }, undefined);

      return closestZone;
    })
    .filter((match): match is NearbyCardMatch => Boolean(match))
    .sort((left, right) => left.distanceMeters - right.distanceMeters);
}
