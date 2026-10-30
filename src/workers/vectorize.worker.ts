/// <reference lib="webworker" />
import { vectorize } from '../core/vectorize';
import type { RasterImage } from '../core/types';
import type { WorkerRequest, WorkerResponse } from './protocol';

/** The worker keeps the pixels, so replaying a setting does not copy the image again. */
const images = new Map<string, { image: RasterImage; title: string }>();

const reply = (message: WorkerResponse): void => {
  self.postMessage(message);
};

self.onmessage = (event: MessageEvent<WorkerRequest>): void => {
  const message = event.data;

  if (message.type === 'load') {
    images.set(message.id, { image: message.image, title: message.title });
    reply({ type: 'loaded', id: message.id });
    return;
  }

  if (message.type === 'drop') {
    images.delete(message.id);
    return;
  }

  const entry = images.get(message.id);
  if (!entry) {
    reply({
      type: 'failed',
      id: message.id,
      requestId: message.requestId,
      message: 'The image is no longer in memory.',
    });
    return;
  }

  try {
    const started = performance.now();
    const result = vectorize(entry.image, message.options, entry.title);
    reply({
      type: 'done',
      id: message.id,
      requestId: message.requestId,
      result,
      elapsedMs: Math.round(performance.now() - started),
    });
  } catch (error) {
    reply({
      type: 'failed',
      id: message.id,
      requestId: message.requestId,
      message: error instanceof Error ? error.message : 'Vectorization failed.',
    });
  }
};
