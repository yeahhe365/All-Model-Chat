import { type Dispatch, type SetStateAction } from 'react';
import type React from 'react';
import { useState, useMemo, useCallback } from 'react';
import { type translations } from '@/i18n/translations';
import { type AttachmentAction, type ModelOption } from '@/types';
import type { SlashCommand as Command } from '@/types/slashCommands';
import type { ChatToolToggleStates, ToggleableChatToolId } from '@/types/chatTools';
import { getSlashCommandToolDefinitions } from '@/features/chat-tools/toolRegistry';
import { getCachedModelCapabilities } from '@/stores/modelCapabilitiesStore';

export type SlashCommandState = {
  isOpen: boolean;
  query: string;
  filteredCommands: Command[];
  selectedIndex: number;
};

interface UseSlashCommandsProps {
  t: (key: keyof typeof translations) => string;
  toolStates: ChatToolToggleStates;
  onClearChat: () => void;
  onNewChat: () => void;
  onOpenSettings: () => void;
  onToggleLiveArtifactsPrompt: () => void;
  onTogglePinCurrentSession: () => void;
  onRetryLastTurn: () => void;
  onAttachmentAction: (action: AttachmentAction) => void;
  availableModels: ModelOption[];
  onSelectModel: (modelId: string) => void;
  onMessageSent: () => void;
  setIsHelpModalOpen: (isOpen: boolean) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  onEditLastUserMessage: () => void;
  onTogglePip: () => void;
  setInputText: Dispatch<SetStateAction<string>>;
  currentModelId: string;
  onSetThinkingLevel: (level: 'LOW' | 'HIGH' | 'MINIMAL' | 'MEDIUM') => void;
  thinkingLevel?: 'LOW' | 'HIGH' | 'MINIMAL' | 'MEDIUM';
}

const CLOSED_SLASH_COMMAND_STATE: SlashCommandState = {
  isOpen: false,
  query: '',
  filteredCommands: [],
  selectedIndex: 0,
};

const INPUT_POPULATING_COMMANDS = new Set(['model', 'edit']);

const TOOL_COMMAND_ACTIONS: Record<string, ToggleableChatToolId> = {
  deep: 'deepSearch',
  online: 'googleSearch',
  code: 'codeExecution',
  url: 'urlContext',
};

const buildModelCommands = (
  models: ModelOption[],
  onSelectModel: (modelId: string) => void,
  setInputText: Dispatch<SetStateAction<string>>,
  onMessageSent: () => void,
): Command[] =>
  models.map((model) => ({
    name: model.name,
    description: model.isPinned ? `Pinned Model` : `ID: ${model.id}`,
    icon: model.id.includes('imagen') ? 'image' : model.isPinned ? 'pin' : 'bot',
    action: () => {
      onSelectModel(model.id);
      setInputText('');
      onMessageSent();
    },
  }));

