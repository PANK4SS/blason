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
          <h1>Emblem Vectorizer</h1>
          <p className="lede">
            Transforme un emblème en image matricielle en SVG vectoriel, sans son fond.
          </p>
        </div>
      </header>

      {jobs.length === 0 && (
        <section className="requirements" aria-label="Conditions pour un bon résultat">
          <h2>Pour que ça marche</h2>
          <ol>
            <li>
              L'emblème doit être sur un <strong>fond parfaitement blanc</strong>, sans ombre ni
              dégradé.
            </li>
            <li>
              Sa couleur doit être <strong>franche et bien visible</strong> : ce qui est presque
              blanc est pris pour du fond.
            </li>
          </ol>
        </section>
      )}

      <Dropzone onFiles={(files) => void addFiles(files)} compact={jobs.length > 0} />

      {rejected.length > 0 && (
        <p className="notice notice-error">Fichiers ignorés : {rejected.join(', ')}</p>
      )}

      <OptionsPanel options={options} onChange={setOptions} onReset={resetOptions} />

      {jobs.length > 0 && (
        <div className="toolbar">
          <span className="toolbar-status">
            {jobs.length} image{jobs.length > 1 ? 's' : ''}
            {isWorking ? ' — calcul en cours' : ''}
          </span>
          <span className="toolbar-actions">
            {ready.length > 1 && (
              <button type="button" className="button" onClick={() => void downloadAll()}>
                Tout télécharger ({ready.length})
              </button>
            )}
            <button type="button" className="button-quiet" onClick={clear}>
              Vider
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
          Les SVG produits ne contiennent qu'un tracé rempli, sans fond : ils se posent sur
          n'importe quelle couleur et se redimensionnent sans perte.
        </p>
      )}

      <footer className="app-foot">
        <span>
          Tout le traitement se fait sur votre machine. Aucune image n'est envoyée sur un serveur.
        </span>
        {ready.length > 0 && (
          <span>
            {Math.round(ready.reduce((total, job) => total + byteLength(job.result?.svg ?? ''), 0) / 1024)} Ko de
            SVG produits
          </span>
        )}
      </footer>
    </div>
  );
}
