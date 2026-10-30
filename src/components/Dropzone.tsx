import { useRef, useState, type DragEvent } from 'react';
import { ACCEPTED_EXTENSIONS, ACCEPTED_TYPES } from '../platform/decodeImage';

interface DropzoneProps {
  onFiles: (files: FileList | File[]) => void;
  compact: boolean;
}

export function Dropzone({ onFiles, compact }: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOver, setIsOver] = useState(false);

  const handleDrop = (event: DragEvent<HTMLButtonElement>): void => {
    event.preventDefault();
    setIsOver(false);
    if (event.dataTransfer?.files?.length) onFiles(event.dataTransfer.files);
  };

  return (
    <>
      <button
        type="button"
        className="dropzone"
        data-over={isOver}
        data-compact={compact}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setIsOver(true);
        }}
        onDragLeave={() => setIsOver(false)}
        onDrop={handleDrop}
      >
        <span className="dropzone-title">
          {compact ? 'Add more images' : 'Drop your images here'}
        </span>
        <span className="dropzone-hint">
          PNG, WebP or JPEG, or click to pick files
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        className="visually-hidden"
        multiple
        accept={[...ACCEPTED_TYPES, ...ACCEPTED_EXTENSIONS].join(',')}
        onChange={(event) => {
          if (event.target.files?.length) onFiles(event.target.files);
          event.target.value = '';
        }}
      />
    </>
  );
}
