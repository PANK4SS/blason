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
    label: 'Detection threshold',
    hint: 'Lower picks up light shades; higher picks up only solid colors.',
    min: 5,
    max: 160,
    step: 1,
  },
  {
    key: 'upscale',
    label: 'Contour precision',
    hint: 'How precise the contour is. Past 3, the computation takes longer for little gain.',
    min: 1,
    max: 4,
    step: 1,
  },
  {
    key: 'smoothing',
    label: 'Smoothing',
    hint: 'Softens the pixel staircase. Too much, and the corners round off.',
    min: 0,
    max: 8,
    step: 0.2,
  },
  {
    key: 'detail',
    label: 'Simplification',
    hint: 'Higher keeps the file small; lower makes the path hug the pixels.',
    min: 1,
    max: 20,
    step: 0.5,
  },
  {
    key: 'minArea',
    label: 'Ignored shapes',
    hint: 'Area below which a speck is treated as dust.',
    min: 0,
    max: 200,
    step: 2,
  },
  {
    key: 'padding',
    label: 'Padding',
    hint: 'Space left around the emblem inside the SVG.',
    min: 0,
    max: 60,
    step: 1,
  },
];

export function OptionsPanel({ options, onChange, onReset }: OptionsPanelProps) {
  return (
    <details className="panel">
      <summary>Settings</summary>
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
        Back to default settings
      </button>
    </details>
  );
}
