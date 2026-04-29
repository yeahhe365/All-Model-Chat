import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

const projectRoot = path.resolve(__dirname, '../..');

const readProjectFile = (relativePath: string) => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');

describe('certain redundancy cleanup guards', () => {
  it('does not keep identity wrapper exports in mainContentModels', () => {
    const source = readProjectFile('src/components/layout/mainContentModels.ts');

    expect(source).not.toContain('export const buildAppModalsProps =');
    expect(source).not.toContain('export const buildChatAreaInputActions =');
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
    const chatInputSource = readProjectFile('src/hooks/chat-input/useChatInput.ts');
    const useAppSource = readProjectFile('src/hooks/app/useApp.ts');
    const useAppPromptModesSource = readProjectFile('src/hooks/app/useAppPromptModes.ts');
    const messageExportSource = readProjectFile('src/hooks/useMessageExport.ts');
    const chatSessionExportSource = readProjectFile('src/hooks/data-management/useChatSessionExport.ts');

    expect(messageListUiSource).toContain('useFileModalState');
    expect(chatInputSource).toContain('useChatInputFileUi');
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
