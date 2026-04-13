import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

const MERMAID_DIST_IMPORTER_PATTERN = /node_modules[\\/]mermaid[\\/]dist[\\/]/;
const MERMAID_DISABLED_MODULE_PREFIX = '\0disabled-mermaid-diagram:';
const DISABLED_MERMAID_DIAGRAMS = [
  {
    id: 'flowchart-elk',
    pattern: /^\.\/flowchart-elk-definition-[^/]+\.js$/,
    message:
      'Mermaid flowchart-elk support is disabled in this build to reduce bundle size. Use standard flowchart/graph diagrams instead.',
  },
  {
    id: 'mindmap',
    pattern: /^\.\/mindmap-definition-[^/]+\.js$/,
    message: 'Mermaid mindmap support is disabled in this build to reduce bundle size.',
  },
] as const;

const isPackagePath = (id: string, packages: string[]) => {
  return packages.some((pkg) => id.includes(`/node_modules/${pkg}/`) || id.includes(`\\node_modules\\${pkg}\\`));
};

const MARKDOWN_PACKAGES = [
  'react-markdown',
  'remark-gfm',
  'remark-breaks',
  'rehype-raw',
  'rehype-sanitize',
  'unified',
  'remark-parse',
  'remark-rehype',
  'unist-util-visit',
  'unist-util-visit-parents',
  'unist-util-is',
  'micromark',
  'mdast-util-from-markdown',
  'mdast-util-to-hast',
  'mdast-util-to-string',
  'hast-util-to-html',
  'hast-util-from-html-isomorphic',
  'hast-util-to-text',
  'property-information',
  'vfile',
];

const MATH_PACKAGES = ['remark-math', 'rehype-katex', 'katex'];

const HIGHLIGHT_PACKAGES = ['rehype-highlight', 'highlight.js', 'lowlight'];

const REACT_PACKAGES = ['react', 'react-dom', 'scheduler'];

const PDF_VIEWER_PACKAGES = ['react-pdf'];

const PDFJS_PACKAGES = ['pdfjs-dist'];

const HTML_EXPORT_PACKAGES = ['html2canvas', 'html2pdf.js', 'jspdf'];

const MERMAID_PACKAGES = ['mermaid'];

const GRAPHVIZ_PACKAGES = ['@viz-js/viz'];

const DATA_PACKAGES = ['xlsx'];

const isSourcePath = (id: string, sourcePath: string) =>
  id.endsWith(sourcePath) || id.includes(sourcePath.replace(/\//g, '\\'));

export const getManualChunk = (id: string) => {
  if (isSourcePath(id, '/src/constants/settingsModelOptions.ts')) {
    return 'settings-options';
  }

  if (isSourcePath(id, '/src/services/pyodideService.ts') || isSourcePath(id, '/src/hooks/usePyodide.ts')) {
    return 'pyodide-runtime';
  }

  if (!id.includes('node_modules')) return undefined;

  if (isPackagePath(id, REACT_PACKAGES)) {
    return 'react-vendor';
  }

  if (isPackagePath(id, ['@google/genai'])) {
    return 'genai-vendor';
  }

  if (isPackagePath(id, HIGHLIGHT_PACKAGES)) {
    return 'highlight-vendor';
  }

  if (isPackagePath(id, MATH_PACKAGES)) {
    return 'math-vendor';
  }

  if (isPackagePath(id, MARKDOWN_PACKAGES)) {
    return 'markdown-vendor';
  }

  if (isPackagePath(id, ['lucide-react'])) {
    return 'icons-vendor';
  }

  if (isPackagePath(id, ['zustand'])) {
    return 'state-vendor';
  }

  if (isPackagePath(id, MERMAID_PACKAGES)) {
    return 'mermaid-vendor';
  }

  if (isPackagePath(id, GRAPHVIZ_PACKAGES)) {
    return 'graphviz-vendor';
  }

  if (isPackagePath(id, ['@formkit/auto-animate'])) {
    return 'ui-vendor';
  }

  if (isPackagePath(id, ['react-virtuoso'])) {
    return 'ui-vendor';
  }

  if (isPackagePath(id, HTML_EXPORT_PACKAGES)) {
    return 'html-export-vendor';
  }

  if (isPackagePath(id, PDFJS_PACKAGES)) {
    return 'pdfjs-vendor';
  }

  if (isPackagePath(id, PDF_VIEWER_PACKAGES)) {
    return 'pdf-viewer-vendor';
  }

  if (isPackagePath(id, DATA_PACKAGES)) {
    return 'data-vendor';
  }

  return undefined;
};

const createDisabledMermaidDiagramPlugin = () => {
  return {
    name: 'disabled-mermaid-diagrams',
    enforce: 'pre' as const,
    resolveId(source: string, importer?: string) {
      if (!importer || !MERMAID_DIST_IMPORTER_PATTERN.test(importer)) return null;

      const disabledDiagram = DISABLED_MERMAID_DIAGRAMS.find(({ pattern }) => pattern.test(source));
      if (!disabledDiagram) return null;

      return `${MERMAID_DISABLED_MODULE_PREFIX}${disabledDiagram.id}`;
    },
    load(id: string) {
      if (!id.startsWith(MERMAID_DISABLED_MODULE_PREFIX)) return null;

      const diagramId = id.slice(MERMAID_DISABLED_MODULE_PREFIX.length);
      const disabledDiagram = DISABLED_MERMAID_DIAGRAMS.find(({ id: disabledId }) => disabledId === diagramId);
      if (!disabledDiagram) return null;

      return `
const message = ${JSON.stringify(disabledDiagram.message)};

export const diagram = {
  db: {
    clear() {},
  },
  renderer: {
    draw() {
      throw new Error(message);
    },
  },
  parser: {
    parser: { yy: {} },
    parse() {
      throw new Error(message);
    },
  },
  styles: () => '',
  init: () => undefined,
};
`;
    },
  };
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      createDisabledMermaidDiagramPlugin(),
      tailwindcss(),
      react(),
      viteStaticCopy({
        targets: [
          {
            src: 'node_modules/pyodide/*',
            dest: 'pyodide',
          },
          {
            src: 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs',
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
        // __dirname is not available in ES modules.
        // We'll resolve from the current working directory.
        '@': path.resolve('./src'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: getManualChunk,
        },
      },
    },
  };
});
