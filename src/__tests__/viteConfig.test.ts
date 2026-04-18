import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

const projectRoot = path.resolve(__dirname, '../..');
const viteConfigPath = path.join(projectRoot, 'vite.config.ts');
const baseMarkdownRendererPath = path.join(projectRoot, 'src/components/message/BaseMarkdownRenderer.tsx');
const lazyMarkdownRendererPath = path.join(projectRoot, 'src/components/message/LazyMarkdownRenderer.tsx');
const markdownRendererLitePath = path.join(projectRoot, 'src/components/message/MarkdownRendererLite.tsx');
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

  it('keeps html export code behind a runtime import instead of a forced vendor chunk', () => {
    const source = fs.readFileSync(htmlExportPath, 'utf8');

    expect(source).toContain("await import('html2pdf.js')");
  });
});

describe('BaseMarkdownRenderer lazy diagram boundaries', () => {
  it('keeps MermaidBlock and GraphvizBlock behind deferred dynamic imports', () => {
    const source = fs.readFileSync(baseMarkdownRendererPath, 'utf8');

    expect(source).toContain("import { DeferredDiagramBlock } from './blocks/DeferredDiagramBlock'");
    expect(source).toMatch(/const loadMermaidBlock = async \(\) => \{\s*const module = await import\('\.\/blocks\/MermaidBlock'\)/s);
    expect(source).toMatch(
      /const loadGraphvizBlock = async \(\) => \{\s*const module = await import\('\.\/blocks\/GraphvizBlock'\)/s,
    );
    expect(source).toContain('<DeferredDiagramBlock');
  });

  it('routes non-math rendering without the dedicated lite wrapper while keeping the full renderer entry point', () => {
    const lazyMarkdownSource = fs.readFileSync(lazyMarkdownRendererPath, 'utf8');
    const createFilePdfExportSurfaceSource = fs.readFileSync(createFilePdfExportSurfacePath, 'utf8');

    expect(fs.existsSync(markdownRendererLitePath)).toBe(false);
    expect(lazyMarkdownSource).not.toContain("import('./MarkdownRendererLite')");
    expect(lazyMarkdownSource).not.toContain('MarkdownRendererLite');
    expect(createFilePdfExportSurfaceSource).toContain("import { MarkdownRenderer } from '../../message/MarkdownRenderer'");
  });
});
