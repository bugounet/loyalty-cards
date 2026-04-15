export const BRIGHTNESS_MEMO_KEY = 'loyalty-cards:checkout-brightness:v1';

type BrightnessStatus = 'optimized' | 'unsupported' | 'rejected' | 'skipped';

type BrightnessResult = {
  status: BrightnessStatus;
};

type ExperimentalScreen = {
  mozBrightness?: number;
  setBrightness?: (value: number) => Promise<void> | void;
};

type ExperimentalNavigator = Navigator & {
  screen?: ExperimentalScreen;
};

function readMemo(): string | null {
  try {
    return localStorage.getItem(BRIGHTNESS_MEMO_KEY);
  } catch {
    return null;
  }
}

function writeMemo(value: 'supported' | 'unsupported'): void {
  try {
    localStorage.setItem(BRIGHTNESS_MEMO_KEY, value);
  } catch {
    // Storage can be blocked in private modes; brightness is only progressive enhancement.
  }
}

function getBrightnessSetter(): ((value: number) => Promise<void> | void) | undefined {
  const globalScreen = globalThis.screen as ExperimentalScreen | undefined;
  if (typeof globalScreen?.mozBrightness === 'number') {
    return (value: number) => {
      globalScreen.mozBrightness = value;
    };
  }

  if (typeof navigator === 'undefined') return undefined;

  const screen = (navigator as ExperimentalNavigator).screen;
  return typeof screen?.setBrightness === 'function' ? screen.setBrightness.bind(screen) : undefined;
}

export async function optimizeCheckoutBrightness(): Promise<BrightnessResult> {
  if (readMemo() === 'unsupported') return { status: 'skipped' };

  const setBrightness = getBrightnessSetter();
  if (!setBrightness) {
    writeMemo('unsupported');
    return { status: 'unsupported' };
  }

  try {
    await setBrightness(1);
    writeMemo('supported');
    return { status: 'optimized' };
  } catch {
    return { status: 'rejected' };
  }
}
