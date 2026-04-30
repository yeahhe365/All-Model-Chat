import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

const projectRoot = path.resolve(__dirname, '../..');
const viteConfigPath = path.join(projectRoot, 'vite.config.ts');
const lazyMarkdownRendererPath = path.join(projectRoot, 'src/components/message/LazyMarkdownRenderer.tsx');
const markdownRendererPath = path.join(projectRoot, 'src/components/message/MarkdownRenderer.tsx');
const baseMarkdownRendererEntryPath = path.join(projectRoot, 'src/components/message/BaseMarkdownRendererEntry.tsx');
const indexEntryPath = path.join(projectRoot, 'src/index.tsx');
const useChatPath = path.join(projectRoot, 'src/hooks/chat/useChat.ts');
const useStandardChatPath = path.join(projectRoot, 'src/hooks/message-sender/useStandardChat.ts');
const useStandardChatApiCallPath = path.join(projectRoot, 'src/hooks/message-sender/useStandardChatApiCall.ts');
const usePyodidePath = path.join(projectRoot, 'src/hooks/usePyodide.ts');
const pyodideLoaderPath = path.join(projectRoot, 'src/services/loadPyodideService.ts');
const standardClientFunctionsPath = path.join(projectRoot, 'src/features/standard-chat/standardClientFunctions.ts');
const liveClientFunctionsPath = path.join(projectRoot, 'src/hooks/live-api/liveClientFunctions.ts');
const ttsVoiceSelectorPath = path.join(projectRoot, 'src/components/chat/input/toolbar/TtsVoiceSelector.tsx');
const createFilePdfExportSurfacePath = path.join(
  projectRoot,
  'src/components/modals/create-file/CreateFilePdfExportSurface.tsx',
);
const htmlExportPath = path.join(projectRoot, 'src/utils/export/pdf.ts');

describe('vite.config runtime ownership', () => {
  it('does not externalize core runtime libraries needed in the Vite bundle', () => {
    const config = fs.readFileSync(viteConfigPath, 'utf8');

    expect(config).not.toMatch(/external\s*:\s*\[/);
  });

  it('splits heavy runtime libraries into dedicated lazy chunks', () => {
    const config = fs.readFileSync(viteConfigPath, 'utf8');

    expect(config).toContain("'pdfjs-vendor'");
    expect(config).toContain("'highlight-vendor'");
    expect(config).toContain("'graphviz-vendor'");
    expect(config).not.toContain("'html-export-vendor'");
    expect(config).not.toContain("'mermaid-vendor'");
    expect(config).toMatch(/highlight\.js/);
    expect(config).toMatch(/pdfjs-dist/);
    expect(config).toMatch(/chunkSizeWarningLimit:\s*1500/);
  });

  it("copies the PDF worker from react-pdf's pinned pdfjs-dist version", () => {
    const config = fs.readFileSync(viteConfigPath, 'utf8');

    expect(config).toContain(
      "const PDF_WORKER_COPY_SOURCE = 'node_modules/react-pdf/node_modules/pdfjs-dist/build/pdf.worker.min.mjs'",
    );
    expect(config).toContain('src: PDF_WORKER_COPY_SOURCE');
    expect(config).not.toContain("src: 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs'");
  });

  it('keeps the service worker precache focused on the app shell instead of eager heavy feature payloads', () => {
    const config = fs.readFileSync(viteConfigPath, 'utf8');

    expect(config).toMatch(/globIgnores:\s*\[[\s\S]*pyodide/i);
  });

  it('keeps html export code behind a runtime import instead of a forced vendor chunk', () => {
    const source = fs.readFileSync(htmlExportPath, 'utf8');

    expect(source).toContain("await import('html2pdf.js')");
  });
});

describe('Runtime loading boundaries', () => {
  it('loads both base markdown and math markdown renderers lazily', () => {
    const lazyMarkdownSource = fs.readFileSync(lazyMarkdownRendererPath, 'utf8');
    const createFilePdfExportSurfaceSource = fs.readFileSync(createFilePdfExportSurfacePath, 'utf8');

    expect(fs.existsSync(baseMarkdownRendererEntryPath)).toBe(true);
    expect(lazyMarkdownSource).toContain("import('./BaseMarkdownRendererEntry')");
    expect(lazyMarkdownSource).toContain("import('./MarkdownRenderer')");
    expect(createFilePdfExportSurfaceSource).toContain(
      "import { MarkdownRenderer } from '../../message/MarkdownRenderer'",
    );
  });

  it('moves KaTeX and PDF viewer CSS ownership out of the global app entry', () => {
    const indexSource = fs.readFileSync(indexEntryPath, 'utf8');
    const markdownRendererSource = fs.readFileSync(markdownRendererPath, 'utf8');

    expect(indexSource).not.toContain("import 'katex/dist/katex.min.css'");
    expect(indexSource).not.toContain("import 'react-pdf/dist/Page/AnnotationLayer.css'");
    expect(indexSource).not.toContain("import 'react-pdf/dist/Page/TextLayer.css'");
    expect(markdownRendererSource).toContain("import 'katex/dist/katex.min.css'");
  });

  it('removes static pyodide service imports from the main chat path', () => {
    const useChatSource = fs.readFileSync(useChatPath, 'utf8');
    const useStandardChatSource = fs.readFileSync(useStandardChatPath, 'utf8');
    const useStandardChatApiCallSource = fs.readFileSync(useStandardChatApiCallPath, 'utf8');
    const usePyodideSource = fs.readFileSync(usePyodidePath, 'utf8');

    expect(fs.existsSync(pyodideLoaderPath)).toBe(true);
    expect(useChatSource).not.toContain("from '../../services/pyodideService'");
    expect(useStandardChatSource).not.toContain("from '../../services/pyodideService'");
    expect(useStandardChatApiCallSource).not.toContain("from '../../services/pyodideService'");
    expect(usePyodideSource).not.toContain("from '../services/pyodideService'");
    expect(useChatSource).toContain("from '../../services/loadPyodideService'");
    expect(useStandardChatApiCallSource).toContain("from '../../services/loadPyodideService'");
    expect(usePyodideSource).toContain("from '../services/loadPyodideService'");
  });

  it('keeps runtime tool declarations free of direct @google/genai imports', () => {
    const standardClientFunctionsSource = fs.readFileSync(standardClientFunctionsPath, 'utf8');
    const liveClientFunctionsSource = fs.readFileSync(liveClientFunctionsPath, 'utf8');

    expect(standardClientFunctionsSource).not.toContain('@google/genai');
    expect(liveClientFunctionsSource).not.toContain('@google/genai');
  });

  it('keeps TTS voice options on a single static import path to avoid mixed-import build warnings', () => {
    const ttsVoiceSelectorSource = fs.readFileSync(ttsVoiceSelectorPath, 'utf8');

    expect(ttsVoiceSelectorSource).toContain("from '../../../../constants/voiceOptions'");
    expect(ttsVoiceSelectorSource).not.toContain("import('../../../../constants/voiceOptions')");
  });
});
