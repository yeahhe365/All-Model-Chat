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
          '@': path.resolve('.'),
        }
      },
      build: {
        rollupOptions: {
          external: [
            'react',
            'react-dom',
            'react-dom/client',
            'react/jsx-runtime',
            'lucide-react',
            'react-pdf',
            'pdfjs-dist',
            '@google/genai',
            'mermaid',
            'dompurify',
            'highlight.js',
            'marked',
            'jszip',
            'mammoth',
            'turndown',
            'turndown-plugin-gfm',
            'react-markdown',
            'remark-gfm',
            'remark-breaks',
            'rehype-highlight',
            'rehype-raw',
            'remark-math',
            'rehype-katex',
            'rehype-sanitize',
            'html2canvas'
          ]
        }
      }
    };
});