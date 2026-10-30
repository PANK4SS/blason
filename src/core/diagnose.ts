import { luminance, type Rgb } from './color';
import type { BinaryMask, Diagnostic, RasterImage } from './types';

/**
 * Checks the conditions the user was told about: a truly white background and
 * an emblem in one solid color. The diagnostics explain a disappointing result
 * instead of letting it look like a bug.
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
        'No shape detected. The emblem may be too light: lower the detection threshold.',
    });
    return diagnostics;
  }

  const borderInk = borderMedianInk(image);
  if (borderInk > Math.max(18, inkThreshold * 0.6)) {
    diagnostics.push({
      level: 'warning',
      code: 'background-not-white',
      message:
        'The background does not look white. On a colored or textured background, the cutout will take the background with it.',
    });
  }

  if (touchesBorder(mask)) {
    diagnostics.push({
      level: 'warning',
      code: 'touches-border',
      message:
        'The emblem touches the edge of the image. Leave a white margin around it to get a closed contour.',
    });
  }

  if (color && luminance(color) > 215) {
    diagnostics.push({
      level: 'warning',
      code: 'color-too-light',
      message:
        'The emblem color is very light, so it is hard to tell apart from white. The traced path may be incomplete.',
    });
  }

  return diagnostics;
}

function countInk(mask: BinaryMask): number {
  let count = 0;
  for (let i = 0; i < mask.data.length; i += 1) count += mask.data[i];
  return count;
}

/** Median ink over a 2 pixel border band: the real state of the background. */
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
