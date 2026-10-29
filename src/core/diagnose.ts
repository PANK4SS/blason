import { luminance, type Rgb } from './color';
import type { BinaryMask, Diagnostic, RasterImage } from './types';

/**
 * Contrôle les deux conditions annoncées à l'utilisateur : un fond vraiment
 * blanc et un emblème d'une couleur franche. Les diagnostics expliquent un
 * résultat décevant au lieu de laisser croire à un bug.
 */
export function diagnose(
  image: RasterImage,
  mask: BinaryMask,
  color: Rgb | null,
  inkThreshold: number,
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const inkPixels = countInk(mask);
  const coverage = inkPixels / (mask.width * mask.height);

  if (inkPixels === 0 || coverage < 0.0002) {
    diagnostics.push({
      level: 'error',
      code: 'nothing-detected',
      message:
        "Aucune forme détectée. L'emblème est peut-être trop clair : baissez le seuil de détection.",
    });
    return diagnostics;
  }

  const borderInk = borderMedianInk(image);
  if (borderInk > Math.max(18, inkThreshold * 0.6)) {
    diagnostics.push({
      level: 'warning',
      code: 'background-not-white',
      message:
        'Le fond ne semble pas blanc. Sur un fond coloré ou texturé, le détourage emportera aussi le fond.',
    });
  }

  if (touchesBorder(mask)) {
    diagnostics.push({
      level: 'warning',
      code: 'touches-border',
      message:
        "L'emblème touche le bord de l'image. Laissez une marge blanche autour pour un contour fermé.",
    });
  }

  if (color && luminance(color) > 215) {
    diagnostics.push({
      level: 'warning',
      code: 'color-too-light',
      message:
        'La couleur de l’emblème est très claire, donc difficile à distinguer du blanc. Le tracé peut être incomplet.',
    });
  }

  return diagnostics;
}

function countInk(mask: BinaryMask): number {
  let count = 0;
  for (let i = 0; i < mask.data.length; i += 1) count += mask.data[i];
  return count;
}

/** Médiane de l'encre sur un liseré de 2 pixels : l'état réel du fond. */
function borderMedianInk(image: RasterImage): number {
  const { width, height, data } = image;
  const band = 2;
  const samples: number[] = [];
  const push = (x: number, y: number): void => {
    const p = (y * width + x) * 4;
    if (data[p + 3] < 128) {
      samples.push(0);
      return;
    }
    samples.push(255 - Math.min(data[p], data[p + 1], data[p + 2]));
  };

  for (let y = 0; y < Math.min(band, height); y += 1) {
    for (let x = 0; x < width; x += 1) {
      push(x, y);
      push(x, height - 1 - y);
    }
  }
  for (let x = 0; x < Math.min(band, width); x += 1) {
    for (let y = 0; y < height; y += 1) {
      push(x, y);
      push(width - 1 - x, y);
    }
  }
  if (samples.length === 0) return 0;
  samples.sort((a, b) => a - b);
  return samples[samples.length >> 1];
}

function touchesBorder(mask: BinaryMask): boolean {
  const { width, height, data } = mask;
  for (let x = 0; x < width; x += 1) {
    if (data[x] === 1 || data[(height - 1) * width + x] === 1) return true;
  }
  for (let y = 0; y < height; y += 1) {
    if (data[y * width] === 1 || data[y * width + width - 1] === 1) return true;
  }
  return false;
}
