import { describe, expect, it } from 'vitest';
import config from './vite.config';

describe('vite config', () => {
  it('uses the inlined zbar-wasm export for barcode scanning', () => {
    const conditions = config.resolve?.conditions ?? [];

    expect(conditions).toContain('zbar-inlined');
    expect(config.optimizeDeps?.esbuildOptions?.conditions ?? []).toContain('zbar-inlined');
  });
});
