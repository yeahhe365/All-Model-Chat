import { act } from 'react';
import { createTestRenderer, type TestRenderer } from '@/test/testUtils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { I18nProvider } from '../../../contexts/I18nContext';
import { useSettingsStore } from '../../../stores/settingsStore';

vi.mock('../../../services/logService', () => ({
  logService: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn(), recordTokenUsage: vi.fn() },
}));

vi.mock('../../../hooks/ui/usePortaledMenu', () => ({
  usePortaledMenu: () => ({
    isOpen: true,
    menuPosition: {},
    containerRef: { current: null },
    buttonRef: { current: null },
    menuRef: { current: null },
    targetWindow: window,
    closeMenu: vi.fn(),
    toggleMenu: vi.fn(),
  }),
}));

import { AttachmentMenu } from './AttachmentMenu';

describe('AttachmentMenu', () => {
  let root: TestRenderer;

  beforeEach(() => {
    useSettingsStore.setState({ language: 'en' });
    root = createTestRenderer();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
  });

  it('shows only image-relevant actions for Gemini image models', () => {
    act(() => {
      root.render(
        <I18nProvider>
          <AttachmentMenu onAction={() => {}} disabled={false} isImageModel />
        </I18nProvider>,
      );
    });

    expect(document.body.textContent).toContain('Upload from Device');
    expect(document.body.textContent).toContain('Gallery');
    expect(document.body.textContent).toContain('Take Photo');
    expect(document.body.textContent).toContain('Screenshot');
    expect(document.body.textContent).toContain('Add by File ID');

    expect(document.body.textContent).not.toContain('Import Folder (as Text)');
    expect(document.body.textContent).not.toContain('Import Zip (as Text)');
    expect(document.body.textContent).not.toContain('Record Audio');
    expect(document.body.textContent).not.toContain('Create Text File');
  });
});
