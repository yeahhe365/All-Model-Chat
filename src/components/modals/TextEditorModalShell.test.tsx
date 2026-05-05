import { act } from 'react';
import { setupProviderTestRenderer as setupTestRenderer } from '@/test/providerTestUtils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { TextEditorModalShell } from './TextEditorModalShell';

const projectRoot = path.resolve(__dirname, '../../..');
const textEditorModalPath = path.join(projectRoot, 'src/components/modals/TextEditorModal.tsx');
const createTextFileEditorPath = path.join(projectRoot, 'src/components/modals/CreateTextFileEditor.tsx');

describe('TextEditorModalShell', () => {
  const renderer = setupTestRenderer({ providers: {} });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders shared header, body, and footer slots inside the modal surface', () => {
    act(() => {
      renderer.root.render(
        <TextEditorModalShell
          onClose={vi.fn()}
          contentClassName="max-w-xl"
          header={<div>Shared Header</div>}
          body={<div>Shared Body</div>}
          footer={<button type="button">Shared Footer</button>}
        />,
      );
    });

    expect(document.body).toHaveTextContent('Shared Header');
    expect(document.body).toHaveTextContent('Shared Body');
    expect(document.body).toHaveTextContent('Shared Footer');
    expect(document.querySelector('.max-w-xl')).not.toBeNull();
  });

  it('centralizes the modal shell for text editors', () => {
    const textEditorModalSource = fs.readFileSync(textEditorModalPath, 'utf8');
    const createTextFileEditorSource = fs.readFileSync(createTextFileEditorPath, 'utf8');

    expect(textEditorModalSource).toContain("from './TextEditorModalShell'");
    expect(createTextFileEditorSource).toContain("from './TextEditorModalShell'");
    expect(textEditorModalSource).toContain('<TextEditorModalShell');
    expect(createTextFileEditorSource).toContain('<TextEditorModalShell');
  });
});
