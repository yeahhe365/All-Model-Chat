import type { AppSettings, ChatSettings, SideViewContent } from '../../types';
import { DEFAULT_CHAT_SETTINGS } from '../../constants/appConstants';
export type SettingsScope = 'defaults' | 'currentChat';

interface BuildSettingsForModalArgs {
  appSettings: AppSettings;
  activeSessionId: string | null;
  currentChatSettings?: ChatSettings;
  scope?: SettingsScope;
}

export const buildSettingsForModal = ({
  appSettings,
  activeSessionId,
  currentChatSettings,
  scope = 'defaults',
}: BuildSettingsForModalArgs): AppSettings => {
  if (scope === 'defaults' || !activeSessionId || !currentChatSettings) {
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

const CHAT_SCOPED_KEYS = new Set<keyof ChatSettings>(
  Object.keys(DEFAULT_CHAT_SETTINGS) as Array<keyof ChatSettings>,
);

interface SplitScopedSettingsUpdateArgs {
  scope: SettingsScope;
  previousSettings: AppSettings;
  nextSettings: AppSettings;
  appSettings: AppSettings;
  currentChatSettings?: ChatSettings;
}

export const splitScopedSettingsUpdate = ({
  scope,
  previousSettings,
  nextSettings,
  appSettings,
  currentChatSettings,
}: SplitScopedSettingsUpdateArgs): {
  nextAppSettings?: AppSettings;
  nextChatSettings?: ChatSettings;
} => {
  let nextAppSettings = appSettings;
  let nextChatSettings = currentChatSettings;
  let hasAppChanges = false;
  let hasChatChanges = false;

  for (const key of Object.keys(nextSettings) as Array<keyof AppSettings>) {
    if (Object.is(previousSettings[key], nextSettings[key])) {
      continue;
    }

    if (scope === 'currentChat' && currentChatSettings && CHAT_SCOPED_KEYS.has(key as keyof ChatSettings)) {
      nextChatSettings = {
        ...nextChatSettings,
        [key]: nextSettings[key],
      } as ChatSettings;
      hasChatChanges = true;
      continue;
    }

    nextAppSettings = {
      ...nextAppSettings,
      [key]: nextSettings[key],
    };
    hasAppChanges = true;
  }

  return {
    nextAppSettings: hasAppChanges ? nextAppSettings : undefined,
    nextChatSettings: hasChatChanges ? nextChatSettings : undefined,
  };
};

export const buildSidePanelKey = (content: SideViewContent | null) =>
  content ? `${content.type}:${content.title}:${content.content.slice(0, 64)}` : 'side-panel-empty';
