import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    // Whole-page tests draw every region in jsdom, which is slow; 5 s was too tight once runbooks gained their own filters.
    testTimeout: 15_000,
  },
});
