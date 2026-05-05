import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

const projectRoot = path.resolve(__dirname, '../..');

const readProjectFile = (relativePath: string) => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
const listProjectSourceFiles = (relativeDir: string): string[] => {
  const absoluteDir = path.join(projectRoot, relativeDir);
  return fs.readdirSync(absoluteDir, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(relativeDir, entry.name);
    if (entry.isDirectory()) {
      return listProjectSourceFiles(entryPath);
    }
    return /\.(ts|tsx)$/.test(entry.name) ? [entryPath] : [];
  });
};

describe('certain redundancy cleanup guards', () => {
  it('does not keep identity wrapper exports in mainContentModels', () => {
    const source = readProjectFile('src/components/layout/mainContentModels.ts');

    expect(source).not.toContain('export const buildAppModalsProps =');
    expect(source).not.toContain('export const buildChatAreaInputActions =');
  });

  it('does not keep pure barrel files for split utilities and APIs', () => {
    expect(fs.existsSync(path.join(projectRoot, 'src/utils/appUtils.ts'))).toBe(false);
    expect(fs.existsSync(path.join(projectRoot, 'src/services/api/baseApi.ts'))).toBe(false);
    expect(fs.existsSync(path.join(projectRoot, 'src/features/chat/input/index.ts'))).toBe(false);
  });

  it('inlines main content prop assembly and trims related interface surface', () => {
    const mainContentSource = readProjectFile('src/components/layout/MainContent.tsx');
    const mainContentViewModelSource = readProjectFile('src/components/layout/useMainContentViewModel.ts');
    const mainContentModelsSource = readProjectFile('src/components/layout/mainContentModels.ts');
    const settingsModalSource = readProjectFile('src/components/settings/SettingsModal.tsx');
    const chatAreaContextSource = readProjectFile('src/components/layout/chat-area/ChatAreaContext.tsx');
    const headerSource = readProjectFile('src/components/header/Header.tsx');
    const historySidebarSource = readProjectFile('src/components/sidebar/HistorySidebar.tsx');
    const apiConfigSource = readProjectFile('src/components/settings/sections/ApiConfigSection.tsx');
    const customIconsSource = readProjectFile('src/components/icons/CustomIcons.tsx');

    expect(mainContentSource).not.toContain('buildHistorySidebarProps(');
    expect(mainContentSource).not.toContain('buildChatAreaModel(');
    expect(mainContentSource).toContain('useMainContentViewModel');
    expect(settingsModalSource).toContain('buildSettingsForModal');
    expect(settingsModalSource).toContain('splitScopedSettingsUpdate');
    expect(mainContentViewModelSource).toContain('buildSidePanelKey');
    expect(mainContentModelsSource).not.toContain('export const buildHistorySidebarProps =');
    expect(mainContentModelsSource).not.toContain('export const buildChatAreaModel =');
    expect(chatAreaContextSource).not.toContain('isHistorySidebarOpen?: boolean;');
    expect(headerSource).not.toContain('currentModelName?: string;');
    expect(historySidebarSource).not.toContain('isOpen?: boolean;');
    expect(apiConfigSource).not.toContain('serverManagedApi?: boolean;');
    expect(apiConfigSource).not.toContain('setLiveApiEphemeralTokenEndpoint?:');
    expect(customIconsSource).not.toContain("export * from './iconUtils';");
  });

  it('keeps PiP availability independent from custom API config toggles', () => {
    const mainContentSource = readProjectFile('src/components/layout/MainContent.tsx');
    const mainContentViewModelSource = readProjectFile('src/components/layout/useMainContentViewModel.ts');

    expect(mainContentViewModelSource).toContain('isPipSupported: pipState.isPipSupported,');
    expect(mainContentSource).not.toContain('pipState.isPipSupported && appSettings.useCustomApiConfig');
    expect(mainContentViewModelSource).not.toContain('pipState.isPipSupported && appSettings.useCustomApiConfig');
  });

  it('keeps message-list scroll ownership local instead of routing scroll events back through chat state', () => {
    const chatScrollSource = readProjectFile('src/hooks/chat/useChatScroll.ts');
    const chatAreaContextSource = readProjectFile('src/components/layout/chat-area/ChatAreaContext.tsx');
    const chatAreaPropsSource = readProjectFile('src/components/layout/chat-area/ChatAreaProps.ts');
    const messageListSource = readProjectFile('src/components/chat/MessageList.tsx');

    expect(chatScrollSource).not.toContain('handleScroll =');
    expect(chatAreaContextSource).not.toContain('onScrollContainerScroll: () => void;');
    expect(chatAreaPropsSource).not.toContain('onScrollContainerScroll: () => void;');
    expect(messageListSource).not.toContain('onScrollContainerScroll');
  });

  it('routes preview and export plumbing through shared helpers', () => {
    const messageListUiSource = readProjectFile('src/hooks/useMessageListUI.ts');
    const chatInputFileSource = readProjectFile('src/hooks/chat-input/useChatInputFile.ts');
    const useAppSource = readProjectFile('src/hooks/app/useApp.ts');
    const useAppPromptModesSource = readProjectFile('src/hooks/app/useAppPromptModes.ts');
    const messageExportSource = readProjectFile('src/hooks/useMessageExport.ts');
    const chatSessionExportSource = readProjectFile('src/hooks/data-management/useChatSessionExport.ts');

    expect(messageListUiSource).toContain('useFileModalState');
    expect(chatInputFileSource).toContain('useChatInputFileUi');
    expect(useAppSource).toContain('useAppPromptModes');
    expect(useAppPromptModesSource).toContain('loadCanvasSystemPrompt');
    expect(messageExportSource).toContain("from '../utils/export/runtime'");
    expect(chatSessionExportSource).toContain("from '../../utils/export/runtime'");
  });

  it('reuses stripSessionFilePayloads for sanitizeSessionForExport', () => {
    const source = readProjectFile('src/utils/chat/session.ts');

    expect(source).toContain(
      'export const sanitizeSessionForExport = (session: SavedChatSession): SavedChatSession =>',
    );
    expect(source).toContain('stripSessionFilePayloads(session);');
  });

  it('avoids writing input text twice in the chat input change handler', () => {
    const source = readProjectFile('src/hooks/chat-input/useChatInput.ts');

    expect(source).not.toMatch(
      /slashCommandState\.handleInputChange\(event\.target\.value\);\s*setInputText\(event\.target\.value\);/s,
    );
  });

  it('keeps chat input orchestration delegated to focused hooks', () => {
    const source = readProjectFile('src/hooks/chat-input/useChatInput.ts');
    const submissionSource = readProjectFile('src/hooks/chat-input/useChatInputSubmission.ts');
    const chatInputComponentSource = readProjectFile('src/components/chat/input/ChatInput.tsx');
    const chatTextAreaSource = readProjectFile('src/components/chat/input/area/ChatTextArea.tsx');
    const chatAreaSource = readProjectFile('src/components/layout/chat-area/useChatArea.ts');

    expect(source).toContain('useChatInputCore');
    expect(source).toContain('useChatInputFile');
    expect(source).toContain('useChatInputSubmission');
    expect(submissionSource).toContain('useLiveModeHandler');
    expect(source).toContain('useChatInputClipboard');
    expect(source).toContain('useChatInputKeyboard');
    expect(source).not.toContain('isComposingRef.current =');
    expect(source.length).toBeLessThan(10000);
    expect(chatInputComponentSource).toContain("from '../../../hooks/chat-input/useChatInput'");
    expect(chatInputComponentSource).toContain("from '../../../hooks/chat-input/useChatInputState'");
    expect(chatTextAreaSource).toContain("from '../../../../hooks/chat-input/useChatInputState'");
    expect(chatAreaSource).toContain("from '../../../hooks/chat-input/useChatInputHeight'");
  });

  it('keeps chat store selectors close to their consumer instead of behind a bulk binding hook', () => {
    const chatHookSource = readProjectFile('src/hooks/chat/useChat.ts');

    expect(chatHookSource).toContain("from '../../stores/chatStore'");
    expect(chatHookSource).not.toContain('useChatStoreBindings');
    expect(fs.existsSync(path.join(projectRoot, 'src/hooks/chat/useChatStoreBindings.ts'))).toBe(false);
  });

  it('uses function APIs directly instead of the Gemini service wrapper', () => {
    const apiTypesSource = readProjectFile('src/types/api.ts');
    const sourceFiles = ['src/hooks', 'src/components', 'src/services'].flatMap(listProjectSourceFiles);

    expect(apiTypesSource).not.toContain('interface GeminiService');
    expect(fs.existsSync(path.join(projectRoot, 'src/services/geminiService.ts'))).toBe(false);

    for (const relativePath of sourceFiles) {
      const source = readProjectFile(relativePath);
      expect(source).not.toContain('geminiServiceInstance');
      expect(source).not.toContain('services/geminiService');
    }
  });

  it('keeps standard chat sender delegated to session, turn, and API helpers', () => {
    const source = readProjectFile('src/hooks/message-sender/useStandardChat.ts');

    expect(source).toContain('useStandardChatSession');
    expect(source).toContain('resolveStandardChatTurn');
    expect(source).toContain('useStandardChatApiCall');
    expect(source.length).toBeLessThan(21000);
  });

  it('keeps one-off media senders on the shared optimistic message pipeline', () => {
    for (const relativePath of [
      'src/hooks/message-sender/useTtsImagenSender.ts',
      'src/hooks/message-sender/useImageEditSender.ts',
    ]) {
      const source = readProjectFile(relativePath);

      expect(source).toContain('runOptimisticMessagePipeline');
      expect(source).not.toContain('performOptimisticSessionUpdate');
      expect(source).not.toContain('generateSessionTitle');
      expect(source).not.toContain('DEFAULT_CHAT_SETTINGS');
    }
  });

  it('keeps model generation settings behind a unified settings update interface', () => {
    const modelsSectionSource = readProjectFile('src/components/settings/sections/ModelsSection.tsx');
    const generationSectionSource = readProjectFile('src/components/settings/sections/GenerationSection.tsx');

    expect(generationSectionSource).toContain('currentSettings: AppSettings;');
    expect(generationSectionSource).toContain('onUpdateSetting: <K extends keyof AppSettings>');
    expect(modelsSectionSource).toContain('currentSettings={currentSettings}');
    expect(modelsSectionSource).toContain('onUpdateSetting={updateSetting}');

    for (const propName of [
      'setSystemInstruction',
      'setTemperature',
      'setTopP',
      'setTopK',
      'setThinkingBudget',
      'setThinkingLevel',
      'setShowThoughts',
      'setMediaResolution',
      'setTtsVoice',
      'setIsRawModeEnabled',
      'setHideThinkingInContext',
    ]) {
      expect(modelsSectionSource).not.toContain(`${propName}={`);
      expect(generationSectionSource).not.toContain(`${propName}:`);
    }
  });

  it('keeps model settings panels on the shared settings object contract', () => {
    const chatBehaviorSectionSource = readProjectFile('src/components/settings/sections/ChatBehaviorSection.tsx');
    const modelVoiceSettingsSource = readProjectFile('src/components/settings/ModelVoiceSettings.tsx');
    const modelsSectionSource = readProjectFile('src/components/settings/sections/ModelsSection.tsx');
    const languageVoiceSectionSource = readProjectFile('src/components/settings/sections/LanguageVoiceSection.tsx');
    const canvasSectionSource = readProjectFile('src/components/settings/sections/CanvasSection.tsx');

    for (const source of [
      chatBehaviorSectionSource,
      modelVoiceSettingsSource,
      languageVoiceSectionSource,
      canvasSectionSource,
    ]) {
      expect(source).toContain('currentSettings: AppSettings;');
      expect(source).toContain('onUpdateSetting: SettingsUpdateHandler;');
    }

    for (const source of [
      chatBehaviorSectionSource,
      modelVoiceSettingsSource,
      modelsSectionSource,
      languageVoiceSectionSource,
      canvasSectionSource,
    ]) {
      for (const propName of [
        'setTranscriptionModelId',
        'setTtsVoice',
        'setSystemInstruction',
        'setTemperature',
        'setTopP',
        'setTopK',
        'setThinkingBudget',
        'setThinkingLevel',
        'setShowThoughts',
        'setMediaResolution',
        'setTranslationTargetLanguage',
        'setInputTranslationModelId',
        'setThoughtTranslationTargetLanguage',
        'setThoughtTranslationModelId',
        'setAutoCanvasVisualization',
        'setAutoCanvasModelId',
      ]) {
        expect(source).not.toContain(`${propName}:`);
      }
    }

    for (const source of [chatBehaviorSectionSource, modelsSectionSource]) {
      for (const propName of [
        'setTranscriptionModelId',
        'setTtsVoice',
        'setSystemInstruction',
        'setTemperature',
        'setTopP',
        'setTopK',
        'setThinkingBudget',
        'setThinkingLevel',
        'setShowThoughts',
        'setMediaResolution',
        'setTranslationTargetLanguage',
        'setInputTranslationModelId',
        'setThoughtTranslationTargetLanguage',
        'setThoughtTranslationModelId',
        'setAutoCanvasVisualization',
        'setAutoCanvasModelId',
      ]) {
        expect(source).not.toContain(`${propName}={`);
      }
    }
  });

  it('reuses the shared chat settings updater type for chat area contracts', () => {
    const chatAreaContextSource = readProjectFile('src/contexts/ChatAreaContext.tsx');
    const chatAreaPropsSource = readProjectFile('src/components/layout/chat-area/ChatAreaProps.ts');
    const chatStoreSource = readProjectFile('src/stores/chatStore.ts');

    for (const source of [chatAreaContextSource, chatAreaPropsSource, chatStoreSource]) {
      expect(source).toContain('ChatSettingsUpdater');
      expect(source).not.toContain('(updater: (prevSettings: ChatSettings) => ChatSettings) => void;');
      expect(source).not.toContain('(updater: (prev: ChatSettings) => ChatSettings) => void;');
    }
  });

  it('removes low-risk unused interface surface from selected modules', () => {
    const modelSelectorSource = readProjectFile('src/components/settings/controls/ModelSelector.tsx');
    const liveConfigSource = readProjectFile('src/hooks/live-api/useLiveConfig.ts');
    const liveConnectionSource = readProjectFile('src/hooks/live-api/useLiveConnection.ts');
    const historySidebarSource = readProjectFile('src/components/sidebar/HistorySidebar.tsx');

    expect(modelSelectorSource).not.toMatch(/\bt:\s*\(key:\s*string\)\s*=>\s*string;/);
    expect(liveConfigSource).not.toContain('appSettings: AppSettings;');
    expect(liveConnectionSource).not.toContain('chatSettings: ChatSettings;');
    expect(historySidebarSource).not.toContain("language?: 'en' | 'zh';");
  });

  it('keeps settings and history import/export actions local to settings modals', () => {
    const appSource = readProjectFile('src/hooks/app/useApp.ts');
    const mainContentViewModelSource = readProjectFile('src/components/layout/useMainContentViewModel.ts');
    const appModalsSource = readProjectFile('src/components/modals/AppModals.tsx');
    const settingsModalSource = readProjectFile('src/components/settings/SettingsModal.tsx');

    for (const propName of [
      'handleImportSettings',
      'handleExportSettings',
      'handleImportHistory',
      'handleExportHistory',
    ]) {
      expect(appSource).not.toContain(propName);
      expect(mainContentViewModelSource).not.toContain(propName);
      expect(appModalsSource).not.toContain(`${propName}:`);
      expect(appModalsSource).not.toContain(`${propName},`);
    }

    expect(settingsModalSource).toContain('useSettingsTransferActions');
  });

  it('keeps composer state in ChatAreaInputContext so the input uses one context-backed data path', () => {
    const chatAreaContextSource = readProjectFile('src/contexts/ChatAreaContext.tsx');
    const chatAreaSource = readProjectFile('src/components/layout/ChatArea.tsx');
    const chatInputCoreSource = readProjectFile('src/hooks/chat-input/useChatInputCore.ts');

    for (const field of [
      'appSettings: AppSettings;',
      'commandedInput: InputCommand | null;',
      'selectedFiles: UploadedFile[];',
      'setSelectedFiles:',
      'setAppFileError:',
      'editMode:',
      'editingMessageId:',
      'setEditingMessageId:',
      'isProcessingFile:',
      'fileError:',
      'aspectRatio?:',
      'imageSize?:',
      'imageOutputMode?:',
      'personGeneration?:',
      'themeId: string;',
    ]) {
      expect(chatAreaContextSource).toContain(field);
    }

    expect(chatAreaSource).toContain('commandedInput = useChatStore');
    expect(chatAreaSource).toContain('selectedFiles = useChatStore');
    expect(chatInputCoreSource).not.toContain("from '../../stores/chatStore'");
    expect(chatInputCoreSource).not.toContain("from '../../stores/settingsStore'");
  });

  it('passes chat input tool state through the input context while keeping registry-based tool menus', () => {
    const chatAreaContextSource = readProjectFile('src/contexts/ChatAreaContext.tsx');
    const chatTypesSource = readProjectFile('src/types/chat.ts');
    const chatInputActionsSource = readProjectFile('src/components/chat/input/ChatInputActions.tsx');
    const toolsMenuSource = readProjectFile('src/components/chat/input/ToolsMenu.tsx');
    const slashCommandsSource = readProjectFile('src/hooks/useSlashCommands.ts');
    const mainContentViewModelSource = readProjectFile('src/components/layout/useMainContentViewModel.ts');
    const chatAreaSource = readProjectFile('src/components/layout/ChatArea.tsx');
    const chatInputCoreSource = readProjectFile('src/hooks/chat-input/useChatInputCore.ts');

    expect(chatAreaContextSource).toContain('toolStates?: ChatToolToggleStates;');
    expect(chatAreaSource).not.toContain('toolStates: features.toolStates');
    expect(chatAreaSource).toContain('useChatInputToolStates');
    expect(mainContentViewModelSource).not.toContain('toolStates: {');
    expect(chatInputCoreSource).not.toContain('useChatInputToolStates');
    expect(chatTypesSource).toContain('toolStates: ChatToolToggleStates;');
    expect(chatInputActionsSource).toContain('toolStates');
    expect(toolsMenuSource).toContain('getChatToolsForSurface');
    expect(slashCommandsSource).toContain('getSlashCommandToolDefinitions');

    for (const source of [chatTypesSource, toolsMenuSource]) {
      expect(source).not.toContain('isGoogleSearchEnabled: boolean;');
      expect(source).not.toContain('onToggleGoogleSearch: () => void;');
      expect(source).not.toContain('isCodeExecutionEnabled: boolean;');
      expect(source).not.toContain('onToggleCodeExecution: () => void;');
      expect(source).not.toContain('isUrlContextEnabled: boolean;');
      expect(source).not.toContain('onToggleUrlContext: () => void;');
      expect(source).not.toContain('isDeepSearchEnabled: boolean;');
      expect(source).not.toContain('onToggleDeepSearch: () => void;');
    }
  });

  it('uses store-level message actions for repeated session/message updates', () => {
    const chatStoreSource = readProjectFile('src/stores/chatStore.ts');
    const suggestionsSource = readProjectFile('src/hooks/chat/useSuggestions.ts');
    const messageUpdatesSource = readProjectFile('src/hooks/chat/actions/useMessageUpdates.ts');

    expect(chatStoreSource).toContain('updateMessageInSession:');
    expect(chatStoreSource).toContain('updateMessageInActiveSession:');
    expect(chatStoreSource).toContain('appendMessageToSession:');
    expect(suggestionsSource).toContain('updateMessageInSession');
    expect(messageUpdatesSource).toContain('updateMessageInActiveSession');
  });
});
