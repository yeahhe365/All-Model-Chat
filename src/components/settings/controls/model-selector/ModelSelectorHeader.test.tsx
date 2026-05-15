import { act } from 'react';
import { setupProviderTestRenderer as setupTestRenderer } from '@/test/providerTestUtils';
import { describe, expect, it, vi } from 'vitest';
import { setupStoreStateReset } from '@/test/storeTestUtils';
import { ModelSelectorHeader } from './ModelSelectorHeader';

describe('ModelSelectorHeader', () => {
  const renderer = setupTestRenderer({ providers: { language: 'en' } });
  setupStoreStateReset();

  it('does not render a finish editing control while the model list editor is open', () => {
    act(() => {
      renderer.root.render(<ModelSelectorHeader isEditingList setIsEditingList={vi.fn()} />);
    });

    expect(renderer.container.textContent).toContain('Model Library');
    expect(renderer.container.textContent).not.toContain('Finish Editing');
  });
});
