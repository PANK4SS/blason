/** Nom de fichier SVG dérivé du nom d'origine. */
export function svgFileName(name: string): string {
  const base = name.replace(/\.[^.]+$/, '').trim() || 'embleme';
  return `${base.replace(/[\\/:*?"<>|]+/g, '-')}.svg`;
}

/** Nom lisible, sans extension, pour l'affichage et le <title> du SVG. */
export function baseName(name: string): string {
  return name.replace(/\.[^.]+$/, '') || name;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export function byteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}