export const useSlashCommands = ({
  t,
  toolStates,
  onClearChat,
  onNewChat,
  onOpenSettings,
  onToggleLiveArtifactsPrompt,
  onTogglePinCurrentSession,
  onRetryLastTurn,
  onAttachmentAction,
  availableModels,
  onSelectModel,
  onMessageSent,
  setIsHelpModalOpen,
  textareaRef,
  onEditLastUserMessage,
  onTogglePip,
  setInputText,
  currentModelId,
  onSetThinkingLevel,
  thinkingLevel,
}: UseSlashCommandsProps) => {
  const [slashCommandState, setSlashCommandState] = useState<SlashCommandState>(CLOSED_SLASH_COMMAND_STATE);

  const commandDefinitions = useMemo(() => {
    const toolCommands = getSlashCommandToolDefinitions().map((tool) => ({
      name: tool.slashCommand!.name,
      description: t(tool.slashCommand!.descriptionKey as keyof typeof translations),
      icon: tool.slashCommand!.icon,
    }));

    return [
      { name: 'model', description: t('help_cmd_model'), icon: 'bot' },
      { name: 'help', description: t('help_cmd_help'), icon: 'help' },
      { name: 'edit', description: t('help_cmd_edit'), icon: 'edit' },
      { name: 'pin', description: t('help_cmd_pin'), icon: 'pin' },
      { name: 'retry', description: t('help_cmd_retry'), icon: 'retry' },
      ...toolCommands,
      { name: 'file', description: t('help_cmd_file'), icon: 'file' },
      { name: 'clear', description: t('help_cmd_clear'), icon: 'clear' },
      { name: 'new', description: t('help_cmd_new'), icon: 'new' },
      { name: 'settings', description: t('help_cmd_settings'), icon: 'settings' },
      { name: 'artifacts', description: t('help_cmd_artifacts'), icon: 'artifacts' },
      { name: 'pip', description: t('help_cmd_pip'), icon: 'pip' },
      { name: 'fast', description: t('help_cmd_fast'), icon: 'fast' },
    ];
  }, [t]);

  const commands = useMemo<Command[]>(
    () =>
      commandDefinitions.map(({ name, description, icon }) => {
        switch (name) {
          case 'model':
            return {
              name,
              description,
              icon,
              action: () => {
                setInputText('/model ');
                setTimeout(() => {
                  const textarea = textareaRef.current;
                  if (textarea) {
                    textarea.focus();
                    const textLength = textarea.value.length;
                    textarea.setSelectionRange(textLength, textLength);
                  }
                }, 0);
              },
            };
          case 'help':
            return { name, description, icon, action: () => setIsHelpModalOpen(true) };
          case 'edit':
            return { name, description, icon, action: onEditLastUserMessage };
          case 'pin':
            return { name, description, icon, action: onTogglePinCurrentSession };
          case 'retry':
            return { name, description, icon, action: onRetryLastTurn };
          case 'online':
          case 'deep':
          case 'code':
          case 'url':
            return {
              name,
              description,
              icon,
              action: toolStates[TOOL_COMMAND_ACTIONS[name]]?.onToggle ?? (() => undefined),
            };
          case 'file':
            return { name, description, icon, action: () => onAttachmentAction('upload') };
          case 'clear':
            return { name, description, icon, action: onClearChat };
          case 'new':
            return { name, description, icon, action: onNewChat };
          case 'settings':
            return { name, description, icon, action: onOpenSettings };
          case 'artifacts':
            return { name, description, icon, action: onToggleLiveArtifactsPrompt };
          case 'pip':
            return { name, description, icon, action: onTogglePip };
          case 'fast':
            return {
              name,
              description,
              icon,
              action: () => {
                const capabilities = getCachedModelCapabilities(currentModelId);
                const targetLevel =
                  capabilities.isGemini3FlashModel || capabilities.isGeminiRoboticsModel ? 'MINIMAL' : 'LOW';
                onSetThinkingLevel(thinkingLevel === targetLevel ? 'HIGH' : targetLevel);
              },
            };
          default:
            return {
              name,
              description,
              icon,
              action: () => undefined,
            };
        }
      }),
    [
      commandDefinitions,
      currentModelId,
      onAttachmentAction,
      onClearChat,
      onEditLastUserMessage,
      onNewChat,
      onOpenSettings,
      onRetryLastTurn,
      onSetThinkingLevel,
      onToggleLiveArtifactsPrompt,
      onTogglePinCurrentSession,
      onTogglePip,
      setInputText,
      setIsHelpModalOpen,
      textareaRef,
      thinkingLevel,
      toolStates,
    ],
  );

  const allCommandsForHelp = useMemo(
    () =>
      commandDefinitions.map(({ name, description, icon }) => ({
        name: `/${name}`,
        description,
        icon,
      })),
    [commandDefinitions],
  );

  const resetSlashCommandState = useCallback(() => {
    setSlashCommandState(CLOSED_SLASH_COMMAND_STATE);
  }, []);

  const openModelCommandList = useCallback(() => {
    const modelCommands = buildModelCommands(availableModels, onSelectModel, setInputText, onMessageSent);

    setSlashCommandState({
      isOpen: true,
      query: 'model',
      filteredCommands: modelCommands,
      selectedIndex: 0,
    });
  }, [availableModels, onMessageSent, onSelectModel, setInputText]);

  const handleCommandSelect = useCallback(
    (command: Command) => {
      if (!command) return;

      // Execute the command action immediately
      command.action();

      if (command.name === 'model') {
        openModelCommandList();
        return;
      }

      resetSlashCommandState();

      const isDynamicModelCommand = availableModels.some((m) => m.name === command.name);

      // If the command is meant to clear the input (i.e. not a template command or dynamic model selection)
      // we explicitly clear the text.
      // Dynamic model commands handle their own clearing in their action definition (see handleInputChange).
      if (!INPUT_POPULATING_COMMANDS.has(command.name) && !isDynamicModelCommand) {
        // Use setTimeout to ensure the input clear happens after the event loop tick
        // This solves issues where Enter key press might interfere with state updates
        setTimeout(() => {
          setInputText('');
        }, 0);
      }
    },
    [availableModels, openModelCommandList, resetSlashCommandState, setInputText],
  );

  const handleInputChange = useCallback(
    (value: string) => {
      setInputText(value);

      if (!value.startsWith('/')) {
        resetSlashCommandState();
        return;
      }

      const [commandPart, ...args] = value.split(' ');
      const commandName = commandPart.substring(1).toLowerCase();

      if (commandName === 'model') {
        const keyword = args.join(' ').toLowerCase();
        const filteredModels = availableModels.filter((m) => m.name.toLowerCase().includes(keyword));
        const modelCommands = buildModelCommands(filteredModels, onSelectModel, setInputText, onMessageSent);

        setSlashCommandState({
          isOpen: modelCommands.length > 0 || !keyword.trim(),
          query: 'model',
          filteredCommands: modelCommands,
          selectedIndex: 0,
        });
      } else {
        const query = commandPart.substring(1).toLowerCase();
        const filtered = commands.filter((cmd) => cmd.name.toLowerCase().startsWith(query));
        setSlashCommandState({
          isOpen: filtered.length > 0 && !value.includes(' '),
          query: query,
          filteredCommands: filtered,
          selectedIndex: 0,
        });
      }
    },
    [availableModels, commands, onMessageSent, onSelectModel, resetSlashCommandState, setInputText],
  );

  const handleSlashCommandExecution = useCallback(
    (text: string) => {
      const exactCommandMatch = text.match(/^\/(\S+)$/);
      if (exactCommandMatch) {
        const commandName = exactCommandMatch[1].toLowerCase();
        const command = commands.find((cmd) => cmd.name === commandName);
        if (!command) {
          return false;
        }

        handleCommandSelect(command);
        return true;
      }

      const modelCommandMatch = text.match(/^\/model\s+(.+)$/i);
      if (!modelCommandMatch) {
        return false;
      }

      const keyword = modelCommandMatch[1].trim().toLowerCase();
      if (!keyword) {
        return false;
      }

      const model = availableModels.find((m) => m.name.toLowerCase().includes(keyword));
      if (!model) {
        return false;
      }

      onSelectModel(model.id);
      setInputText('');
      onMessageSent();
      resetSlashCommandState();
      return true;
    },
    [
      availableModels,
      commands,
      handleCommandSelect,
      onMessageSent,
      onSelectModel,
      resetSlashCommandState,
      setInputText,
    ],
  );

  return {
    slashCommandState,
    setSlashCommandState,
    allCommandsForHelp,
    handleCommandSelect,
    handleInputChange,
    handleSlashCommandExecution,
  };
};
