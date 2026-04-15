import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BRIGHTNESS_MEMO_KEY, optimizeCheckoutBrightness } from './screenBrightness';

type BrightnessCapableNavigator = Navigator & {
  screen?: {
    setBrightness?: (value: number) => Promise<void>;
  };
};

type BrightnessCapableScreen = Screen & {
  mozBrightness?: number;
};

describe('screenBrightness', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    delete (navigator as BrightnessCapableNavigator).screen;
    Reflect.deleteProperty(globalThis, 'screen');
  });

  it('memoizes unsupported browsers without throwing', async () => {
    await expect(optimizeCheckoutBrightness()).resolves.toEqual({ status: 'unsupported' });
    expect(localStorage.getItem(BRIGHTNESS_MEMO_KEY)).toBe('unsupported');
  });

  it('sets maximum brightness when an experimental API exists', async () => {
    const setBrightness = vi.fn().mockResolvedValue(undefined);
    (navigator as BrightnessCapableNavigator).screen = { setBrightness };

    await expect(optimizeCheckoutBrightness()).resolves.toEqual({ status: 'optimized' });

    expect(setBrightness).toHaveBeenCalledWith(1);
    expect(localStorage.getItem(BRIGHTNESS_MEMO_KEY)).toBe('supported');
  });

  it('sets maximum brightness when a mozBrightness screen API exists', async () => {
    const screen = { mozBrightness: 0.4 } as BrightnessCapableScreen;
    Object.defineProperty(globalThis, 'screen', {
      configurable: true,
      value: screen
    });

    await expect(optimizeCheckoutBrightness()).resolves.toEqual({ status: 'optimized' });

    expect(screen.mozBrightness).toBe(1);
    expect(localStorage.getItem(BRIGHTNESS_MEMO_KEY)).toBe('supported');
  });

  it('does not retry when unsupported is memoized', async () => {
    localStorage.setItem(BRIGHTNESS_MEMO_KEY, 'unsupported');
    const setBrightness = vi.fn().mockResolvedValue(undefined);
    (navigator as BrightnessCapableNavigator).screen = { setBrightness };

    await expect(optimizeCheckoutBrightness()).resolves.toEqual({ status: 'skipped' });

    expect(setBrightness).not.toHaveBeenCalled();
  });

  it('memoizes rejected attempts', async () => {
    const setBrightness = vi.fn().mockRejectedValue(new Error('denied'));
    (navigator as BrightnessCapableNavigator).screen = { setBrightness };

    await expect(optimizeCheckoutBrightness()).resolves.toEqual({ status: 'rejected' });

    expect(localStorage.getItem(BRIGHTNESS_MEMO_KEY)).toBeNull();
  });

  it('still resolves when localStorage is unavailable', async () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    await expect(optimizeCheckoutBrightness()).resolves.toEqual({ status: 'unsupported' });

    expect(getItem).toHaveBeenCalled();
    expect(setItem).toHaveBeenCalled();
  });

  it('still resolves when navigator is unavailable', async () => {
    const originalNavigator = globalThis.navigator;
    Reflect.deleteProperty(globalThis, 'navigator');

    await expect(optimizeCheckoutBrightness()).resolves.toEqual({ status: 'unsupported' });

    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: originalNavigator
    });
  });
});
