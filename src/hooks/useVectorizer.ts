import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_OPTIONS, type VectorizeOptions, type VectorizeResult } from '../core/types';
import { decodeImage, isSupported } from '../platform/decodeImage';
import { VectorizerClient } from '../platform/vectorizerClient';
import { baseName } from '../lib/format';

export interface Job {
  id: string;
  fileName: string;
  title: string;
  previewUrl: string;
  width: number;
  height: number;
  status: 'working' | 'ready' | 'error';
  result: VectorizeResult | null;
  error: string | null;
  elapsedMs: number;
  /** Couleur imposée par l'utilisateur, ou null pour celle détectée. */
  colorOverride: string | null;
}

/** Délai d'attente avant de rejouer la vectorisation quand on règle un curseur. */
const SETTLE_MS = 160;

export function useVectorizer() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [options, setOptions] = useState<VectorizeOptions>(DEFAULT_OPTIONS);
  const [rejected, setRejected] = useState<string[]>([]);

  const clientRef = useRef<VectorizerClient | null>(null);
  const generationRef = useRef(new Map<string, number>());
  const jobsRef = useRef<Job[]>([]);
  jobsRef.current = jobs;

  const client = useCallback((): VectorizerClient => {
    clientRef.current ??= new VectorizerClient();
    return clientRef.current;
  }, []);

  useEffect(
    () => () => {
      clientRef.current?.dispose();
      // Remis à zéro pour que le double montage de StrictMode recrée le worker.
      clientRef.current = null;
      jobsRef.current.forEach((job) => URL.revokeObjectURL(job.previewUrl));
    },
    [],
  );

  const patch = useCallback((id: string, changes: Partial<Job>): void => {
    setJobs((current) => current.map((job) => (job.id === id ? { ...job, ...changes } : job)));
  }, []);

  /** Lance une vectorisation et ignore le résultat si un réglage plus récent l'a remplacée. */
  const execute = useCallback(
    async (id: string, runOptions: VectorizeOptions): Promise<void> => {
      const generation = (generationRef.current.get(id) ?? 0) + 1;
      generationRef.current.set(id, generation);
      patch(id, { status: 'working', error: null });

      try {
        const { result, elapsedMs } = await client().run(id, runOptions);
        if (generationRef.current.get(id) !== generation) return;
        patch(id, { status: 'ready', result, elapsedMs, error: null });
      } catch (error) {
        if (generationRef.current.get(id) !== generation) return;
        patch(id, {
          status: 'error',
          error: error instanceof Error ? error.message : 'Vectorisation impossible.',
        });
      }
    },
    [client, patch],
  );

  const addFiles = useCallback(
    async (files: FileList | File[]): Promise<void> => {
      const incoming = Array.from(files);
      const unsupported = incoming.filter((file) => !isSupported(file)).map((file) => file.name);
      setRejected(unsupported);

      for (const file of incoming.filter(isSupported)) {
        const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
        const title = baseName(file.name);
        const previewUrl = URL.createObjectURL(file);

        try {
          const image = await decodeImage(file);
          const job: Job = {
            id,
            fileName: file.name,
            title,
            previewUrl,
            width: image.width,
            height: image.height,
            status: 'working',
            result: null,
            error: null,
            elapsedMs: 0,
            colorOverride: null,
          };
          setJobs((current) => [...current, job]);
          await client().load(id, image, title);
          await execute(id, options);
        } catch (error) {
          URL.revokeObjectURL(previewUrl);
          setRejected((current) => [
            ...current,
            `${file.name} : ${error instanceof Error ? error.message : 'illisible'}`,
          ]);
        }
      }
    },
    [client, execute, options],
  );

  const remove = useCallback(
    (id: string): void => {
      const job = jobsRef.current.find((item) => item.id === id);
      if (job) URL.revokeObjectURL(job.previewUrl);
      generationRef.current.delete(id);
      client().drop(id);
      setJobs((current) => current.filter((item) => item.id !== id));
    },
    [client],
  );

  const clear = useCallback((): void => {
    jobsRef.current.forEach((job) => {
      URL.revokeObjectURL(job.previewUrl);
      client().drop(job.id);
    });
    generationRef.current.clear();
    setJobs([]);
    setRejected([]);
  }, [client]);

  const setColor = useCallback(
    (id: string, color: string | null): void => {
      patch(id, { colorOverride: color });
      void execute(id, { ...options, color });
    },
    [execute, options, patch],
  );

  const resetOptions = useCallback((): void => setOptions(DEFAULT_OPTIONS), []);

  // Un réglage modifié rejoue toutes les images, après un court répit pour ne
  // pas lancer un calcul à chaque pixel de curseur déplacé.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return undefined;
    }
    const timer = window.setTimeout(() => {
      jobsRef.current.forEach((job) => {
        void execute(job.id, { ...options, color: job.colorOverride });
      });
    }, SETTLE_MS);
    return () => window.clearTimeout(timer);
  }, [options, execute]);

  const isWorking = useMemo(() => jobs.some((job) => job.status === 'working'), [jobs]);

  return {
    jobs,
    options,
    setOptions,
    resetOptions,
    addFiles,
    remove,
    clear,
    setColor,
    isWorking,
    rejected,
  };
}
