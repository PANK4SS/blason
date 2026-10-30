/**
 * Saving a file, on the web as well as on the desktop.
 *
 * In a browser a download link is enough. Under Tauri the webview does not
 * download, so it goes through the native dialog, loaded on demand so the web
 * bundle carries nothing it does not need.
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
  // Give the download time to start before releasing the URL.
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

async function saveWithNativeDialog(filename: string, contents: string): Promise<boolean> {
  const [{ save }, { writeTextFile }] = await Promise.all([
    import('@tauri-apps/plugin-dialog'),
    import('@tauri-apps/plugin-fs'),
  ]);

  const path = await save({
    defaultPath: filename,
    filters: [{ name: 'Vector image', extensions: ['svg'] }],
  });
  if (!path) return false;

  await writeTextFile(path, contents);
  return true;
}
