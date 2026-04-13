import type { AppViewModel } from '../../hooks/app/useApp';
import type { AppSettings, ChatSettings, SideViewContent } from '../../types';
import { DEFAULT_CHAT_SETTINGS } from '../../constants/appConstants';
import {
  isBboxSystemInstruction,
  isCanvasSystemInstruction,
  isHdGuideSystemInstruction,
} from '../../constants/promptHelpers';
import { getShortcutDisplay } from '../../utils/shortcutUtils';
import type { AppModalsProps } from '../modals/AppModals';
import type { HistorySidebarProps } from '../sidebar/HistorySidebar';
import type { ChatAreaProps } from './ChatArea';

type ChatAreaModel = ChatAreaProps['chatArea'];

export type MainContentChatAreaHeaderActions = Pick<
  ChatAreaModel['header'],
  | 'onNewChat'
  | 'onOpenSettingsModal'
  | 'onOpenScenariosModal'
  | 'onToggleHistorySidebar'
  | 'onLoadCanvasPrompt'
  | 'onSelectModel'
  | 'onSetThinkingLevel'
  | 'onTogglePip'
>;

export type MainContentChatAreaShellHandlers = Pick<
  ChatAreaModel['shell'],
  'handleAppDragEnter' | 'handleAppDragOver' | 'handleAppDragLeave' | 'handleAppDrop'
>;

interface BuildHistorySidebarPropsArgs {
  appSettings: AppSettings;
  isOpen: boolean;
  onToggle: () => void;
  sessions: HistorySidebarProps['sessions'];
  groups: HistorySidebarProps['groups'];
  activeSessionId: string | null;
  loadingSessionIds: HistorySidebarProps['loadingSessionIds'];
  generatingTitleSessionIds: HistorySidebarProps['generatingTitleSessionIds'];
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: HistorySidebarProps['onDeleteSession'];
  onRenameSession: HistorySidebarProps['onRenameSession'];
  onTogglePinSession: HistorySidebarProps['onTogglePinSession'];
  onDuplicateSession: HistorySidebarProps['onDuplicateSession'];
  onOpenExportModal: () => void;
  onAddNewGroup: HistorySidebarProps['onAddNewGroup'];
  onDeleteGroup: HistorySidebarProps['onDeleteGroup'];
  onRenameGroup: HistorySidebarProps['onRenameGroup'];
  onMoveSessionToGroup: HistorySidebarProps['onMoveSessionToGroup'];
  onToggleGroupExpansion: HistorySidebarProps['onToggleGroupExpansion'];
  onOpenSettingsModal: () => void;
  onOpenScenariosModal: () => void;
  t: HistorySidebarProps['t'];
  themeId: string;
  language: HistorySidebarProps['language'];
}

export const buildHistorySidebarProps = ({
  appSettings,
  isOpen,
  onToggle,
  sessions,
  groups,
  activeSessionId,
  loadingSessionIds,
  generatingTitleSessionIds,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  onRenameSession,
  onTogglePinSession,
  onDuplicateSession,
  onOpenExportModal,
  onAddNewGroup,
  onDeleteGroup,
  onRenameGroup,
  onMoveSessionToGroup,
  onToggleGroupExpansion,
  onOpenSettingsModal,
  onOpenScenariosModal,
  t,
  themeId,
  language,
}: BuildHistorySidebarPropsArgs): HistorySidebarProps => ({
  isOpen,
  onToggle,
  sessions,
  groups,
  activeSessionId,
  loadingSessionIds,
  generatingTitleSessionIds,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  onRenameSession,
  onTogglePinSession,
  onDuplicateSession,
  onOpenExportModal,
  onAddNewGroup,
  onDeleteGroup,
  onRenameGroup,
  onMoveSessionToGroup,
  onToggleGroupExpansion,
  onOpenSettingsModal,
  onOpenScenariosModal,
  t,
  themeId,
  language,
  newChatShortcut: getShortcutDisplay('general.newChat', appSettings),
});

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

export const buildAppModalsProps = (props: AppModalsProps): AppModalsProps => props;

interface BuildChatAreaModelArgs {
  appSettings: AppSettings;
  sessionTitle: string;
  currentModelName: string;
  t: AppViewModel['t'];
  activeSessionId: string | null;
  currentChatSettings: ChatAreaModel['session']['currentChatSettings'];
  messages: ChatAreaModel['session']['messages'];
  isLoading: boolean;
  isEditing: boolean;
  isAppDraggingOver: boolean;
  availableModels: ChatAreaModel['header']['availableModels'];
  isPipSupported: boolean;
  isPipActive: boolean;
  headerActions: MainContentChatAreaHeaderActions;
  shellHandlers: MainContentChatAreaShellHandlers;
  messageActions: ChatAreaModel['messageActions'];
  inputActions: ChatAreaModel['inputActions'];
}

export const buildChatAreaModel = ({
  appSettings,
  sessionTitle,
  currentModelName,
  t,
  activeSessionId,
  currentChatSettings,
  messages,
  isLoading,
  isEditing,
  isAppDraggingOver,
  availableModels,
  isPipSupported,
  isPipActive,
  headerActions,
  shellHandlers,
  messageActions,
  inputActions,
}: BuildChatAreaModelArgs): ChatAreaModel => ({
  session: {
    activeSessionId,
    sessionTitle,
    currentChatSettings,
    messages,
    isLoading,
    isEditing,
    showThoughts: currentChatSettings.showThoughts,
  },
  shell: {
    isAppDraggingOver,
    modelsLoadingError: null,
    ...shellHandlers,
    t,
  },
  header: {
    currentModelName,
    availableModels,
    selectedModelId: currentChatSettings.modelId || appSettings.modelId,
    isCanvasPromptActive: isCanvasSystemInstruction(currentChatSettings.systemInstruction),
    isKeyLocked: !!currentChatSettings.lockedApiKey,
    isPipSupported: isPipSupported && appSettings.useCustomApiConfig,
    isPipActive,
    ...headerActions,
  },
  messageActions,
  inputActions,
  features: {
    isImageEditModel: currentChatSettings.modelId?.includes('image-preview'),
    isBBoxModeActive: isBboxSystemInstruction(currentChatSettings.systemInstruction),
    isGuideModeActive: isHdGuideSystemInstruction(currentChatSettings.systemInstruction),
    generateQuadImages: appSettings.generateQuadImages ?? false,
    isGoogleSearchEnabled: !!currentChatSettings.isGoogleSearchEnabled,
    isCodeExecutionEnabled: !!currentChatSettings.isCodeExecutionEnabled,
    isLocalPythonEnabled: !!currentChatSettings.isLocalPythonEnabled,
    isUrlContextEnabled: !!currentChatSettings.isUrlContextEnabled,
    isDeepSearchEnabled: !!currentChatSettings.isDeepSearchEnabled,
  },
});

export const buildSidePanelKey = (content: SideViewContent | null) =>
  content ? `${content.type}:${content.title}:${content.content.slice(0, 64)}` : 'side-panel-empty';
