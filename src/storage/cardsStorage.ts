import type { ActivationZone, LoyaltyCard } from '../types';
import { createId } from '../utils/createId';

export const CARDS_STORAGE_KEY = 'loyalty-cards:v1';
export const CARDS_BACKUP_VERSION = 1;

type SaveResult = { ok: true } | { ok: false; message: string };
type ParseBackupResult = { ok: true; cards: LoyaltyCard[] } | { ok: false; message: string };
type IconIdFactory = () => string;
type BackupIcon = {
  id: string;
  name: string;
  data: string;
};
type BackupCard = Omit<LoyaltyCard, 'logoDataUrl'> & {
  image?: string;
  logoDataUrl?: string;
};

function isOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === 'string';
}

function isFiniteNumberInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

function isActivationZone(value: unknown): value is ActivationZone {
  if (!value || typeof value !== 'object') return false;
  const zone = value as Partial<ActivationZone>;
  return (
    typeof zone.id === 'string' &&
    typeof zone.label === 'string' &&
    zone.label.trim().length > 0 &&
    isFiniteNumberInRange(zone.latitude, -90, 90) &&
    isFiniteNumberInRange(zone.longitude, -180, 180) &&
    typeof zone.radiusMeters === 'number' &&
    Number.isFinite(zone.radiusMeters) &&
    zone.radiusMeters > 0 &&
    typeof zone.createdAt === 'string' &&
    typeof zone.updatedAt === 'string'
  );
}

function isOptionalActivationZones(value: unknown): boolean {
  return value === undefined || (Array.isArray(value) && value.every(isActivationZone));
}

function isCard(value: unknown): value is LoyaltyCard {
  if (!value || typeof value !== 'object') return false;
  const card = value as Partial<LoyaltyCard>;
  return (
    typeof card.id === 'string' &&
    typeof card.name === 'string' &&
    typeof card.loyaltyNumber === 'string' &&
    isOptionalString(card.logoDataUrl) &&
    isOptionalString(card.accentColor) &&
    isOptionalString(card.note) &&
    isOptionalActivationZones(card.activationZones) &&
    typeof card.createdAt === 'string' &&
    typeof card.updatedAt === 'string'
  );
}

function isBackupCard(value: unknown): value is BackupCard {
  if (!value || typeof value !== 'object') return false;
  const card = value as Partial<BackupCard>;
  return (
    typeof card.id === 'string' &&
    typeof card.name === 'string' &&
    typeof card.loyaltyNumber === 'string' &&
    isOptionalString(card.image) &&
    isOptionalString(card.logoDataUrl) &&
    isOptionalString(card.accentColor) &&
    isOptionalString(card.note) &&
    isOptionalActivationZones(card.activationZones) &&
    typeof card.createdAt === 'string' &&
    typeof card.updatedAt === 'string'
  );
}

function isBackupIcon(value: unknown): value is BackupIcon {
  if (!value || typeof value !== 'object') return false;
  const icon = value as Partial<BackupIcon>;
  return typeof icon.id === 'string' && typeof icon.name === 'string' && typeof icon.data === 'string';
}

export function loadCards(): LoyaltyCard[] {
  try {
    const raw = localStorage.getItem(CARDS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isCard);
  } catch {
    return [];
  }
}

export function saveCards(cards: LoyaltyCard[]): SaveResult {
  try {
    localStorage.setItem(CARDS_STORAGE_KEY, JSON.stringify(cards));
    return { ok: true };
  } catch {
    return {
      ok: false,
      message: "Impossible d'enregistrer les cartes sur cet appareil."
    };
  }
}

export function createCardsBackup(
  cards: LoyaltyCard[],
  exportedAt = new Date().toISOString(),
  createIconId: IconIdFactory = createId
): string {
  const icons: BackupIcon[] = [];
  const backupCards = cards.map(({ logoDataUrl, ...card }) => {
    if (!logoDataUrl) return card;

    const iconId = createIconId();
    icons.push({
      id: iconId,
      name: card.name,
      data: logoDataUrl
    });

    return {
      ...card,
      image: iconId
    };
  });

  return JSON.stringify(
    {
      version: CARDS_BACKUP_VERSION,
      exportedAt,
      cards: backupCards,
      icons
    },
    null,
    2
  );
}

export function parseCardsBackup(rawBackup: string): ParseBackupResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(rawBackup);
  } catch {
    return {
      ok: false,
      message: "Le fichier de backup n'est pas un JSON valide."
    };
  }

  if (!parsed || typeof parsed !== 'object') {
    return {
      ok: false,
      message: 'Le format du backup est incompatible.'
    };
  }

  const backup = parsed as { version?: unknown; cards?: unknown; icons?: unknown };
  if (backup.version !== CARDS_BACKUP_VERSION || !Array.isArray(backup.cards)) {
    return {
      ok: false,
      message: 'Le format du backup est incompatible.'
    };
  }

  const icons = backup.icons ?? [];
  if (!Array.isArray(icons) || !icons.every(isBackupIcon)) {
    return {
      ok: false,
      message: 'Le format du backup est incompatible.'
    };
  }

  if (!backup.cards.every(isBackupCard)) {
    return {
      ok: false,
      message: 'Le backup contient des cartes invalides.'
    };
  }

  const iconsById = new Map(icons.map((icon) => [icon.id, icon]));
  const cards: LoyaltyCard[] = [];

  for (const { image, logoDataUrl, ...card } of backup.cards) {
    if (image) {
      const icon = iconsById.get(image);
      if (!icon) {
        return {
          ok: false,
          message: 'Le backup contient des cartes invalides.'
        };
      }

      cards.push({
        ...card,
        logoDataUrl: icon.data
      });
      continue;
    }

    cards.push(logoDataUrl ? { ...card, logoDataUrl } : card);
  }

  return { ok: true, cards };
}
