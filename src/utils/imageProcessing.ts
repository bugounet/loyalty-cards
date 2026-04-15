const SUPPORTED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const MAX_IMAGE_SIZE = 512;

export type ValidationResult = { ok: true } | { ok: false; message: string };
export type ProcessedImage = { dataUrl: string; dominantColors: string[] };

export function isSupportedImageType(type: string): boolean {
  return SUPPORTED_IMAGE_TYPES.has(type);
}

export function validateImageUrl(value: string): ValidationResult {
  const trimmed = value.trim();
  if (/^data:image\/[a-zA-Z0-9.+-]+[;,]/.test(trimmed)) {
    return { ok: true };
  }
  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return { ok: false, message: "Utilise une URL d'image en http ou https." };
    }
    return { ok: true };
  } catch {
    return { ok: false, message: "L'URL de l'image n'est pas valide." };
  }
}

export async function fileToLogoImage(file: File): Promise<ProcessedImage> {
  if (!isSupportedImageType(file.type)) {
    throw new Error('Choisis une image PNG, JPEG ou WebP.');
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    return await processImageSource(objectUrl);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function urlToLogoImage(value: string): Promise<ProcessedImage> {
  const validation = validateImageUrl(value);
  if (!validation.ok) throw new Error(validation.message);
  return processImageSource(value.trim());
}

async function processImageSource(src: string): Promise<ProcessedImage> {
  const image = await loadImage(src);
  const canvas = document.createElement('canvas');
  const scale = Math.min(1, MAX_IMAGE_SIZE / Math.max(image.width, image.height));
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));

  const context = canvas.getContext('2d');
  if (!context) throw new Error("Impossible de preparer l'image.");
  try {
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/webp', 0.86);
    const dominantColors = extractDominantColors(context, canvas.width, canvas.height);
    return { dataUrl, dominantColors };
  } catch {
    throw new Error("Impossible d'enregistrer cette image. Essaie un fichier local ou une autre URL.");
  }
}

export function extractDominantColors(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  topN = 3
): string[] {
  let pixels: Uint8ClampedArray;
  try {
    pixels = context.getImageData(0, 0, width, height).data;
  } catch {
    return [];
  }
  const counts = new Map<number, number>();
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] < 128) continue;
    const r = pixels[i] & 0xf0;
    const g = pixels[i + 1] & 0xf0;
    const b = pixels[i + 2] & 0xf0;
    const key = (r << 16) | (g << 8) | b;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([key]) => toHex(key));
}

function toHex(key: number): string {
  const r = (key >> 16) & 0xff;
  const g = (key >> 8) & 0xff;
  const b = key & 0xff;
  return '#' + [r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('');
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Impossible de charger cette image.'));
    image.src = src;
  });
}
