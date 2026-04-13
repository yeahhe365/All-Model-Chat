/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve('./src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'server/src/**/*.{test,spec}.ts'],
    // Vitest accepts this at runtime, but the InlineConfig type from the current toolchain
    // doesn't expose it here yet.
    // @ts-expect-error environmentMatchGlobs is supported by Vitest runtime
    environmentMatchGlobs: [['server/src/**/*.{test,spec}.ts', 'node']],
    css: true,
  },
});
