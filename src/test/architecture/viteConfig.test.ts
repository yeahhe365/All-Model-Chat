import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

const projectRoot = path.resolve(__dirname, '../../..');
const viteConfigPath = path.join(projectRoot, 'vite.config.ts');
const viteChunksPath = path.join(projectRoot, 'vite/chunks.ts');
const viteStaticAssetsPath = path.join(projectRoot, 'vite/staticAssets.ts');
const lazyMarkdownRendererPath = path.join(projectRoot, 'src/components/message/LazyMarkdownRenderer.tsx');
const markdownRendererPath = path.join(projectRoot, 'src/components/message/MarkdownRenderer.tsx');
const baseMarkdownRendererEntryPath = path.join(projectRoot, 'src/components/message/BaseMarkdownRendererEntry.tsx');
const indexEntryPath = path.join(projectRoot, 'src/index.tsx');
const useChatPath = path.join(projectRoot, 'src/hooks/chat/useChat.ts');
const standardChatStrategyPath = path.join(projectRoot, 'src/features/message-sender/standardChatStrategy.ts');
const standardChatApiCallPath = path.join(projectRoot, 'src/features/message-sender/standardChatApiCall.ts');
const usePyodidePath = path.join(projectRoot, 'src/features/local-python/usePyodide.ts');
const pyodideLoaderPath = path.join(projectRoot, 'src/features/local-python/loadPyodideService.ts');
const standardClientFunctionsPath = path.join(projectRoot, 'src/features/standard-chat/standardClientFunctions.ts');
const liveClientFunctionsPath = path.join(projectRoot, 'src/hooks/live-api/liveClientFunctions.ts');
const ttsVoiceSelectorPath = path.join(projectRoot, 'src/components/chat/input/toolbar/TtsVoiceSelector.tsx');
const markdownPdfExportPath = path.join(projectRoot, 'src/utils/export/markdownPdf.ts');
const interfaceTogglesPath = path.join(projectRoot, 'src/components/settings/sections/appearance/InterfaceToggles.tsx');

describe('vite.config runtime ownership', () => {
  it('does not externalize core runtime libraries needed in the Vite bundle', () => {
    const config = fs.readFileSync(viteConfigPath, 'utf8');

    expect(config).not.toMatch(/external\s*:\s*\[/);
  });

  it('splits heavy runtime libraries into dedicated lazy chunks', () => {
    const config = fs.readFileSync(viteConfigPath, 'utf8');
    const chunks = fs.readFileSync(viteChunksPath, 'utf8');

    expect(chunks).toContain("'pdfjs-vendor'");
    expect(chunks).toContain("'highlight-vendor'");
    expect(chunks).toContain("'graphviz-vendor'");
    expect(chunks).not.toContain("'html-export-vendor'");
    expect(chunks).not.toContain("'mermaid-vendor'");
    expect(chunks).toMatch(/highlight\.js/);
    expect(chunks).toMatch(/pdfjs-dist/);
    expect(config).toMatch(/chunkSizeWarningLimit:\s*1500/);
  });

  it("copies the PDF worker from react-pdf's pinned pdfjs-dist version", () => {
    const config = fs.readFileSync(viteConfigPath, 'utf8');
    const staticAssets = fs.readFileSync(viteStaticAssetsPath, 'utf8');

    expect(staticAssets).toContain(
      "const PDF_WORKER_COPY_SOURCE = 'node_modules/react-pdf/node_modules/pdfjs-dist/build/pdf.worker.min.mjs'",
    );
    expect(config).toContain('src: PDF_WORKER_COPY_SOURCE');
    expect(staticAssets).not.toContain("src: 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs'");
  });

  it('copies the lamejs encoder asset used by the audio compression worker', () => {
    const config = fs.readFileSync(viteConfigPath, 'utf8');
    const staticAssets = fs.readFileSync(viteStaticAssetsPath, 'utf8');
    const packageJson = fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8');

    expect(packageJson).toContain('"lamejs"');
    expect(staticAssets).toContain("const LAMEJS_WORKER_COPY_SOURCE = 'node_modules/lamejs/lame.min.js'");
    expect(config).toContain('src: LAMEJS_WORKER_COPY_SOURCE');
  });

  it('keeps system-audio recording out of global settings', () => {
    const source = fs.readFileSync(interfaceTogglesPath, 'utf8');

    expect(source).not.toContain('isSystemAudioRecordingEnabled');
    expect(source).not.toContain('settings_systemAudioRecording_label');
  });

  it('keeps the service worker precache focused on the app shell instead of eager heavy feature payloads', () => {
    const config = fs.readFileSync(viteConfigPath, 'utf8');

    expect(config).toMatch(/globIgnores:\s*\[[\s\S]*pyodide/i);
    expect(config).toContain("'**/fonts/NotoSansCJKsc-VF.ttf.part-*'");
  });

  it('keeps Markdown PDF export off the html2canvas/html2pdf screenshot path', () => {
    const source = fs.readFileSync(markdownPdfExportPath, 'utf8');

    expect(source).toContain("from 'jspdf'");
    expect(source).not.toContain('html2canvas');
    expect(source).not.toContain('html2pdf');
  });
});

describe('Runtime loading boundaries', () => {
  it('loads both base markdown and math markdown renderers lazily', () => {
    const lazyMarkdownSource = fs.readFileSync(lazyMarkdownRendererPath, 'utf8');

    expect(fs.existsSync(baseMarkdownRendererEntryPath)).toBe(true);
    expect(lazyMarkdownSource).toContain("import('./BaseMarkdownRendererEntry')");
    expect(lazyMarkdownSource).toContain("import('./MarkdownRenderer')");
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
    const standardChatStrategySource = fs.readFileSync(standardChatStrategyPath, 'utf8');
    const standardChatApiCallSource = fs.readFileSync(standardChatApiCallPath, 'utf8');
    const usePyodideSource = fs.readFileSync(usePyodidePath, 'utf8');

    expect(fs.existsSync(pyodideLoaderPath)).toBe(true);
    expect(useChatSource).not.toContain("from '@/features/local-python/pyodideService'");
    expect(standardChatStrategySource).not.toContain("from '@/features/local-python/pyodideService'");
    expect(standardChatApiCallSource).not.toContain("from '@/features/local-python/pyodideService'");
    expect(usePyodideSource).not.toContain("from '@/features/local-python/pyodideService'");
    expect(useChatSource).toContain("from '@/features/local-python/loadPyodideService'");
    expect(standardChatApiCallSource).toContain("from '@/features/local-python/loadPyodideService'");
    expect(usePyodideSource).toContain("from './loadPyodideService'");
  });

  it('keeps runtime tool declarations free of direct @google/genai imports', () => {
    const standardClientFunctionsSource = fs.readFileSync(standardClientFunctionsPath, 'utf8');
    const liveClientFunctionsSource = fs.readFileSync(liveClientFunctionsPath, 'utf8');

    expect(standardClientFunctionsSource).not.toContain('@google/genai');
    expect(liveClientFunctionsSource).not.toContain('@google/genai');
  });

  it('keeps TTS voice options on a single static import path to avoid mixed-import build warnings', () => {
    const ttsVoiceSelectorSource = fs.readFileSync(ttsVoiceSelectorPath, 'utf8');

    expect(ttsVoiceSelectorSource).toContain("from '@/constants/voiceOptions'");
    expect(ttsVoiceSelectorSource).not.toContain("import('@/constants/voiceOptions')");
  });
});
