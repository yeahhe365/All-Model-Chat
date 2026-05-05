import { act } from 'react';
import { setupTestRenderer } from '@/test/testUtils';
import { describe, expect, it, vi } from 'vitest';
import { LiveStatusBanner } from './LiveStatusBanner';

vi.mock('../../../contexts/I18nContext', async () => {
  const { createRealI18nMockModule } = await import('../../../test/moduleMockDoubles');

  return createRealI18nMockModule('en');
});

describe('LiveStatusBanner', () => {
  const renderer = setupTestRenderer();
  const renderBanner = (props: React.ComponentProps<typeof LiveStatusBanner>) => {
    act(() => {
      renderer.render(<LiveStatusBanner {...props} />);
    });

    return renderer.container;
  };

  it('shows a reconnecting status instead of an error banner while the session refreshes', () => {
    const onDisconnect = vi.fn();
    const container = renderBanner({
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
  });
});
