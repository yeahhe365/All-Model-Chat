
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          // __dirname is not available in ES modules.
          // We'll resolve from the current working directory.
          '@': path.resolve('.'),
        }
      },
      build: {
        rollupOptions: {
          output: {
            manualChunks: (id) => {
              if (id.includes('node_modules')) {
                if (id.includes('mermaid')) return 'mermaid';
                if (id.includes('@google/genai')) return 'genai';
                if (id.includes('highlight.js')) return 'hljs';
                if (id.includes('katex')) return 'katex';
                if (id.includes('html2canvas')) return 'html2canvas';
                if (id.includes('mammoth') || id.includes('turndown') || id.includes('jszip')) return 'file-utils';
                if (id.includes('rehype') || id.includes('remark') || id.includes('react-markdown')) return 'markdown';
                if (id.includes('lucide-react')) return 'icons';
              }
            }
          },
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
            '@formkit/auto-animate/react'
          ]
        }
      }
    };
});
