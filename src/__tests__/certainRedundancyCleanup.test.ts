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
      expect(source).not.toContain("services/geminiService");
    }
  });

  it('keeps standard chat sender delegated to session, turn, and API helpers', () => {
    const source = readProjectFile('src/hooks/message-sender/useStandardChat.ts');

    expect(source).toContain('useStandardChatSession');
    expect(source).toContain('resolveStandardChatTurn');
    expect(source).toContain('useStandardChatApiCall');
    expect(source.length).toBeLessThan(21000);
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
});
