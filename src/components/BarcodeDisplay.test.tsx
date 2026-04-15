import { render, screen, waitFor } from '@testing-library/react';
import JsBarcode from 'jsbarcode';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BarcodeDisplay } from './BarcodeDisplay';

vi.mock('jsbarcode', () => ({
  default: vi.fn()
}));

const jsBarcodeMock = vi.mocked(JsBarcode);

describe('BarcodeDisplay', () => {
  beforeEach(() => {
    jsBarcodeMock.mockReset();
  });

  it('renders a valid EAN-13 barcode first', async () => {
    render(<BarcodeDisplay value="4006381333931" />);

    await waitFor(() => expect(jsBarcodeMock).toHaveBeenCalled());

    expect(jsBarcodeMock).toHaveBeenCalledWith(
      expect.any(Element),
      '4006381333931',
      expect.objectContaining({ format: 'EAN13' })
    );
    expect(screen.getByText('4006 3813 3393 1')).toBeTruthy();
    expect(screen.getByLabelText('Code-barres de la carte')).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Code-barres EAN13' })).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('tries the next candidate when JsBarcode rejects the first format', async () => {
    jsBarcodeMock.mockImplementation((_element, _value, options) => {
      if (options?.format === 'EAN8') throw new Error('bad ean8');
    });

    render(<BarcodeDisplay value="12345678" />);

    await waitFor(() =>
      expect(jsBarcodeMock).toHaveBeenLastCalledWith(
        expect.any(Element),
        '12345678',
        expect.objectContaining({ format: 'CODE128' })
      )
    );
  });

  it('shows a text fallback when no format can be rendered', async () => {
    jsBarcodeMock.mockImplementation(() => {
      throw new Error('unsupported');
    });

    render(<BarcodeDisplay value="####" />);

    const alert = await screen.findByRole('alert');

    expect(alert.textContent).toBe(
      'Code-barres indisponible. Presentez ce numero en caisse.'
    );
    expect(screen.getByText('####')).toBeTruthy();
    expect(screen.queryByRole('img')).toBeNull();
  });
});
