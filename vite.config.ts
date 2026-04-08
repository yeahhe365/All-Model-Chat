
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { resolveGeminiApiKeys } from './src/platform/genai/client';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const geminiApiKeys = resolveGeminiApiKeys(env);
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
        'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(geminiApiKeys || '')
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
          ]
        }
      }
    };
});
