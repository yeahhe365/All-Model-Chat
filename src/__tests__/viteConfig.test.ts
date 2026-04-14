import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

const projectRoot = path.resolve(__dirname, '../..');
const viteConfigPath = path.join(projectRoot, 'vite.config.ts');
const baseMarkdownRendererPath = path.join(projectRoot, 'src/components/message/BaseMarkdownRenderer.tsx');

describe('vite.config runtime ownership', () => {
  it('does not externalize core runtime libraries needed in the Vite bundle', () => {
    const config = fs.readFileSync(viteConfigPath, 'utf8');

    expect(config).not.toMatch(/external\s*:\s*\[/);
  });

  it('splits heavy runtime libraries into dedicated lazy chunks', () => {
    const config = fs.readFileSync(viteConfigPath, 'utf8');

    expect(config).toContain("'pdfjs-vendor'");
    expect(config).toContain("'html-export-vendor'");
    expect(config).toContain("'highlight-vendor'");
    expect(config).toContain("'mermaid-vendor'");
    expect(config).toMatch(/html2canvas/);
    expect(config).toMatch(/html2pdf\.js/);
    expect(config).toMatch(/highlight\.js/);
    expect(config).toMatch(/pdfjs-dist/);
    expect(config).toMatch(/mermaid/);
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
});
