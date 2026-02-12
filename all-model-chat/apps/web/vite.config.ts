
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const bffProxyTarget = env.VITE_BFF_PROXY_TARGET || 'http://127.0.0.1:8787';

  return {
    plugins: [react()],
    css: {
      postcss: {
        plugins: [
          tailwindcss({
            content: [
              "./index.html",
              "./{components,hooks,services,utils,constants,contexts,types,styles}/**/*.{js,ts,jsx,tsx}",
              "./*.{js,ts,jsx,tsx}"
            ],
            theme: {
              extend: {},
            },
            plugins: [],
          }),
          autoprefixer(),
        ],
      },
    },
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    server: {
      proxy: {
        '/api': {
          target: bffProxyTarget,
          changeOrigin: true,
        },
      },
    },
    resolve: {
      alias: {
        // __dirname is not available in ES modules.
        // We'll resolve from the current working directory.
        '@': path.resolve('.'),
      }
    }
  };
});
