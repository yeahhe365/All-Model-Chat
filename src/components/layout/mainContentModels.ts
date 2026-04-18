import type { AppSettings, ChatSettings, SideViewContent } from '../../types';
import { DEFAULT_CHAT_SETTINGS } from '../../constants/appConstants';
interface BuildSettingsForModalArgs {
  appSettings: AppSettings;
  activeSessionId: string | null;
  currentChatSettings?: ChatSettings;
}

export const buildSettingsForModal = ({
  appSettings,
  activeSessionId,
  currentChatSettings,
}: BuildSettingsForModalArgs): AppSettings => {
  if (!activeSessionId || !currentChatSettings) {
    return appSettings;
  }

  const sessionOverrides = Object.fromEntries(
    (Object.keys(DEFAULT_CHAT_SETTINGS) as Array<keyof ChatSettings>)
      .filter((key) => Object.prototype.hasOwnProperty.call(currentChatSettings, key))
      .map((key) => [key, currentChatSettings[key]]),
  ) as Partial<AppSettings>;

  return {
    ...appSettings,
    ...sessionOverrides,
  };
};

export const buildSidePanelKey = (content: SideViewContent | null) =>
  content ? `${content.type}:${content.title}:${content.content.slice(0, 64)}` : 'side-panel-empty';
