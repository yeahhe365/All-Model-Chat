import { act } from 'react';
import { setupProviderTestRenderer } from '@/test/providerTestUtils';
import { describe, expect, it, vi } from 'vitest';

import { SendControls } from './SendControls';

describe('SendControls', () => {
  const renderer = setupProviderTestRenderer({ providers: { language: 'en' } });

  it('renders the main send button with a more compact size than the shared input controls', () => {
    act(() => {
      renderer.root.render(
        <SendControls
          isLoading={false}
          isEditing={false}
          canSend
          isWaitingForUpload={false}
          onStopGenerating={vi.fn()}
          onCancelEdit={vi.fn()}
        />,
      );
    });

    const submitButton = renderer.container.querySelector('button[type="submit"]');

    expect(submitButton).not.toBeNull();
    expect(submitButton?.className).toContain('!h-9');
    expect(submitButton?.className).toContain('!w-9');
  });
});
