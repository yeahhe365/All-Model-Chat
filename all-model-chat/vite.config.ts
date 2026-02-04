
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
            'react-virtuoso'
          ]
        }
      }
    };
});