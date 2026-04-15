import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  extractDominantColors,
  fileToLogoImage,
  isSupportedImageType,
  urlToLogoImage,
  validateImageUrl
} from './imageProcessing';

type ImageMode = 'load' | 'error';

function mockImage(mode: ImageMode = 'load') {
  class MockImage {
    crossOrigin = '';
    height = 256;
    onerror: (() => void) | null = null;
    onload: (() => void) | null = null;
    width = 1024;

    set src(_value: string) {
      queueMicrotask(() => {
        if (mode === 'load') {
          this.onload?.();
        } else {
          this.onerror?.();
        }
      });
    }
  }

  vi.stubGlobal('Image', MockImage);
}

type CanvasOverrides = {
  toDataUrl?: () => string;
  imageData?: Uint8ClampedArray;
};

function mockCanvas({ toDataUrl = () => 'data:image/webp;base64,logo', imageData }: CanvasOverrides = {}) {
  const drawImage = vi.fn();
  const getImageData = vi.fn((_x: number, _y: number, width: number, height: number) => ({
    data: imageData ?? new Uint8ClampedArray(width * height * 4),
    width,
    height
  }));
  const canvas = {
    height: 0,
    getContext: vi.fn(() => ({ drawImage, getImageData })),
    toDataURL: vi.fn(toDataUrl),
    width: 0
  };

  vi.stubGlobal('document', {
    createElement: vi.fn((tagName: string) => {
      if (tagName !== 'canvas') throw new Error(`Unexpected element: ${tagName}`);
      return canvas as unknown as HTMLCanvasElement;
    })
  });

  return { canvas, drawImage, getImageData };
}

describe('imageProcessing', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('accepts common browser image types', () => {
    expect(isSupportedImageType('image/png')).toBe(true);
    expect(isSupportedImageType('image/jpeg')).toBe(true);
    expect(isSupportedImageType('image/webp')).toBe(true);
  });

  it('rejects non-image file types', () => {
    expect(isSupportedImageType('application/pdf')).toBe(false);
    expect(isSupportedImageType('text/plain')).toBe(false);
  });

  it('validates http and https image URLs', () => {
    expect(validateImageUrl('https://example.com/logo.png')).toEqual({ ok: true });
    expect(validateImageUrl('http://example.com/logo.png')).toEqual({ ok: true });
  });

  it('accepts base64 data URLs for image content', () => {
    expect(validateImageUrl('data:image/png;base64,iVBORw0KGgo=')).toEqual({ ok: true });
    expect(validateImageUrl('data:image/svg+xml;utf8,<svg/>')).toEqual({ ok: true });
  });

  it('rejects invalid or unsupported URLs', () => {
    expect(validateImageUrl('notaurl')).toEqual({
      ok: false,
      message: "L'URL de l'image n'est pas valide."
    });
    expect(validateImageUrl('ftp://example.com/logo.png')).toEqual({
      ok: false,
      message: "Utilise une URL d'image en http ou https."
    });
    expect(validateImageUrl('data:text/plain;base64,Zm9v')).toEqual({
      ok: false,
      message: "Utilise une URL d'image en http ou https."
    });
  });

  it('resizes imported files to fit 512x512 and returns dominant colors', async () => {
    mockImage();
    const pixels = new Uint8ClampedArray([
      255, 0, 0, 255,
      250, 5, 5, 255,
      0, 255, 0, 255,
      0, 0, 255, 255,
      0, 0, 0, 0
    ]);
    const { canvas, drawImage } = mockCanvas({ imageData: pixels });
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:logo');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);

    const result = await fileToLogoImage({ type: 'image/png' } as File);

    expect(result.dataUrl).toBe('data:image/webp;base64,logo');
    expect(result.dominantColors[0]).toBe('#f00000');
    expect(result.dominantColors).toHaveLength(3);
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(canvas.width).toBe(512);
    expect(canvas.height).toBe(128);
    expect(drawImage).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:logo');
  });

  it('revokes object URLs when imported file loading fails', async () => {
    mockImage('error');
    mockCanvas();
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:broken-logo');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);

    await expect(fileToLogoImage({ type: 'image/png' } as File)).rejects.toThrow(
      'Impossible de charger cette image.'
    );

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:broken-logo');
  });

  it('accepts data URLs as remote sources', async () => {
    mockImage();
    mockCanvas();

    const result = await urlToLogoImage('data:image/png;base64,iVBORw0KGgo=');
    expect(result.dataUrl).toBe('data:image/webp;base64,logo');
  });

  it('returns a clear error when canvas export fails for a remote URL', async () => {
    mockImage();
    mockCanvas({
      toDataUrl: () => {
        throw new DOMException('Canvas is tainted', 'SecurityError');
      }
    });

    await expect(urlToLogoImage('https://example.com/logo.png')).rejects.toThrow(
      "Impossible d'enregistrer cette image. Essaie un fichier local ou une autre URL."
    );
  });

  it('extractDominantColors counts quantized buckets and ignores transparent pixels', () => {
    const pixels = new Uint8ClampedArray([
      200, 10, 10, 255,
      198, 8, 12, 255,
      195, 12, 15, 255,
      0, 0, 200, 255,
      0, 0, 255, 0,
      50, 200, 0, 255
    ]);
    const context = {
      getImageData: () => ({ data: pixels, width: 6, height: 1 })
    } as unknown as CanvasRenderingContext2D;

    const colors = extractDominantColors(context, 6, 1);
    expect(colors[0]).toBe('#c00000');
    expect(colors).toContain('#0000c0');
    expect(colors).toContain('#30c000');
    expect(colors).toHaveLength(3);
  });

  it('extractDominantColors returns an empty list when canvas read fails', () => {
    const context = {
      getImageData: () => {
        throw new DOMException('tainted', 'SecurityError');
      }
    } as unknown as CanvasRenderingContext2D;
    expect(extractDominantColors(context, 10, 10)).toEqual([]);
  });
});
