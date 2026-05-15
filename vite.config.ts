import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { getManualChunk, HEAVY_PRELOAD_PATTERNS } from './vite/chunks';
import { createDisabledMermaidDiagramPlugin } from './vite/disabledMermaidDiagramsPlugin';
import { createLocalApiPlugin } from './vite/localApiPlugin';
import { LAMEJS_WORKER_COPY_SOURCE, PDF_WORKER_COPY_SOURCE } from './vite/staticAssets';

export { getManualChunk } from './vite/chunks';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 5175,
      strictPort: true,
    },
    plugins: [
      createDisabledMermaidDiagramPlugin(),
      createLocalApiPlugin(),
      tailwindcss(),
      react(),
      VitePWA({
        strategies: 'injectManifest',
        srcDir: 'src/pwa',
        filename: 'sw.ts',
        injectRegister: false,
        manifest: false,
        injectManifest: {
          globPatterns: ['**/*.{js,css,html,png,svg,mjs,json,woff,woff2,ttf}'],
          globIgnores: [
            '**/runtime-config.js',
            '**/pyodide/**',
            '**/assets/pyodide-runtime-*.js',
            '**/assets/pdfjs-vendor-*.js',
            '**/assets/graphviz-vendor-*.js',
            '**/assets/html2canvas.esm-*.js',
            '**/assets/data-vendor-*.js',
            '**/fonts/NotoSansCJKsc-VF.ttf.part-*',
          ],
        },
        devOptions: {
          enabled: false,
        },
      }),
      viteStaticCopy({
        targets: [
          {
            src: 'node_modules/pyodide/*',
            dest: 'pyodide',
          },
          {
            src: PDF_WORKER_COPY_SOURCE,
            dest: '.',
          },
          {
            src: LAMEJS_WORKER_COPY_SOURCE,
            dest: '.',
          },
        ],
      }),
    ],
    define: {
      'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || ''),
    },
    resolve: {
      alias: {
        '@': path.resolve('./src'),
      },
    },
    build: {
      chunkSizeWarningLimit: 1500,
      modulePreload: {
        resolveDependencies: (_filename, deps) => {
          return deps.filter((dep) => !HEAVY_PRELOAD_PATTERNS.some((pattern) => pattern.test(dep)));
        },
      },
      rollupOptions: {
        output: {
          manualChunks: getManualChunk,
        },
      },
    },
  };
});
