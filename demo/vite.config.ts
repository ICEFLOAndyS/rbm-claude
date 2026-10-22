import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

/** The prototype demo: npm run demo. */
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  // .env lives at the repository root (VITE_MUI_X_LICENSE_KEY), not in demo/.
  envDir: fileURLToPath(new URL('..', import.meta.url)),
  plugins: [react()],
  server: { port: 5173, fs: { allow: [fileURLToPath(new URL('..', import.meta.url))] } },
});
