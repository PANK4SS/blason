import type { RasterImage } from '../core/types';

export const ACCEPTED_TYPES = ['image/png', 'image/webp', 'image/jpeg'] as const;
export const ACCEPTED_EXTENSIONS = ['.png', '.webp', '.jpg', '.jpeg'] as const;

/** Taille au-delà de laquelle l'image est réduite avant traitement. */
const MAX_EDGE = 2000;

export function isSupported(file: File): boolean {
  if ((ACCEPTED_TYPES as readonly string[]).includes(file.type)) return true;
  const name = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((extension) => name.endsWith(extension));
}

/**
 * Décode un fichier image en pixels RGBA via la plateforme, puis le réduit si
 * nécessaire pour garder une vectorisation rapide.
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
  if (!context) throw new Error("Le navigateur n'autorise pas la lecture des pixels.");

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
      // Certains moteurs de webview refusent le WebP : on retombe sur <img>.
    }
  }

  const url = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`Format illisible : ${file.name}`));
      image.src = url;
    });
  } finally {
    // L'URL reste valide le temps du décodage, qui est terminé ici.
    URL.revokeObjectURL(url);
  }
}
