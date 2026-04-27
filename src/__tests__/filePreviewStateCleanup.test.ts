import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

const projectRoot = path.resolve(__dirname, '../..');

const readProjectFile = (relativePath: string) => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');

describe('file preview state cleanup guards', () => {
  it('keeps copy state local to FilePreviewHeader', () => {
    const source = readProjectFile('src/components/shared/file-preview/FilePreviewHeader.tsx');

    expect(source).not.toContain('onCopy?: () => void;');
    expect(source).not.toContain('isCopied?: boolean;');
    expect(source).not.toContain('externalIsCopied');
  });

  it('does not mirror controlled content into TextFileViewer local state', () => {
    const source = readProjectFile('src/components/shared/file-preview/TextFileViewer.tsx');

    expect(source).not.toContain('setLocalContent(content);');
  });

  it('does not reset file-derived preview state with an effect in FilePreviewModal', () => {
    const source = readProjectFile('src/components/modals/FilePreviewModal.tsx');

    expect(source).not.toMatch(/useEffect\(\(\) => \{\s*if \(file\) \{\s*setIsEditing\(initialEditMode\);/s);
    expect(source).not.toContain('const [isCopied, setIsCopied] = useState(false);');
  });
});
