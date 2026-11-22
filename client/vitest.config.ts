import { defineConfig } from 'vitest/config';
import path from 'path';

// Runs the shared clinical-logic tests (../shared/tests) and any web unit tests.
export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  test: {
    root: path.resolve(__dirname, '..'),
    include: ['shared/tests/**/*.test.ts', 'client/src/**/*.test.ts'],
    environment: 'node',
  },
});
