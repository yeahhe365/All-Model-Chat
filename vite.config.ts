
import fs from 'node:fs';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { resolveGeminiApiKeys } from './src/platform/genai/client';

const manualChunkGroups: Record<string, string[]> = {
  'vendor-genai': ['@google/genai'],
  'vendor-markdown': [
    'react-markdown',
    'remark-gfm',
    'remark-breaks',
    'rehype-raw',
    'rehype-sanitize',
    'marked',
    'dompurify',
    'turndown',
    'turndown-plugin-gfm',
  ],
  'vendor-highlight': ['highlight.js', 'rehype-highlight'],
  'vendor-math': ['remark-math', 'rehype-katex', 'katex'],
  'vendor-icons': ['lucide-react'],
  'vendor-state': ['zustand'],
};

const getManualChunkName = (id: string) => {
  if (!id.includes('node_modules')) {
    return undefined;
  }

  for (const [chunkName, packages] of Object.entries(manualChunkGroups)) {
    if (packages.some((pkg) => id.includes(`node_modules/${pkg}/`))) {
      return chunkName;
    }
  }

  return undefined;
};

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const packageJson = JSON.parse(fs.readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as { version: string };
    return {
      plugins: [
        react(),
        viteStaticCopy({
            targets: [
                {
                    src: 'node_modules/pyodide/*',
                    dest: 'pyodide'
                }
            ]
        })
      ],
      define: {
        'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || ''),
        'import.meta.env.APP_VERSION': JSON.stringify(packageJson.version),
      },
      resolve: {
        alias: {
          // __dirname is not available in ES modules.
          // We'll resolve from the current working directory.
          '@': path.resolve('./src'),
        }
      },
      build: {
        rollupOptions: {
          // Externalize React and ReactDOM to ensure the app uses the same
          // instance as react-pdf (which is loaded via CDN/importmap).
          // This prevents the "Cannot read properties of null (reading 'useReducer')" error.
          external: [
            'react', 
            'react-dom', 
            'react-dom/client', 
            'react/jsx-runtime',
            'react-pdf', 
            'pdfjs-dist',
            '@formkit/auto-animate/react',
            'react-virtuoso',
            'xlsx'
          ],
          output: {
            manualChunks: getManualChunkName,
          },
        }
      }
    };
});
