import type { RasterImage } from '../core/types';

export const ACCEPTED_TYPES = ['image/png', 'image/webp', 'image/jpeg'] as const;
export const ACCEPTED_EXTENSIONS = ['.png', '.webp', '.jpg', '.jpeg'] as const;

/** Size above which the image is scaled down before processing. */
const MAX_EDGE = 2000;

export function isSupported(file: File): boolean {
  if ((ACCEPTED_TYPES as readonly string[]).includes(file.type)) return true;
  const name = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((extension) => name.endsWith(extension));
}

/**
 * Decodes an image file into RGBA pixels through the platform, then scales it
 * down if needed to keep vectorization fast.
 */
export async function decodeImage(file: File): Promise<RasterImage> {
  const bitmap = await createBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('The browser does not allow reading the pixels.');

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(bitmap, 0, 0, width, height);
  if ('close' in bitmap) bitmap.close();

  const { data } = context.getImageData(0, 0, width, height);
  return { width, height, data };
}

async function createBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file);
    } catch {
      // Some webview engines reject WebP, so fall back to <img>.
    }
  }

  const url = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`Unreadable format: ${file.name}`));
      image.src = url;
    });
  } finally {
    // The URL stays valid for the duration of the decode, which is done here.
    URL.revokeObjectURL(url);
  }
}
