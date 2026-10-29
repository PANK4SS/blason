import type { RasterImage } from './types';

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/**
 * Couleur dominante de l'emblème : médiane par canal des pixels franchement
 * encrés. La médiane ignore les pixels d'anti-aliasing délavés qui tireraient
 * une moyenne vers le blanc.
 *
 * Un emblème dans un ton très pâle n'a aucun pixel « franc » : on reprend
 * alors la mesure au seuil de détection, pour rendre sa vraie couleur plutôt
 * que rien.
 */
export function dominantColor(image: RasterImage, inkThreshold: number): Rgb | null {
  const strong = Math.max(inkThreshold * 2, 90);
  return sampleMedian(image, strong) ?? sampleMedian(image, inkThreshold);
}

function sampleMedian(image: RasterImage, minInk: number): Rgb | null {
  const reds: number[] = [];
  const greens: number[] = [];
  const blues: number[] = [];

  for (let p = 0; p < image.data.length; p += 4) {
    const alpha = image.data[p + 3];
    if (alpha < 128) continue;
    const ink = 255 - Math.min(image.data[p], image.data[p + 1], image.data[p + 2]);
    if (ink < minInk) continue;
    reds.push(image.data[p]);
    greens.push(image.data[p + 1]);
    blues.push(image.data[p + 2]);
  }
  if (reds.length === 0) return null;
  return { r: median(reds), g: median(greens), b: median(blues) };
}

export function toHex({ r, g, b }: Rgb): string {
  const part = (v: number): string => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0');
  return `#${part(r)}${part(g)}${part(b)}`.toUpperCase();
}

/** Luminance relative perçue, 0 (noir) à 255 (blanc). */
export function luminance({ r, g, b }: Rgb): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function median(values: number[]): number {
  values.sort((a, b) => a - b);
  const middle = values.length >> 1;
  return values.length % 2 === 1 ? values[middle] : (values[middle - 1] + values[middle]) / 2;
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}
