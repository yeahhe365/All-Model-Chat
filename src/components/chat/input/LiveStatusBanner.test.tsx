import { act } from 'react';
import { createTestRenderer } from '@/test/testUtils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LiveStatusBanner } from './LiveStatusBanner';

vi.mock('../../../contexts/I18nContext', async () => {
  const { createRealI18nMock } = await import('../../../test/i18nTestDoubles');

  return createRealI18nMock('en');
});

const renderBanner = (props: React.ComponentProps<typeof LiveStatusBanner>) => {
  const root = createTestRenderer();
  const { container } = root;

  act(() => {
    root.render(<LiveStatusBanner {...props} />);
  });

  return {
    container,
    unmount: () => {
      act(() => {
        root.unmount();
      });
    },
  };
};

describe('LiveStatusBanner', () => {
  afterEach(() => {});

  it('shows a reconnecting status instead of an error banner while the session refreshes', () => {
    const onDisconnect = vi.fn();
    const { container, unmount } = renderBanner({
      isConnected: false,
      isSpeaking: false,
      isReconnecting: true,
      volume: 0,
      onDisconnect,
      error: 'Refreshing live session...',
    });

    expect(container.textContent).toContain('Refreshing live session...');
    expect(container.textContent).toContain('Reconnecting automatically');
    expect(container.textContent).toContain('End Call');

    unmount();
  });
});
