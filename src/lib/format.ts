/** SVG file name derived from the original name. */
export function svgFileName(name: string): string {
  const base = name.replace(/\.[^.]+$/, '').trim() || 'emblem';
  return `${base.replace(/[\\/:*?"<>|]+/g, '-')}.svg`;
}

/** Readable name, without extension, for display and the SVG <title>. */
export function baseName(name: string): string {
  return name.replace(/\.[^.]+$/, '') || name;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function byteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}
