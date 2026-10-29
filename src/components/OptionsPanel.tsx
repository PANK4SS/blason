import type { VectorizeOptions } from '../core/types';

interface OptionsPanelProps {
  options: VectorizeOptions;
  onChange: (options: VectorizeOptions) => void;
  onReset: () => void;
}

interface Control {
  key: keyof Pick<VectorizeOptions, 'threshold' | 'upscale' | 'smoothing' | 'detail' | 'minArea' | 'padding'>;
  label: string;
  hint: string;
  min: number;
  max: number;
  step: number;
}

const CONTROLS: Control[] = [
  {
    key: 'threshold',
    label: 'Seuil de détection',
    hint: 'Plus bas, les teintes claires sont captées ; plus haut, seules les couleurs franches le sont.',
    min: 5,
    max: 160,
    step: 1,
  },
  {
    key: 'upscale',
    label: 'Finesse du tracé',
    hint: 'Précision du contour. Au-delà de 3, le calcul est plus long pour un gain discret.',
    min: 1,
    max: 4,
    step: 1,
  },
  {
    key: 'smoothing',
    label: 'Lissage',
    hint: 'Adoucit l’escalier des pixels. Trop fort, les angles s’arrondissent.',
    min: 0,
    max: 8,
    step: 0.2,
  },
  {
    key: 'detail',
    label: 'Simplification',
    hint: 'Plus haut, le fichier est léger ; plus bas, le tracé colle au pixel.',
    min: 1,
    max: 20,
    step: 0.5,
  },
  {
    key: 'minArea',
    label: 'Formes ignorées',
    hint: 'Surface en dessous de laquelle une tache est considérée comme une poussière.',
    min: 0,
    max: 200,
    step: 2,
  },
  {
    key: 'padding',
    label: 'Marge',
    hint: 'Espace laissé autour de l’emblème dans le SVG.',
    min: 0,
    max: 60,
    step: 1,
  },
];

export function OptionsPanel({ options, onChange, onReset }: OptionsPanelProps) {
  return (
    <details className="panel">
      <summary>Réglages</summary>
      <div className="controls">
        {CONTROLS.map((control) => (
          <label key={control.key} className="control">
            <span className="control-head">
              <span className="control-label">{control.label}</span>
              <output className="control-value">{options[control.key]}</output>
            </span>
            <input
              type="range"
              min={control.min}
              max={control.max}
              step={control.step}
              value={options[control.key]}
              onChange={(event) =>
                onChange({ ...options, [control.key]: Number(event.target.value) })
              }
            />
            <span className="control-hint">{control.hint}</span>
          </label>
        ))}
      </div>
      <button type="button" className="button-quiet" onClick={onReset}>
        Revenir aux réglages par défaut
      </button>
    </details>
  );
}
