import { describe, expect, it } from 'vitest';
import { getModelCapabilities } from '../../utils/modelHelpers';
import {
  CHAT_TOOL_REGISTRY,
  getChatToolsForSurface,
  getSlashCommandToolDefinitions,
  getToggleableToolIds,
} from './toolRegistry';

describe('chat tool registry', () => {
  it('keeps toggleable tool ids, labels, slash commands, and settings keys in one registry', () => {
    expect(getToggleableToolIds()).toEqual([
      'deepSearch',
      'googleSearch',
      'codeExecution',
      'localPython',
      'urlContext',
    ]);

    expect(CHAT_TOOL_REGISTRY).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'googleSearch',
          labelKey: 'web_search_label',
          shortLabelKey: 'web_search_short',
          settingKey: 'isGoogleSearchEnabled',
          slashCommand: expect.objectContaining({ name: 'online', descriptionKey: 'help_cmd_search' }),
        }),
        expect.objectContaining({
          id: 'codeExecution',
          settingKey: 'isCodeExecutionEnabled',
          slashCommand: expect.objectContaining({ name: 'code', descriptionKey: 'help_cmd_code' }),
        }),
      ]),
    );
  });

  it('drives slash-command tool definitions from the same registry as the toolbar menu', () => {
    expect(getSlashCommandToolDefinitions().map((tool) => tool.slashCommand?.name)).toEqual([
      'deep',
      'online',
      'code',
      'url',
    ]);
  });

  it('filters visible menu tools from permissions instead of model-name checks in components', () => {
    const liveCapabilities = getModelCapabilities('gemini-3.1-flash-live-preview');
    const geminiImageCapabilities = getModelCapabilities('gemini-3.1-flash-image-preview');
    const gemmaCapabilities = getModelCapabilities('gemma-3-27b-it');

    expect(
      getChatToolsForSurface({
        surface: 'tools-menu',
        capabilities: liveCapabilities,
        hasLocalPythonHandler: true,
      }).map((tool) => tool.id),
    ).toEqual(['localPython']);

    expect(
      getChatToolsForSurface({
        surface: 'tools-menu',
        capabilities: geminiImageCapabilities,
        hasLocalPythonHandler: true,
      }).map((tool) => tool.id),
    ).toEqual(['googleSearch', 'tokenCount']);

    expect(
      getChatToolsForSurface({
        surface: 'tools-menu',
        capabilities: gemmaCapabilities,
        hasLocalPythonHandler: true,
      }).map((tool) => tool.id),
    ).toEqual(['deepSearch', 'googleSearch', 'localPython', 'youtubeUrl', 'tokenCount']);
  });
});
