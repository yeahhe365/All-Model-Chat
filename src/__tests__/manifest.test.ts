import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

const projectRoot = path.resolve(__dirname, '../..');
const manifestPath = path.join(projectRoot, 'manifest.json');
const indexHtmlPath = path.join(projectRoot, 'index.html');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as {
  start_url: string;
  scope?: string;
  icons: Array<{ src: string; purpose?: string; type?: string }>;
};
const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');

describe('web manifest', () => {
  it('uses a root-scoped start URL for installed launches', () => {
    expect(manifest.start_url).toBe('/');
    expect(manifest.scope).toBe('/');
  });

  it('uses the shared legacy svg asset for browser and install icons', () => {
    expect(manifest.icons.length).toBeGreaterThanOrEqual(3);
    expect(indexHtml).toContain('rel="icon" id="favicon" href="/favicon.svg"');
    expect(indexHtml).toContain('rel="apple-touch-icon" id="apple-touch-icon" href="/favicon.svg"');
    expect(fs.existsSync(path.join(projectRoot, 'public', 'favicon.svg'))).toBe(true);

    for (const icon of manifest.icons) {
      expect(icon.src.startsWith('data:')).toBe(false);
      expect(icon.src).toBe('/favicon.svg');
      expect(icon.type).toBe('image/svg+xml');
      expect(fs.existsSync(path.join(projectRoot, 'public', icon.src.replace(/^\//, '')))).toBe(true);
    }

    expect(manifest.icons.some((icon) => icon.purpose?.includes('maskable'))).toBe(true);
  });
});
