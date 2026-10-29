/**
 * Enregistrement d'un fichier, côté web comme côté bureau.
 *
 * Dans un navigateur, un lien de téléchargement suffit. Sous Tauri, la webview
 * ne télécharge pas : on passe par la boîte de dialogue native, chargée à la
 * demande pour que le paquet web n'embarque rien d'inutile.
 */
export function isDesktop(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export async function saveTextFile(filename: string, contents: string, mime = 'image/svg+xml'): Promise<boolean> {
  if (isDesktop()) return saveWithNativeDialog(filename, contents);
  downloadInBrowser(filename, contents, mime);
  return true;
}

function downloadInBrowser(filename: string, contents: string, mime: string): void {
  const url = URL.createObjectURL(new Blob([contents], { type: `${mime};charset=utf-8` }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.append(link);
  link.click();
  link.remove();
  // Laisse le temps au téléchargement de démarrer avant de libérer l'URL.
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

async function saveWithNativeDialog(filename: string, contents: string): Promise<boolean> {
  const [{ save }, { writeTextFile }] = await Promise.all([
    import('@tauri-apps/plugin-dialog'),
    import('@tauri-apps/plugin-fs'),
  ]);

  const path = await save({
    defaultPath: filename,
    filters: [{ name: 'Image vectorielle', extensions: ['svg'] }],
  });
  if (!path) return false;

  await writeTextFile(path, contents);
  return true;
}
