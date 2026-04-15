export type BarcodeFormat = 'EAN13' | 'EAN8' | 'UPC' | 'CODE39' | 'ITF' | 'codabar' | 'CODE128';

export function normalizeBarcodeValue(value: string): string {
  const trimmed = value.trim();
  const withoutSpaces = trimmed.replace(/\s+/g, '');
  const digitsWithoutHyphens = withoutSpaces.replace(/-/g, '');

  if (/^\d[\d-]*$/.test(withoutSpaces) && /^(?:\d{8}|\d{12}|\d{13})$/.test(digitsWithoutHyphens)) {
    return digitsWithoutHyphens;
  }

  return withoutSpaces;
}

export function isValidEan13(value: string): boolean {
  if (!/^\d{13}$/.test(value)) return false;

  const digits = value.split('').map(Number);
  const checkDigit = digits[12];
  const sum = digits.slice(0, 12).reduce((total, digit, index) => {
    return total + digit * (index % 2 === 0 ? 1 : 3);
  }, 0);
  const expected = (10 - (sum % 10)) % 10;

  return checkDigit === expected;
}

export function getBarcodeFormatCandidates(rawValue: string): BarcodeFormat[] {
  const value = normalizeBarcodeValue(rawValue);
  const candidates: BarcodeFormat[] = [];

  if (isValidEan13(value)) candidates.push('EAN13');
  if (/^\d{8}$/.test(value)) candidates.push('EAN8');
  if (/^\d{12}$/.test(value)) candidates.push('UPC');
  if (candidates.length === 0 && /^[0-9]+$/.test(value) && value.length % 2 === 0 && value.length >= 6) {
    candidates.push('ITF');
  }
  if (/^[A-D][0-9$+\-./:]+[A-D]$/i.test(value)) candidates.push('codabar');
  if (candidates.length === 0 || candidates[0] === 'codabar') {
    if (/^[0-9A-Z .$/+%-]+$/.test(value)) candidates.push('CODE39');
  }

  candidates.push('CODE128');

  return Array.from(new Set(candidates));
}

export function formatBarcodeValueForDisplay(rawValue: string): string {
  const value = normalizeBarcodeValue(rawValue);
  return value.replace(/(.{4})/g, '$1 ').trim();
}
