import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

const projectRoot = path.resolve(__dirname, '../..');

const readProjectFile = (relativePath: string) =>
  fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');

describe('certain redundancy cleanup guards', () => {
  it('does not keep identity wrapper exports in mainContentModels', () => {
    const source = readProjectFile('src/components/layout/mainContentModels.ts');

    expect(source).not.toContain('export const buildAppModalsProps =');
    expect(source).not.toContain('export const buildChatAreaInputActions =');
  });

  it('reuses stripSessionFilePayloads for sanitizeSessionForExport', () => {
    const source = readProjectFile('src/utils/chat/session.ts');

    expect(source).toContain('export const sanitizeSessionForExport = (session: SavedChatSession): SavedChatSession =>');
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
