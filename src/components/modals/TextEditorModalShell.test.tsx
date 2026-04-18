import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { WindowProvider } from '../../contexts/WindowContext';
import { TextEditorModalShell } from './TextEditorModalShell';

const projectRoot = path.resolve(__dirname, '../../..');
const textEditorModalPath = path.join(projectRoot, 'src/components/modals/TextEditorModal.tsx');
const createTextFileEditorPath = path.join(projectRoot, 'src/components/modals/CreateTextFileEditor.tsx');

describe('TextEditorModalShell', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    document.body.innerHTML = '';
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
