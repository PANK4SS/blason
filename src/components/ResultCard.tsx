import { useState } from 'react';
import type { Job } from '../hooks/useVectorizer';
import { byteLength, formatBytes, svgFileName } from '../lib/format';
import { saveTextFile } from '../platform/save';

interface ResultCardProps {
  job: Job;
  onColorChange: (id: string, color: string | null) => void;
  onRemove: (id: string) => void;
}

export function ResultCard({ job, onColorChange, onRemove }: ResultCardProps) {
  const [view, setView] = useState<'svg' | 'source'>('svg');
  const { result } = job;

  const download = async (): Promise<void> => {
    if (!result) return;
    await saveTextFile(svgFileName(job.fileName), result.svg);
  };

  return (
    <article className="card">
      <header className="card-head">
        <h2 className="card-title" title={job.fileName}>
          {job.title}
        </h2>
        <button
          type="button"
          className="button-quiet"
          onClick={() => onRemove(job.id)}
          aria-label={`Retirer ${job.title}`}
        >
          Retirer
        </button>
      </header>

      <div className="preview" data-view={view}>
        {view === 'svg' && result ? (
          <img
            className="preview-image"
            src={`data:image/svg+xml;utf8,${encodeURIComponent(result.svg)}`}
            alt={`Vectorisation de ${job.title}`}
          />
        ) : (
          <img className="preview-image" src={job.previewUrl} alt={`Image d'origine de ${job.title}`} />
        )}
        {job.status === 'working' && <span className="preview-badge">Calcul…</span>}
      </div>

      <div className="switch" role="group" aria-label="Aperçu">
        <button type="button" data-active={view === 'svg'} onClick={() => setView('svg')}>
          SVG détouré
        </button>
        <button type="button" data-active={view === 'source'} onClick={() => setView('source')}>
          Image d'origine
        </button>
      </div>

      {job.error && <p className="notice notice-error">{job.error}</p>}

      {result?.diagnostics.map((diagnostic) => (
        <p key={diagnostic.code} className={`notice notice-${diagnostic.level}`}>
          {diagnostic.message}
        </p>
      ))}

      {result && (
        <>
          <dl className="stats">
            <div>
              <dt>Source</dt>
              <dd>
                {job.width} × {job.height} px
              </dd>
            </div>
            <div>
              <dt>Tracés</dt>
              <dd>{result.pathCount}</dd>
            </div>
            <div>
              <dt>Points</dt>
              <dd>{result.pointCount}</dd>
            </div>
            <div>
              <dt>Poids</dt>
              <dd>{formatBytes(byteLength(result.svg))}</dd>
            </div>
            <div>
              <dt>Calcul</dt>
              <dd>{job.elapsedMs} ms</dd>
            </div>
          </dl>

          <div className="card-actions">
            <label className="color-field">
              <input
                type="color"
                value={result.color}
                onChange={(event) => onColorChange(job.id, event.target.value.toUpperCase())}
                aria-label="Couleur de remplissage"
              />
              <span>{result.color}</span>
            </label>
            {job.colorOverride && (
              <button type="button" className="button-quiet" onClick={() => onColorChange(job.id, null)}>
                Couleur d'origine
              </button>
            )}
            <button
              type="button"
              className="button"
              onClick={() => void download()}
              disabled={result.pathCount === 0}
            >
              Télécharger le SVG
            </button>
          </div>
        </>
      )}
    </article>
  );
}
