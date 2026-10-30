import { dominantColor, toHex } from './color';
import { inkBounds, signedArea, traceContours } from './contour';
import { diagnose } from './diagnose';
import { blurField, inkField, inkMagnitude, threshold, upscaleField } from './field';
import { buildSvgDocument, closedBezierPath } from './path';
import { simplifyClosed, smoothClosed, subdivideClosed, transform } from './polyline';
import { DEFAULT_OPTIONS, type RasterImage, type VectorizeOptions, type VectorizeResult } from './types';

/**
 * The full pipeline: a raster image on a white background to a cut-out SVG.
 *
 * 1. ink field (distance from white)  2. upsampling and blur
 * 3. binarization  4. contour tracing  5. smoothing and resampling
 * 6. Bezier curves  7. SVG document.
 *
 * A pure function with no dependency on the DOM: it runs just as well in a Web
 * Worker as in a Node test.
 */
export function vectorize(
  image: RasterImage,
  overrides: Partial<VectorizeOptions> = {},
  title?: string,
): VectorizeResult {
  const options = normalize({ ...DEFAULT_OPTIONS, ...overrides });

  const source = inkField(image);
  // The contour sits halfway between the detection threshold and the real
  // intensity of the emblem, so the path follows the perceived edge.
  const boundary = (options.threshold + inkMagnitude(source, options.threshold)) / 2;
  const scaled = upscaleField(source, options.upscale);
  const softened = blurField(scaled, 0.45 * options.upscale);
  const mask = threshold(softened, boundary);

  const detected = dominantColor(image, options.threshold);
  const color = options.color ?? (detected ? toHex(detected) : '#111111');
  const sourceMask = threshold(source, options.threshold);
  const diagnostics = diagnose(image, sourceMask, detected, options.threshold);

  const bounds = inkBounds(mask);
  if (!bounds) {
    return {
      svg: buildSvgDocument({ paths: [], width: 1, height: 1, color, title }),
      color,
      bounds: { x: 0, y: 0, width: 0, height: 0 },
      pathCount: 0,
      pointCount: 0,
      diagnostics,
    };
  }

  const pad = options.padding * options.upscale;
  const originX = bounds.x - pad;
  const originY = bounds.y - pad;
  const minLoopArea = options.minArea * options.upscale * options.upscale;

  const paths: string[] = [];
  let pointCount = 0;
  for (const loop of traceContours(mask)) {
    if (Math.abs(signedArea(loop)) < minLoopArea) continue;
    const smoothed = smoothClosed(loop, options.smoothing);
    const simplified = simplifyClosed(smoothed, options.detail / 3);
    const sampled = subdivideClosed(simplified, options.detail * 6);
    if (sampled.length < 4) continue;
    const placed = transform(sampled, originX, originY, options.upscale);
    const d = closedBezierPath(placed);
    if (!d) continue;
    paths.push(d);
    pointCount += sampled.length;
  }

  const width = (bounds.width + pad * 2) / options.upscale;
  const height = (bounds.height + pad * 2) / options.upscale;

  return {
    svg: buildSvgDocument({ paths, width, height, color, title }),
    color,
    bounds: {
      x: bounds.x / options.upscale,
      y: bounds.y / options.upscale,
      width: bounds.width / options.upscale,
      height: bounds.height / options.upscale,
    },
    pathCount: paths.length,
    pointCount,
    diagnostics,
  };
}

function normalize(options: VectorizeOptions): VectorizeOptions {
  return {
    ...options,
    threshold: clamp(options.threshold, 2, 250),
    upscale: clamp(Math.round(options.upscale), 1, 4),
    smoothing: clamp(options.smoothing, 0, 12),
    detail: clamp(options.detail, 1, 40),
    minArea: Math.max(0, options.minArea),
    padding: clamp(options.padding, 0, 200),
  };
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}
