/** Image RGBA brute, indépendante du DOM (compatible ImageData). */
export interface RasterImage {
  readonly width: number;
  readonly height: number;
  /** 4 octets par pixel, RGBA non prémultiplié. */
  readonly data: Uint8ClampedArray;
}

/** Champ scalaire monocanal en virgule flottante. */
export interface ScalarField {
  readonly width: number;
  readonly height: number;
  readonly data: Float32Array;
}

/** Masque binaire, 1 = encre (emblème), 0 = fond. */
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
  /** Seuil de détection de l'encre, 0-255. Plus bas = capte les teintes claires. */
  threshold: number;
  /** Suréchantillonnage avant tracé des contours, 1-4. Plus haut = contours plus fins. */
  upscale: number;
  /** Lissage des contours, en pixels suréchantillonnés. */
  smoothing: number;
  /** Espacement des points de contrôle, en pixels suréchantillonnés. Plus haut = moins de points. */
  detail: number;
  /** Surface minimale d'une forme conservée, en pixels source. */
  minArea: number;
  /** Marge laissée autour de l'emblème, en pixels source. */
  padding: number;
  /** Couleur de remplissage imposée (#RRGGBB), ou null pour détecter celle de l'image. */
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
  /** Couleur effectivement utilisée pour le remplissage. */
  color: string;
  /** Cadre de l'emblème dans l'image source. */
  bounds: Box;
  pathCount: number;
  pointCount: number;
  diagnostics: Diagnostic[];
}
