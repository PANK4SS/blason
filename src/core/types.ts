/** Raw RGBA image, independent of the DOM (compatible with ImageData). */
export interface RasterImage {
  readonly width: number;
  readonly height: number;
  /** 4 bytes per pixel, non-premultiplied RGBA. */
  readonly data: Uint8ClampedArray;
}

/** Single-channel floating point scalar field. */
export interface ScalarField {
  readonly width: number;
  readonly height: number;
  readonly data: Float32Array;
}

/** Binary mask, 1 = ink (the emblem), 0 = background. */
export interface BinaryMask {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8Array;
}

export interface Point {
  x: number;
  y: number;
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface VectorizeOptions {
  /** Ink detection threshold, 0-255. Lower picks up lighter shades. */
  threshold: number;
  /** Upsampling applied before contour tracing, 1-4. Higher gives finer contours. */
  upscale: number;
  /** Contour smoothing, in upsampled pixels. */
  smoothing: number;
  /** Control point spacing, in upsampled pixels. Higher gives fewer points. */
  detail: number;
  /** Minimum area of a shape that is kept, in source pixels. */
  minArea: number;
  /** Padding left around the emblem, in source pixels. */
  padding: number;
  /** Forced fill color (#RRGGBB), or null to detect the one in the image. */
  color: string | null;
}

export const DEFAULT_OPTIONS: VectorizeOptions = {
  threshold: 40,
  upscale: 3,
  smoothing: 2.2,
  detail: 7,
  minArea: 12,
  padding: 8,
  color: null,
};

export type DiagnosticLevel = 'error' | 'warning';

export interface Diagnostic {
  level: DiagnosticLevel;
  code: 'background-not-white' | 'nothing-detected' | 'color-too-light' | 'touches-border';
  message: string;
}

export interface VectorizeResult {
  svg: string;
  /** The color actually used for the fill. */
  color: string;
  /** Bounding box of the emblem in the source image. */
  bounds: Box;
  pathCount: number;
  pointCount: number;
  diagnostics: Diagnostic[];
}
