import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

const projectRoot = path.resolve(__dirname, '../..');
const publicRoot = path.join(projectRoot, 'public');
const CLOUDFLARE_PAGES_FILE_LIMIT_BYTES = 25 * 1024 * 1024;

const collectFiles = (directory: string): string[] =>
  fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? collectFiles(entryPath) : [entryPath];
  });

describe('Cloudflare Pages static assets', () => {
  it('keeps public assets within the per-file upload limit', () => {
    const oversizedFiles = collectFiles(publicRoot)
      .map((filePath) => ({
        relativePath: path.relative(publicRoot, filePath),
        size: fs.statSync(filePath).size,
      }))
      .filter(({ size }) => size > CLOUDFLARE_PAGES_FILE_LIMIT_BYTES);

    expect(oversizedFiles).toEqual([]);
  });
});
