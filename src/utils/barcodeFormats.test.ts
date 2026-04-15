import { describe, expect, it } from 'vitest';
import {
  formatBarcodeValueForDisplay,
  getBarcodeFormatCandidates,
  isValidEan13,
  normalizeBarcodeValue
} from './barcodeFormats';

describe('barcodeFormats', () => {
  it('normalizes barcode values without mutating stored card data', () => {
    expect(normalizeBarcodeValue(' 978 0201-37962 ')).toBe('978020137962');
    expect(normalizeBarcodeValue('AB 12 34')).toBe('AB1234');
    expect(normalizeBarcodeValue('AB-12')).toBe('AB-12');
    expect(normalizeBarcodeValue('123-45')).toBe('123-45');
    expect(normalizeBarcodeValue('1234-5678')).toBe('12345678');
    expect(normalizeBarcodeValue('1234-5678-9012')).toBe('123456789012');
    expect(normalizeBarcodeValue('400-6381-33393-1')).toBe('4006381333931');
  });

  it('validates EAN-13 checksums', () => {
    expect(isValidEan13('4006381333931')).toBe(true);
    expect(isValidEan13('4006381333932')).toBe(false);
    expect(isValidEan13('12345678')).toBe(false);
  });

  it('prefers EAN13 for valid thirteen digit values', () => {
    expect(getBarcodeFormatCandidates('4006381333931')).toEqual(['EAN13', 'CODE128']);
  });

  it('falls back through supported non-EAN13 candidates', () => {
    expect(getBarcodeFormatCandidates('12345678')).toEqual(['EAN8', 'CODE128']);
    expect(getBarcodeFormatCandidates('123456789012')).toEqual(['UPC', 'CODE128']);
    expect(getBarcodeFormatCandidates('ABC123')).toEqual(['CODE39', 'CODE128']);
    expect(getBarcodeFormatCandidates('A123456A')).toEqual(['codabar', 'CODE39', 'CODE128']);
  });

  it('formats values for readable display', () => {
    expect(formatBarcodeValueForDisplay('4006381333931')).toBe('4006 3813 3393 1');
    expect(formatBarcodeValueForDisplay('ABC12345')).toBe('ABC1 2345');
  });
});
