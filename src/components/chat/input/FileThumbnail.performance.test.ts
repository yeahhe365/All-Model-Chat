import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

const projectRoot = path.resolve(__dirname, '../../../..');
const fileThumbnailPath = path.join(projectRoot, 'src/components/chat/input/FileThumbnail.tsx');

describe('FileThumbnail performance boundaries', () => {
  it('keeps react-pdf out of the eager upload-card thumbnail bundle', () => {
    const source = fs.readFileSync(fileThumbnailPath, 'utf8');

    expect(source).not.toContain("from 'react-pdf'");
    expect(source).toMatch(/lazy\(\(\)\s*=>\s*import\('\.\/PdfFileThumbnail'\)/);
  });
});
