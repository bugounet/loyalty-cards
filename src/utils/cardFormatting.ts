import type { LoyaltyCardInput } from '../types';

export function getCardInitial(name: string): string {
  const first = name.trim().charAt(0);
  return first ? first.toLocaleUpperCase('fr-FR') : 'F';
}

export function maskLoyaltyNumber(value: string): string {
  const compact = value.replace(/\s+/g, '');
  const visible = compact.slice(-4) || value.trim();
  return `**** ${visible}`;
}

export function normalizeCardInput(input: LoyaltyCardInput): LoyaltyCardInput {
  const normalized: LoyaltyCardInput = {
    name: input.name.trim(),
    loyaltyNumber: input.loyaltyNumber.trim()
  };

  if (input.logoDataUrl?.trim()) normalized.logoDataUrl = input.logoDataUrl.trim();
  if (input.accentColor?.trim()) normalized.accentColor = input.accentColor.trim();
  if (input.note?.trim()) normalized.note = input.note.trim();

  return normalized;
}
