import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * The port is pinned and `strictPort` is on: Tauri points at this address in
 * development and must not end up on a different port.
 */
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
    sourcemap: false,
  },
});
