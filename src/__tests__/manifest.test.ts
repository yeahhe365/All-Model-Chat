import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

const projectRoot = path.resolve(__dirname, '../..');
const manifestPath = path.join(projectRoot, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as {
  start_url: string;
  scope?: string;
  icons: Array<{ src: string; purpose?: string }>;
};

describe('web manifest', () => {
  it('uses a root-scoped start URL for installed launches', () => {
    expect(manifest.start_url).toBe('/');
    expect(manifest.scope).toBe('/');
  });

  it('references real static icon assets instead of inline data URIs', () => {
    expect(manifest.icons.length).toBeGreaterThanOrEqual(3);

    for (const icon of manifest.icons) {
      expect(icon.src.startsWith('data:')).toBe(false);
      expect(icon.src.endsWith('.png')).toBe(true);
      expect(fs.existsSync(path.join(projectRoot, 'public', icon.src.replace(/^\//, '')))).toBe(true);
    }

    expect(manifest.icons.some((icon) => icon.purpose?.includes('maskable'))).toBe(true);
  });
});
