import { act } from 'react';
import { setupProviderTestRenderer as setupTestRenderer } from '@/test/providerTestUtils';
import { describe, expect, it, vi } from 'vitest';
import { setupStoreStateReset } from '../../../test/storeTestUtils';

vi.mock('../../../services/logService', async () => {
  const { createLogServiceMockModule } = await import('../../../test/moduleMockDoubles');

  return createLogServiceMockModule();
});

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
  const renderer = setupTestRenderer({ providers: { language: 'en' } });
  setupStoreStateReset();

  it('shows only image-relevant actions for Gemini image models', () => {
    act(() => {
      renderer.root.render(<AttachmentMenu onAction={() => {}} disabled={false} isImageModel />);
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
