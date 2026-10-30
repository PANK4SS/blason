import type { BinaryMask, RasterImage, ScalarField } from './types';

/**
 * Turns the image into an "ink field": 0 on a white background, 255 on a black
 * or heavily saturated pixel. Transparent pixels count as background, which is
 * what makes an already cut-out PNG work.
 */
export function inkField(image: RasterImage): ScalarField {
  const { width, height, data } = image;
  const out = new Float32Array(width * height);
  for (let i = 0, p = 0; i < out.length; i += 1, p += 4) {
    const alpha = data[p + 3] / 255;
    const min = Math.min(data[p], data[p + 1], data[p + 2]);
    out[i] = (255 - min) * alpha;
  }
  return { width, height, data: out };
}

/** Enlarges a field by bilinear interpolation. */
export function upscaleField(field: ScalarField, factor: number): ScalarField {
  if (factor <= 1) return field;
  const width = Math.max(1, Math.round(field.width * factor));
  const height = Math.max(1, Math.round(field.height * factor));
  const out = new Float32Array(width * height);
  const sx = field.width / width;
  const sy = field.height / height;
  for (let y = 0; y < height; y += 1) {
    const fy = Math.min(field.height - 1, Math.max(0, (y + 0.5) * sy - 0.5));
    const y0 = Math.floor(fy);
    const y1 = Math.min(field.height - 1, y0 + 1);
    const wy = fy - y0;
    for (let x = 0; x < width; x += 1) {
      const fx = Math.min(field.width - 1, Math.max(0, (x + 0.5) * sx - 0.5));
      const x0 = Math.floor(fx);
      const x1 = Math.min(field.width - 1, x0 + 1);
      const wx = fx - x0;
      const top = field.data[y0 * field.width + x0] * (1 - wx) + field.data[y0 * field.width + x1] * wx;
      const bottom = field.data[y1 * field.width + x0] * (1 - wx) + field.data[y1 * field.width + x1] * wx;
      out[y * width + x] = top * (1 - wy) + bottom * wy;
    }
  }
  return { width, height, data: out };
}

/** Separable Gaussian blur, used to soften the pixel staircase. */
export function blurField(field: ScalarField, sigma: number): ScalarField {
  if (sigma <= 0.05) return field;
  const kernel = gaussianKernel(sigma);
  const radius = (kernel.length - 1) / 2;
  const { width, height } = field;
  const pass = new Float32Array(width * height);
  const out = new Float32Array(width * height);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let sum = 0;
      for (let k = -radius; k <= radius; k += 1) {
        const xx = clamp(x + k, 0, width - 1);
        sum += field.data[y * width + xx] * kernel[k + radius];
      }
      pass[y * width + x] = sum;
    }
  }
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let sum = 0;
      for (let k = -radius; k <= radius; k += 1) {
        const yy = clamp(y + k, 0, height - 1);
        sum += pass[yy * width + x] * kernel[k + radius];
      }
      out[y * width + x] = sum;
    }
  }
  return { width, height, data: out };
}

/**
 * Representative ink intensity of the detected pixels (the median). It is used
 * to place the contour halfway between background and emblem, which avoids
 * dilating a heavily colored emblem or eroding a pale one.
 */
export function inkMagnitude(field: ScalarField, detectionThreshold: number): number {
  const samples: number[] = [];
  const stride = Math.max(1, Math.floor(field.data.length / 200_000));
  for (let i = 0; i < field.data.length; i += stride) {
    if (field.data[i] > detectionThreshold) samples.push(field.data[i]);
  }
  if (samples.length === 0) return 255;
  samples.sort((a, b) => a - b);
  return samples[samples.length >> 1];
}

/** Binarizes a field: anything above the threshold becomes ink. */
export function threshold(field: ScalarField, value: number): BinaryMask {
  const data = new Uint8Array(field.width * field.height);
  for (let i = 0; i < data.length; i += 1) data[i] = field.data[i] > value ? 1 : 0;
  return { width: field.width, height: field.height, data };
}

function gaussianKernel(sigma: number): Float32Array {
  const radius = Math.max(1, Math.ceil(sigma * 3));
  const kernel = new Float32Array(radius * 2 + 1);
  let total = 0;
  for (let i = -radius; i <= radius; i += 1) {
    const v = Math.exp(-(i * i) / (2 * sigma * sigma));
    kernel[i + radius] = v;
    total += v;
  }
  for (let i = 0; i < kernel.length; i += 1) kernel[i] /= total;
  return kernel;
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}
