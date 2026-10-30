import type { RasterImage, VectorizeOptions, VectorizeResult } from '../core/types';

/**
 * Messages exchanged with the worker. The image stays cached there, so only
 * the settings travel afterwards. Every run carries a `requestId` so that two
 * settings changed in a row cannot cross their answers.
 */
export type WorkerRequest =
  | { type: 'load'; id: string; image: RasterImage; title: string }
  | { type: 'run'; id: string; requestId: number; options: VectorizeOptions }
  | { type: 'drop'; id: string };

export type WorkerResponse =
  | { type: 'loaded'; id: string }
  | { type: 'done'; id: string; requestId: number; result: VectorizeResult; elapsedMs: number }
  | { type: 'failed'; id: string; requestId: number; message: string };
