import { act } from 'react';
import { createTestRenderer, type TestRenderer } from '@/test/testUtils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { WindowProvider } from '../../contexts/WindowContext';
import { TextEditorModalShell } from './TextEditorModalShell';

const projectRoot = path.resolve(__dirname, '../../..');
const textEditorModalPath = path.join(projectRoot, 'src/components/modals/TextEditorModal.tsx');
const createTextFileEditorPath = path.join(projectRoot, 'src/components/modals/CreateTextFileEditor.tsx');

describe('TextEditorModalShell', () => {
  let root: TestRenderer;

  beforeEach(() => {
    root = createTestRenderer();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    vi.clearAllMocks();
  });

  it('renders shared header, body, and footer slots inside the modal surface', () => {
    act(() => {
      root.render(
        <WindowProvider>
          <TextEditorModalShell
            onClose={vi.fn()}
            contentClassName="max-w-xl"
            header={<div>Shared Header</div>}
            body={<div>Shared Body</div>}
            footer={<button type="button">Shared Footer</button>}
          />
        </WindowProvider>,
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
