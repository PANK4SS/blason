import { Dropzone } from './components/Dropzone';
import { OptionsPanel } from './components/OptionsPanel';
import { ResultCard } from './components/ResultCard';
import { useVectorizer } from './hooks/useVectorizer';
import { byteLength, svgFileName } from './lib/format';
import { saveTextFile } from './platform/save';

export default function App() {
  const { jobs, options, setOptions, resetOptions, addFiles, remove, clear, setColor, isWorking, rejected } =
    useVectorizer();

  const ready = jobs.filter((job) => job.result && job.result.pathCount > 0);

  const downloadAll = async (): Promise<void> => {
    for (const job of ready) {
      if (!job.result) continue;
      const saved = await saveTextFile(svgFileName(job.fileName), job.result.svg);
      if (!saved) break;
    }
  };

  return (
    <div className="app">
      <header className="app-head">
        <img className="app-logo" src="/logo.svg" alt="" width={52} height={52} />
        <div>
          <h1>Blason</h1>
          <p className="lede">
            Turns a raster emblem into a vector SVG, without its background.
          </p>
        </div>
      </header>

      {jobs.length === 0 && (
        <section className="requirements" aria-label="Requirements for a good result">
          <h2>What it needs to work</h2>
          <ol>
            <li>
              The emblem must be in <strong>one single, even color</strong>. A photo, a gradient or
              a multicolored logo comes out as a flat silhouette.
            </li>
            <li>
              It must sit on a <strong>perfectly white background</strong>, with no shadow and no
              gradient.
            </li>
            <li>
              That color must be <strong>solid and clearly visible</strong>: anything close to
              white is taken for background.
            </li>
          </ol>
        </section>
      )}

      <Dropzone onFiles={(files) => void addFiles(files)} compact={jobs.length > 0} />

      {rejected.length > 0 && (
        <p className="notice notice-error">Skipped files: {rejected.join(', ')}</p>
      )}

      <OptionsPanel options={options} onChange={setOptions} onReset={resetOptions} />

      {jobs.length > 0 && (
        <div className="toolbar">
          <span className="toolbar-status">
            {jobs.length} image{jobs.length > 1 ? 's' : ''}
            {isWorking ? ' · working' : ''}
          </span>
          <span className="toolbar-actions">
            {ready.length > 1 && (
              <button type="button" className="button" onClick={() => void downloadAll()}>
                Download all ({ready.length})
              </button>
            )}
            <button type="button" className="button-quiet" onClick={clear}>
              Clear
            </button>
          </span>
        </div>
      )}

      <div className="grid">
        {jobs.map((job) => (
          <ResultCard key={job.id} job={job} onColorChange={setColor} onRemove={remove} />
        ))}
      </div>

      {jobs.length === 0 && (
        <p className="empty">
          The SVGs it produces hold nothing but a filled path, with no background: they sit on any
          color and scale without loss.
        </p>
      )}

      <footer className="app-foot">
        <span>
          All processing happens on your machine. No image is ever sent to a server.
        </span>
        {ready.length > 0 && (
          <span>
            {Math.round(ready.reduce((total, job) => total + byteLength(job.result?.svg ?? ''), 0) / 1024)} KB of
            SVG produced
          </span>
        )}
      </footer>
    </div>
  );
}
