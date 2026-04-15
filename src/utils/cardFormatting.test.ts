import { describe, expect, it } from 'vitest';
import { getCardInitial, maskLoyaltyNumber, normalizeCardInput } from './cardFormatting';

describe('cardFormatting', () => {
  it('creates an uppercase initial from the card name', () => {
    expect(getCardInitial('Carrefour')).toBe('C');
    expect(getCardInitial('  ikea family')).toBe('I');
    expect(getCardInitial('')).toBe('F');
  });

  it('masks loyalty numbers with the last four visible characters', () => {
    expect(maskLoyaltyNumber('6007 1234 5678 9012')).toBe('**** 9012');
    expect(maskLoyaltyNumber('42')).toBe('**** 42');
  });

  it('normalizes required and optional input strings', () => {
    expect(
      normalizeCardInput({
        name: '  Monoprix  ',
        loyaltyNumber: '  123 456  ',
        note: '  caisse rapide  '
      })
    ).toEqual({
      name: 'Monoprix',
      loyaltyNumber: '123 456',
      note: 'caisse rapide'
    });
  });
});
