import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Le port est figé et `strictPort` activé : Tauri pointe sur cette adresse en
 * développement et ne doit pas se retrouver sur un autre port.
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
