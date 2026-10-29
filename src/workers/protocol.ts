import type { RasterImage, VectorizeOptions, VectorizeResult } from '../core/types';

/**
 * Messages échangés avec le worker. L'image y reste en cache : seuls les
 * réglages circulent ensuite. Chaque exécution porte un `requestId` pour que
 * deux réglages enchaînés ne puissent pas croiser leurs réponses.
 */
export type WorkerRequest =
  | { type: 'load'; id: string; image: RasterImage; title: string }
  | { type: 'run'; id: string; requestId: number; options: VectorizeOptions }
  | { type: 'drop'; id: string };

export type WorkerResponse =
  | { type: 'loaded'; id: string }
  | { type: 'done'; id: string; requestId: number; result: VectorizeResult; elapsedMs: number }
  | { type: 'failed'; id: string; requestId: number; message: string };
