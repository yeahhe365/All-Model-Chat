import type { ModelCapabilities } from '@/stores/modelCapabilitiesStore';
import type { ChatToolId, ChatToolSettingKey } from '@/types/chatTools';

type ChatToolSurface = 'tools-menu' | 'slash-command';

export type ChatToolIconKey = 'telescope' | 'globe' | 'terminal' | 'python' | 'link' | 'calculator';

export interface ChatToolDefinition {
  id: ChatToolId;
  labelKey: string;
  shortLabelKey?: string;
  icon: ChatToolIconKey;
  settingKey?: ChatToolSettingKey;
  slashCommand?: {
    name: string;
    descriptionKey: string;
    icon: string;
  };
  isAvailable: (context: ChatToolAvailabilityContext) => boolean;
}

export interface ChatToolAvailabilityContext {
  surface: ChatToolSurface;
  capabilities: ModelCapabilities;
  hasLocalPythonHandler?: boolean;
}

const isToolsMenu = (context: ChatToolAvailabilityContext) => context.surface === 'tools-menu';

const CHAT_TOOL_REGISTRY: ChatToolDefinition[] = [
  {
    id: 'deepSearch',
    labelKey: 'deep_search_label',
    shortLabelKey: 'deep_search_short',
    icon: 'telescope',
    settingKey: 'isDeepSearchEnabled',
    slashCommand: { name: 'deep', descriptionKey: 'help_cmd_deep', icon: 'deep' },
    isAvailable: ({ capabilities }) => capabilities.permissions.canUseDeepSearch,
  },
  {
    id: 'googleSearch',
    labelKey: 'web_search_label',
    shortLabelKey: 'web_search_short',
    icon: 'globe',
    settingKey: 'isGoogleSearchEnabled',
    slashCommand: { name: 'online', descriptionKey: 'help_cmd_search', icon: 'search' },
    isAvailable: (context) =>
      context.capabilities.permissions.canUseGoogleSearch &&
      (!isToolsMenu(context) || !context.capabilities.permissions.canUseLiveControls),
  },
  {
    id: 'codeExecution',
    labelKey: 'code_execution_label',
    shortLabelKey: 'code_execution_short',
    icon: 'terminal',
    settingKey: 'isCodeExecutionEnabled',
    slashCommand: { name: 'code', descriptionKey: 'help_cmd_code', icon: 'code' },
    isAvailable: ({ capabilities }) => capabilities.permissions.canUseCodeExecution,
  },
  {
    id: 'localPython',
    labelKey: 'local_python_label',
    shortLabelKey: 'local_python_short',
    icon: 'python',
    settingKey: 'isLocalPythonEnabled',
    isAvailable: (context) => context.capabilities.permissions.canUseLocalPython && !!context.hasLocalPythonHandler,
  },
  {
    id: 'urlContext',
    labelKey: 'url_context_label',
    shortLabelKey: 'url_context_short',
    icon: 'link',
    settingKey: 'isUrlContextEnabled',
    slashCommand: { name: 'url', descriptionKey: 'help_cmd_url', icon: 'url' },
    isAvailable: ({ capabilities }) => capabilities.permissions.canUseUrlContext,
  },
  {
    id: 'tokenCount',
    labelKey: 'tools_token_count_label',
    icon: 'calculator',
    isAvailable: ({ capabilities }) => capabilities.permissions.canUseTokenCount,
  },
];

export const getChatToolsForSurface = (context: ChatToolAvailabilityContext): ChatToolDefinition[] =>
  CHAT_TOOL_REGISTRY.filter((tool) => {
    if (context.surface === 'slash-command' && !tool.slashCommand) {
      return false;
    }

    return tool.isAvailable(context);
  });

export const getSlashCommandToolDefinitions = (): ChatToolDefinition[] =>
  CHAT_TOOL_REGISTRY.filter((tool) => !!tool.slashCommand);
