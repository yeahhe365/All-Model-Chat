import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../contexts/I18nContext', () => ({
  useI18n: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

import { SendControls } from './SendControls';

describe('SendControls', () => {
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
  });

  it('renders the main send button with a more compact size than the shared input controls', () => {
    act(() => {
      root.render(
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

    const submitButton = container.querySelector('button[type="submit"]');

    expect(submitButton).not.toBeNull();
    expect(submitButton?.className).toContain('!h-9');
    expect(submitButton?.className).toContain('!w-9');
  });
});
