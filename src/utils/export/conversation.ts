import React from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import type { AppSettings, SavedChatSession, SideViewContent, UploadedFile } from '../../types';
import { DEFAULT_APP_SETTINGS } from '../../constants/appConstants';
import { I18nProvider } from '../../contexts/I18nContext';
import { MessageContent } from '../../components/message/MessageContent';
import { getVisibleChatMessages } from '../chat/visibility';

const noop = () => { };

const normalizeThemeId = (themeId: string): AppSettings['themeId'] =>
  themeId === 'system' || themeId === 'onyx' || themeId === 'pearl'
    ? themeId
    : DEFAULT_APP_SETTINGS.themeId;

const createExportAppSettings = (session: SavedChatSession, themeId: string): AppSettings => ({
  ...DEFAULT_APP_SETTINGS,
  ...session.settings,
  themeId: normalizeThemeId(themeId),
});

export const createChatExportElement = async (
  session: SavedChatSession,
  themeId: string,
): Promise<{ element: HTMLElement; cleanup: () => void }> => {
  const host = document.createElement('div');
  host.style.position = 'absolute';
  host.style.left = '-9999px';
  host.style.top = '0';
  host.style.width = '800px';
  host.className = `theme-${themeId}`;
  document.body.appendChild(host);

  const root = createRoot(host);
  const appSettings = createExportAppSettings(session, themeId);
  const appThemeId = appSettings.themeId;
  const visibleMessages = getVisibleChatMessages(session.messages);

  flushSync(() => {
    root.render(
      React.createElement(
        I18nProvider,
        null,
        React.createElement(
          'div',
          {
            className: 'export-chat-transcript',
            style: { display: 'flex', flexDirection: 'column', gap: '1.25rem' },
          },
          visibleMessages.map((message) =>
            React.createElement(
              'article',
              {
                key: message.id,
                'data-message-id': message.id,
                'data-message-role': message.role,
                style: {
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: message.role === 'user' ? 'flex-end' : 'flex-start',
                  breakInside: 'avoid',
                },
              },
              React.createElement(
                'div',
                {
                  className: 'message-content-container',
                  style: {
                    maxWidth: '100%',
                    color: message.role === 'user'
                      ? 'var(--theme-bg-user-message-text)'
                      : 'var(--theme-text-primary)',
                    background: message.role === 'user'
                      ? 'var(--theme-bg-user-message)'
                      : 'transparent',
                    borderRadius: message.role === 'user' ? '1rem 0.25rem 1rem 1rem' : '0',
                    padding: message.role === 'user' ? '0.75rem 1rem' : '0',
                  },
                },
                React.createElement(MessageContent, {
                  message,
                  onImageClick: noop,
                  onOpenHtmlPreview: noop,
                  showThoughts: appSettings.showThoughts,
                  baseFontSize: appSettings.baseFontSize,
                  expandCodeBlocksByDefault: appSettings.expandCodeBlocksByDefault,
                  isMermaidRenderingEnabled: appSettings.isMermaidRenderingEnabled,
                  isGraphvizRenderingEnabled: appSettings.isGraphvizRenderingEnabled ?? true,
                  onSuggestionClick: noop,
                  appSettings,
                  themeId: appThemeId,
                  onOpenSidePanel: noop as (content: SideViewContent) => void,
                  onConfigureFile: noop as (file: UploadedFile, messageId: string) => void,
                  isGemini3: false,
                }),
              ),
            ),
          ),
        ),
      ),
    );
  });

  // Allow lazy markdown renderers and image layout to settle before cloning.
  await new Promise((resolve) => window.setTimeout(resolve, 100));

  const element = host.querySelector('.export-chat-transcript') as HTMLElement | null;
  if (!element) {
    root.unmount();
    document.body.removeChild(host);
    throw new Error('Failed to render chat export content.');
  }

  return {
    element,
    cleanup: () => {
      root.unmount();
      if (document.body.contains(host)) {
        document.body.removeChild(host);
      }
    },
  };
};
