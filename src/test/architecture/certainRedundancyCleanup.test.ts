import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

const projectRoot = path.resolve(__dirname, '../../..');

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
    expect(fs.existsSync(path.join(projectRoot, 'src/components/layout/chat-area/ChatAreaContext.tsx'))).toBe(false);
    expect(headerSource).not.toContain('currentModelName?: string;');
    expect(historySidebarSource).not.toContain('isOpen?: boolean;');
    expect(apiConfigSource).not.toContain('serverManagedApi?: boolean;');
    expect(apiConfigSource).not.toContain('setLiveApiEphemeralTokenEndpoint?:');
    expect(customIconsSource).not.toContain("export * from './iconUtils';");
  });

  it('keeps PiP availability independent from custom API config toggles', () => {
    const mainContentSource = readProjectFile('src/components/layout/MainContent.tsx');
    const mainContentViewModelSource = readProjectFile('src/components/layout/useMainContentViewModel.ts');
    const runtimeContextSource = readProjectFile('src/components/layout/chat-runtime/ChatRuntimeContext.tsx');

    expect(runtimeContextSource).toContain('isPipSupported: pipState.isPipSupported,');
    expect(mainContentSource).not.toContain('pipState.isPipSupported && appSettings.useCustomApiConfig');
    expect(mainContentViewModelSource).not.toContain('pipState.isPipSupported && appSettings.useCustomApiConfig');
    expect(runtimeContextSource).not.toContain('pipState.isPipSupported && appSettings.useCustomApiConfig');
  });

  it('keeps message-list scroll ownership local instead of routing scroll events back through chat state', () => {
    const chatScrollSource = readProjectFile('src/hooks/chat/useChatScroll.ts');
    const messageListSource = readProjectFile('src/components/chat/MessageList.tsx');

    expect(chatScrollSource).not.toContain('handleScroll =');
    expect(fs.existsSync(path.join(projectRoot, 'src/components/layout/chat-area/ChatAreaContext.tsx'))).toBe(false);
    expect(fs.existsSync(path.join(projectRoot, 'src/components/layout/chat-area/ChatAreaProps.ts'))).toBe(false);
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
    expect(useAppPromptModesSource).toContain('loadLiveArtifactsSystemPrompt');
    expect(messageExportSource).toContain("from '@/utils/export/runtime'");
    expect(chatSessionExportSource).toContain("from '@/utils/export/runtime'");
  });

  it('does not keep sanitizeSessionForExport as an identity wrapper', () => {
    const source = readProjectFile('src/utils/chat/session.ts');

    expect(source).toContain('export const stripSessionFilePayloads =');
    expect(source).not.toContain('sanitizeSessionForExport');
    expect(source).not.toContain('updateSessionWithNewMessages');
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
    const chatInputProviderSource = readProjectFile('src/components/chat/input/ChatInputProvider.tsx');
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
    expect(chatInputProviderSource).toContain("from '@/hooks/chat-input/useChatInput'");
    expect(chatInputProviderSource).toContain("from '@/hooks/chat-input/useChatInputState'");
    expect(chatTextAreaSource).toContain("from '@/hooks/chat-input/useChatInputState'");
    expect(chatAreaSource).toContain("from '@/hooks/chat-input/useChatInputHeight'");
  });

  it('keeps chat store selectors close to their consumer instead of behind a bulk binding hook', () => {
    const chatHookSource = readProjectFile('src/hooks/chat/useChat.ts');

    expect(chatHookSource).toContain("from '@/stores/chatStore'");
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

  it('keeps standard chat sender on the shared optimistic message pipeline', () => {
    const source = readProjectFile('src/features/message-sender/standardChatStrategy.ts');

    expect(source).toContain('runOptimisticMessagePipeline');
    expect(source).not.toContain('useStandardChatSession');
    expect(source).toContain('resolveStandardChatTurn');
    expect(source).toContain('performStandardChatApiCall');
    expect(source).not.toContain('performOptimisticSessionUpdate');
    expect(source).not.toContain('generateSessionTitle');
    expect(fs.existsSync(path.join(projectRoot, 'src/features/message-sender/useStandardChatSession.ts'))).toBe(false);
    expect(source.length).toBeLessThan(21000);
  });

  it('keeps senders on the shared optimistic message pipeline', () => {
    for (const relativePath of [
      'src/features/message-sender/standardChatStrategy.ts',
      'src/features/message-sender/liveArtifactsStrategy.ts',
      'src/features/message-sender/ttsImagenStrategy.ts',
      'src/features/message-sender/imageEditStrategy.ts',
    ]) {
      const source = readProjectFile(relativePath);

      expect(source).toContain('runOptimisticMessagePipeline');
      expect(source).not.toContain('performOptimisticSessionUpdate');
      expect(source).not.toContain('generateSessionTitle');
      expect(source).not.toContain('DEFAULT_CHAT_SETTINGS');
    }
  });

  it('keeps message sender lifecycle centralized instead of duplicating sender hooks', () => {
    const mainSenderSource = readProjectFile('src/hooks/useMessageSender.ts');

    expect(mainSenderSource).toContain('useMessageLifecycle');
    expect(mainSenderSource).toMatch(/const \{ runMessageLifecycle \} = useMessageLifecycle\(/);

    for (const hookName of [
      'useStandardChat',
      'useLiveArtifactsGenerator',
      'useTtsImagenSender',
      'useImageEditSender',
    ]) {
      expect(mainSenderSource).not.toContain(hookName);
      expect(fs.existsSync(path.join(projectRoot, `src/features/message-sender/${hookName}.ts`))).toBe(false);
    }

    const senderFiles = listProjectSourceFiles('src/features/message-sender');
    const lifecycleConsumers = senderFiles.filter(
      (relativePath) =>
        !relativePath.endsWith('.test.tsx') &&
        relativePath !== 'src/features/message-sender/useMessageLifecycle.ts' &&
        readProjectFile(relativePath).includes('useMessageLifecycle'),
    );
    expect(lifecycleConsumers).toEqual(['src/features/message-sender/messagePipeline.ts']);
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

  it('removes the unused parallel settings component tree', () => {
    const settingsContentSource = readProjectFile('src/components/settings/SettingsContent.tsx');
    const settingsSourceFiles = listProjectSourceFiles('src/components/settings');

    for (const relativePath of [
      'src/components/settings/sections/ChatBehaviorSection.tsx',
      'src/components/settings/sections/ChatBehaviorSection.test.tsx',
      'src/components/settings/ModelVoiceSettings.tsx',
      'src/components/settings/ModelVoiceSettings.test.tsx',
      'src/components/settings/ModelVoiceSettings.interaction.test.tsx',
    ]) {
      expect(fs.existsSync(path.join(projectRoot, relativePath))).toBe(false);
    }

    for (const relativePath of settingsSourceFiles) {
      const source = readProjectFile(relativePath);
      expect(source).not.toContain('ChatBehaviorSection');
      expect(source).not.toContain('ModelVoiceSettings');
    }

    expect(settingsContentSource).toContain("from './sections/ModelsSection'");
  });

  it('keeps model settings panels on the shared settings object contract', () => {
    const modelsSectionSource = readProjectFile('src/components/settings/sections/ModelsSection.tsx');
    const languageVoiceSectionSource = readProjectFile('src/components/settings/sections/LanguageVoiceSection.tsx');
    const liveArtifactsSectionSource = readProjectFile('src/components/settings/sections/LiveArtifactsSection.tsx');

    for (const source of [languageVoiceSectionSource, liveArtifactsSectionSource]) {
      expect(source).toContain('currentSettings: AppSettings;');
      expect(source).toContain('onUpdateSetting: SettingsUpdateHandler;');
    }

    for (const source of [modelsSectionSource, languageVoiceSectionSource, liveArtifactsSectionSource]) {
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
        'setAutoLiveArtifactsVisualization',
        'setAutoLiveArtifactsModelId',
      ]) {
        expect(source).not.toContain(`${propName}:`);
      }
    }

    for (const source of [modelsSectionSource]) {
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
        'setAutoLiveArtifactsVisualization',
        'setAutoLiveArtifactsModelId',
      ]) {
        expect(source).not.toContain(`${propName}={`);
      }
    }
  });

  it('reuses the shared chat settings updater type for store-backed chat area contracts', () => {
    const chatRuntimeContextSource = readProjectFile('src/components/layout/chat-runtime/ChatRuntimeContext.tsx');
    const chatStoreSource = readProjectFile('src/stores/chatStore.ts');

    for (const source of [chatRuntimeContextSource, chatStoreSource]) {
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

  it('keeps composer state subscribed at the consumer instead of relaying it through ChatArea context', () => {
    const chatAreaSource = readProjectFile('src/components/layout/ChatArea.tsx');
    const chatInputCoreSource = readProjectFile('src/hooks/chat-input/useChatInputCore.ts');
    const runtimeContextSource = readProjectFile('src/components/layout/chat-runtime/ChatRuntimeContext.tsx');

    expect(fs.existsSync(path.join(projectRoot, 'src/contexts/ChatAreaContext.tsx'))).toBe(false);
    expect(fs.existsSync(path.join(projectRoot, 'src/components/layout/chat-area/ChatAreaContext.tsx'))).toBe(false);
    expect(fs.existsSync(path.join(projectRoot, 'src/components/layout/chat-area/ChatAreaProps.ts'))).toBe(false);
    expect(fs.existsSync(path.join(projectRoot, 'src/components/chat/input/ChatInputViewContext.tsx'))).toBe(false);
    expect(chatAreaSource).not.toContain('ChatAreaProvider');
    expect(chatAreaSource).not.toContain('providerValue');
    expect(readProjectFile('src/components/chat/input/ChatInput.tsx')).not.toContain('ChatInputViewProvider');
    expect(chatInputCoreSource).toContain("from '@/stores/chatStore'");
    expect(chatInputCoreSource).toContain("from '@/stores/settingsStore'");
    expect(chatInputCoreSource).toContain('useChatInputRuntime');
    expect(runtimeContextSource).toContain('ChatInputRuntimeContext');
  });

  it('passes chat input tool state through the input context while keeping registry-based tool menus', () => {
    const chatTypesSource = readProjectFile('src/types/chat.ts');
    const chatInputActionsSource = readProjectFile('src/components/chat/input/ChatInputActions.tsx');
    const toolsMenuSource = readProjectFile('src/components/chat/input/ToolsMenu.tsx');
    const slashCommandsSource = readProjectFile('src/hooks/useSlashCommands.ts');
    const mainContentViewModelSource = readProjectFile('src/components/layout/useMainContentViewModel.ts');
    const chatAreaSource = readProjectFile('src/components/layout/ChatArea.tsx');
    const chatInputCoreSource = readProjectFile('src/hooks/chat-input/useChatInputCore.ts');

    expect(fs.existsSync(path.join(projectRoot, 'src/contexts/ChatAreaContext.tsx'))).toBe(false);
    expect(chatAreaSource).not.toContain('toolStates:');
    expect(chatAreaSource).not.toContain('useChatInputToolStates');
    expect(mainContentViewModelSource).not.toContain('toolStates: {');
    expect(chatInputCoreSource).toContain('useChatInputToolStates');
    expect(chatTypesSource).not.toContain('toolStates: ChatToolToggleStates;');
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

  it('keeps chat input shared state in context instead of repeating leaf subscriptions', () => {
    const chatTypesSource = readProjectFile('src/types/chat.ts');
    const chatInputSource = readProjectFile('src/components/chat/input/ChatInput.tsx');
    const chatInputAreaSource = readProjectFile('src/components/chat/input/ChatInputArea.tsx');
    const chatInputToolbarSource = readProjectFile('src/components/chat/input/ChatInputToolbar.tsx');
    const chatInputActionsSource = readProjectFile('src/components/chat/input/ChatInputActions.tsx');
    const chatInputProviderSource = readProjectFile('src/components/chat/input/ChatInputProvider.tsx');

    expect(fs.existsSync(path.join(projectRoot, 'src/components/chat/input/ChatInputViewModel.ts'))).toBe(false);
    expect(chatTypesSource).not.toContain('ChatInputToolbarProps');
    expect(chatTypesSource).not.toContain('ChatInputActionsProps');
    expect(chatInputSource).not.toContain('toolbarProps');
    expect(chatInputSource).not.toContain('actionsProps');
    expect(chatInputSource).not.toContain('areaProps');
    expect(chatInputSource).not.toContain('ChatInputViewModel');
    expect(chatInputAreaSource).not.toContain('view })');
    expect(chatInputAreaSource).not.toContain('view.');

    expect(chatInputProviderSource).toContain('toolStates: logic.chatInput.toolStates');
    expect(chatInputProviderSource).toContain('currentChatSettings: logic.chatInput.currentChatSettings');
    expect(chatInputProviderSource).toContain('capabilities: logic.capabilities');

    for (const [relativePath, source] of [
      ['src/components/chat/input/ChatInputToolbar.tsx', chatInputToolbarSource],
      ['src/components/chat/input/ChatInputActions.tsx', chatInputActionsSource],
    ] as const) {
      expect(source, relativePath).not.toContain("from '../../../stores/settingsStore'");
      expect(source, relativePath).not.toContain("from '../../../hooks/chat/useChatState'");
      expect(source, relativePath).not.toContain("from '../../../hooks/chat-input/useChatInputToolStates'");
      expect(source, relativePath).not.toContain('getCachedModelCapabilities');
      expect(source, relativePath).not.toContain('useChatInputRuntime');
    }
  });

  it('builds settings load state through shared helpers instead of duplicate branches', () => {
    const settingsStoreSource = readProjectFile('src/stores/settingsStore.ts');

    expect(settingsStoreSource).toContain('function buildLoadedAppSettings');
    expect(settingsStoreSource).toContain('function persistLoadedPreloadOverrides');
    expect(settingsStoreSource).not.toContain('if (storedSettings) {');
  });

  it('shares composer auxiliary action descriptors between inline controls and overflow menu', () => {
    const chatInputActionsSource = readProjectFile('src/components/chat/input/ChatInputActions.tsx');
    const utilityControlsSource = readProjectFile('src/components/chat/input/actions/UtilityControls.tsx');
    const composerMoreMenuSource = readProjectFile('src/components/chat/input/actions/ComposerMoreMenu.tsx');

    expect(
      fs.existsSync(path.join(projectRoot, 'src/components/chat/input/actions/useComposerAuxiliaryActions.tsx')),
    ).toBe(true);
    expect(chatInputActionsSource).toContain('useComposerAuxiliaryActions');

    for (const [relativePath, source] of [
      ['src/components/chat/input/actions/UtilityControls.tsx', utilityControlsSource],
      ['src/components/chat/input/actions/ComposerMoreMenu.tsx', composerMoreMenuSource],
    ] as const) {
      expect(source, relativePath).not.toContain("from '../../../../stores/settingsStore'");
      expect(source, relativePath).not.toContain("from '../../../../stores/chatStore'");
      expect(source, relativePath).not.toContain('showInputTranslationButton');
      expect(source, relativePath).not.toContain('showInputPasteButton');
      expect(source, relativePath).not.toContain('showInputClearButton');
    }
  });

  it('uses shared chat input context fixtures in leaf control tests', () => {
    const fixturePath = 'src/test/chatInputContextFixtures.ts';

    expect(fs.existsSync(path.join(projectRoot, fixturePath))).toBe(true);
    const fixtureSource = readProjectFile(fixturePath);
    expect(fixtureSource).toContain('createChatInputActionsContextValue');
    expect(fixtureSource).toContain('createChatInputComposerStatusContextValue');

    for (const [relativePath, expectedImport] of [
      ['src/components/chat/input/AttachmentMenu.test.tsx', "from '@/test/chatInputContextFixtures'"],
      ['src/components/chat/input/actions/SendControls.test.tsx', "from '@/test/chatInputContextFixtures'"],
      ['src/components/chat/input/ChatInputActions.test.tsx', "from '@/test/chatInputContextFixtures'"],
    ] as const) {
      const source = readProjectFile(relativePath);

      expect(source, relativePath).toContain(expectedImport);
      expect(source, relativePath).not.toContain('const actionsContextValue: ChatInputActionsContextValue =');
      expect(source, relativePath).not.toContain('const baseActionsContext: ChatInputActionsContextValue =');
      expect(source, relativePath).not.toContain('const createActionsContextValue =');
    }
  });

  it('isolates scoped chat runtime context from sidebar and modal prop assembly', () => {
    const mainContentSource = readProjectFile('src/components/layout/MainContent.tsx');
    const mainContentViewModelSource = readProjectFile('src/components/layout/useMainContentViewModel.ts');
    const runtimeContextSource = readProjectFile('src/components/layout/chat-runtime/ChatRuntimeContext.tsx');

    expect(mainContentSource).toContain('ChatRuntimeProvider');
    expect(mainContentViewModelSource).not.toContain('useChatRuntimeBridge');
    expect(mainContentViewModelSource).not.toContain('setChatRuntime');
    expect(mainContentViewModelSource).not.toContain('const chatRuntime = useMemo');
    expect(runtimeContextSource).toContain('ChatHeaderRuntimeContext');
    expect(runtimeContextSource).toContain('ChatMessageListRuntimeContext');
    expect(runtimeContextSource).toContain('ChatInputRuntimeContext');
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

  it('routes lightweight frontend persistence through shared persisted stores', () => {
    const chatInputStateSource = readProjectFile('src/hooks/chat-input/useChatInputState.ts');
    const settingsLogicSource = readProjectFile('src/hooks/features/useSettingsLogic.ts');
    const useModelsSource = readProjectFile('src/hooks/core/useModels.ts');
    const uiStoreSource = readProjectFile('src/stores/uiStore.ts');
    const modelHelpersSource = readProjectFile('src/utils/modelHelpers.ts');

    expect(chatInputStateSource).toContain('useChatDraftStore');
    expect(settingsLogicSource).toContain('useSettingsUiStore');
    expect(useModelsSource).toContain('useModelPreferencesStore');
    expect(uiStoreSource).toContain('persistentStorage');
    expect(modelHelpersSource).toContain('useModelPreferencesStore');

    for (const [relativePath, source] of [
      ['src/hooks/chat-input/useChatInputState.ts', chatInputStateSource],
      ['src/hooks/features/useSettingsLogic.ts', settingsLogicSource],
      ['src/hooks/core/useModels.ts', useModelsSource],
      ['src/stores/uiStore.ts', uiStoreSource],
      ['src/utils/modelHelpers.ts', modelHelpersSource],
    ] as const) {
      expect(source, relativePath).not.toContain('localStorage.');
      expect(source, relativePath).not.toContain("addEventListener('storage'");
      expect(source, relativePath).not.toContain('new StorageEvent');
    }
  });

  it('keeps React act environment configuration centralized in test setup', () => {
    const testFiles = listProjectSourceFiles('src').filter(
      (relativePath) =>
        /\.(test|spec)\.(ts|tsx)$/.test(relativePath) &&
        relativePath !== 'src/test/architecture/certainRedundancyCleanup.test.ts',
    );

    for (const relativePath of testFiles) {
      const source = readProjectFile(relativePath);

      expect(source, relativePath).not.toContain('IS_REACT_ACT_ENVIRONMENT');
    }

    expect(readProjectFile('src/test/setup.ts')).toContain('IS_REACT_ACT_ENVIRONMENT');
  });

  it('keeps shared test renderer cleanup out of individual test suites', () => {
    const explicitRendererLifecycleFiles = new Set([
      'src/components/modals/CreateTextFileEditor.preferences.test.tsx',
      'src/components/message/blocks/lazyDiagramLoading.test.tsx',
      'src/components/shared/file-preview/MarkdownFileViewer.test.tsx',
    ]);
    const testFiles = listProjectSourceFiles('src').filter(
      (relativePath) =>
        /\.(test|spec)\.(ts|tsx)$/.test(relativePath) &&
        relativePath !== 'src/test/architecture/certainRedundancyCleanup.test.ts',
    );

    for (const relativePath of testFiles) {
      const source = readProjectFile(relativePath);

      expect(source, relativePath).not.toMatch(
        /afterEach\(\(\)\s*=>\s*{\s*act\(\(\)\s*=>\s*{\s*root\.unmount\(\);\s*}\);\s*}\);/s,
      );
      expect(source, relativePath).not.toMatch(
        /afterEach\(\(\)\s*=>\s*{\s*act\(\(\)\s*=>\s*{\s*root\.unmount\(\);\s*}\);\s*vi\.(?:clearAllMocks|restoreAllMocks)\(\);\s*}\);/s,
      );

      if (
        !explicitRendererLifecycleFiles.has(relativePath) &&
        relativePath !== 'src/components/layout/ChatArea.test.tsx'
      ) {
        expect(source, relativePath).not.toMatch(
          /afterEach\(\(\)\s*=>\s*{[\s\S]*?\b(?:root\??|mounted\.root)\.unmount\(\)/,
        );
      }
    }
  });

  it('keeps core infrastructure mocks on shared test doubles', () => {
    const testFiles = listProjectSourceFiles('src').filter(
      (relativePath) =>
        /\.(test|spec)\.(ts|tsx)$/.test(relativePath) &&
        relativePath !== 'src/test/architecture/certainRedundancyCleanup.test.ts',
    );

    for (const relativePath of testFiles) {
      const source = readProjectFile(relativePath);

      expect(source, relativePath).not.toMatch(/\b(?:logService|dbService):\s*{/);
      expect(source, relativePath).not.toMatch(/\buseI18n:\s*\(\)\s*=>/);

      if (!relativePath.startsWith('src/test/')) {
        expect(source, relativePath).not.toMatch(/\bcreate(?:MockLogService|MockDbService|I18nMock|RealI18nMock)\(\)/);
      }
    }
  });

  it('keeps core mock modules behind moduleMockDoubles outside the test-double suites', () => {
    const testFiles = listProjectSourceFiles('src').filter(
      (relativePath) =>
        /\.(test|spec)\.(ts|tsx)$/.test(relativePath) &&
        !relativePath.startsWith('src/test/') &&
        relativePath !== 'src/test/architecture/certainRedundancyCleanup.test.ts',
    );

    for (const relativePath of testFiles) {
      const source = readProjectFile(relativePath);

      expect(source, relativePath).not.toContain('serviceTestDoubles');
      expect(source, relativePath).not.toContain('i18nTestDoubles');
    }
  });

  it('keeps complex hook test inputs on typed shared factories', () => {
    const senderSource = readProjectFile('src/hooks/useMessageSender.test.tsx');
    const standardChatSource = readProjectFile('src/features/message-sender/standardChatStrategy.test.tsx');
    const sessionLoaderSource = readProjectFile('src/hooks/chat/history/useSessionLoader.test.tsx');

    expect(senderSource).toContain('createMessageSenderProps');
    expect(senderSource).toContain('createUploadedFile');
    expect(senderSource).not.toContain('useMessageSender({');
    expect(senderSource).not.toContain('as any');

    expect(standardChatSource).toContain('createStandardChatProps');
    expect(standardChatSource).not.toContain('useStandardChat({');
    expect(standardChatSource).not.toContain('as any');

    expect(sessionLoaderSource).toContain('createSessionLoaderProps');
    expect(sessionLoaderSource).not.toContain('useSessionLoader({');
    expect(sessionLoaderSource).not.toContain('as any');
  });
});
