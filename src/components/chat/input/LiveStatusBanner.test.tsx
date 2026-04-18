import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LiveStatusBanner } from './LiveStatusBanner';
import { getTranslator } from '../../../utils/translations';

vi.mock('../../../contexts/I18nContext', () => ({
  useI18n: () => ({
    language: 'en',
    t: getTranslator('en'),
  }),
}));

const renderBanner = (props: React.ComponentProps<typeof LiveStatusBanner>) => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(<LiveStatusBanner {...props} />);
  });

  return {
    container,
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

describe('LiveStatusBanner', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

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
