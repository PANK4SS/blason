import type { RasterImage, VectorizeOptions, VectorizeResult } from '../core/types';
import type { WorkerRequest, WorkerResponse } from '../workers/protocol';

export interface RunOutcome {
  result: VectorizeResult;
  elapsedMs: number;
}

interface Deferred {
  resolve: (value: RunOutcome) => void;
  reject: (error: Error) => void;
}

/**
 * Accès au worker de vectorisation sous forme de promesses. Le calcul sort du
 * fil principal : l'interface reste réactive même sur une grande image.
 */
export class VectorizerClient {
  private readonly worker: Worker;
  private readonly runs = new Map<number, Deferred>();
  private readonly loads = new Map<string, Array<() => void>>();
  private nextRequestId = 1;

  constructor() {
    this.worker = new Worker(new URL('../workers/vectorize.worker.ts', import.meta.url), {
      type: 'module',
    });
    this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => this.dispatch(event.data);
    // Un worker qui échoue au chargement ne répond jamais : sans cela, les
    // promesses en attente resteraient bloquées et l'interface figée.
    this.worker.onerror = (event) => this.failAll(event.message || 'Le moteur de vectorisation a échoué.');
    this.worker.onmessageerror = () => this.failAll('Message illisible reçu du moteur de vectorisation.');
  }

  /** Confie les pixels au worker. Le tampon est transféré, pas copié. */
  load(id: string, image: RasterImage, title: string): Promise<void> {
    return new Promise((resolve) => {
      const waiting = this.loads.get(id) ?? [];
      waiting.push(resolve);
      this.loads.set(id, waiting);
      this.send({ type: 'load', id, image, title }, [image.data.buffer]);
    });
  }

  run(id: string, options: VectorizeOptions): Promise<RunOutcome> {
    const requestId = this.nextRequestId;
    this.nextRequestId += 1;
    return new Promise<RunOutcome>((resolve, reject) => {
      this.runs.set(requestId, { resolve, reject });
      this.send({ type: 'run', id, requestId, options });
    });
  }

  drop(id: string): void {
    this.loads.delete(id);
    this.send({ type: 'drop', id });
  }

  dispose(): void {
    this.worker.terminate();
    this.runs.clear();
    this.loads.clear();
  }

  private failAll(message: string): void {
    const waiting = [...this.runs.values()];
    this.runs.clear();
    waiting.forEach(({ reject }) => reject(new Error(message)));
  }

  private send(message: WorkerRequest, transfer?: Transferable[]): void {
    this.worker.postMessage(message, transfer ?? []);
  }

  private dispatch(message: WorkerResponse): void {
    if (message.type === 'loaded') {
      this.loads.get(message.id)?.forEach((resolve) => resolve());
      this.loads.delete(message.id);
      return;
    }

    const deferred = this.runs.get(message.requestId);
    if (!deferred) return;
    this.runs.delete(message.requestId);

    if (message.type === 'done') {
      deferred.resolve({ result: message.result, elapsedMs: message.elapsedMs });
    } else {
      deferred.reject(new Error(message.message));
    }
  }
}

export type { VectorizeOptions, VectorizeResult };
