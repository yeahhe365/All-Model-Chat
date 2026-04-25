
import React, { useState, useMemo, useCallback, Dispatch, SetStateAction } from 'react';
import { translations } from '../utils/translations';
import { AttachmentAction, ModelOption } from '../types';
import type { SlashCommand as Command } from '../types/slashCommands';

export type SlashCommandState = {
  isOpen: boolean;
  query: string;
  filteredCommands: Command[];
  selectedIndex: number;
};

interface UseSlashCommandsProps {
  t: (key: keyof typeof translations) => string;
  onToggleGoogleSearch: () => void;
  onToggleDeepSearch: () => void;
  onToggleCodeExecution: () => void;
  onToggleUrlContext: () => void;
  onClearChat: () => void;
  onNewChat: () => void;
  onOpenSettings: () => void;
  onToggleCanvasPrompt: () => void;
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

export const useSlashCommands = ({
  t,
  onToggleGoogleSearch, onToggleDeepSearch, onToggleCodeExecution, onToggleUrlContext,
  onClearChat, onNewChat, onOpenSettings, onToggleCanvasPrompt,
  onTogglePinCurrentSession, onRetryLastTurn, onAttachmentAction,
  availableModels, onSelectModel, onMessageSent, setIsHelpModalOpen,
  textareaRef, onEditLastUserMessage, onTogglePip, setInputText,
  currentModelId, onSetThinkingLevel, thinkingLevel
}: UseSlashCommandsProps) => {
  
  const [slashCommandState, setSlashCommandState] = useState<SlashCommandState>(CLOSED_SLASH_COMMAND_STATE);

  const commandDefinitions = useMemo(
    () => [
      { name: 'model', description: t('help_cmd_model'), icon: 'bot' },
      { name: 'help', description: t('help_cmd_help'), icon: 'help' },
      { name: 'edit', description: t('help_cmd_edit'), icon: 'edit' },
      { name: 'pin', description: t('help_cmd_pin'), icon: 'pin' },
      { name: 'retry', description: t('help_cmd_retry'), icon: 'retry' },
      { name: 'online', description: t('help_cmd_search'), icon: 'search' },
      { name: 'deep', description: t('help_cmd_deep'), icon: 'deep' },
      { name: 'code', description: t('help_cmd_code'), icon: 'code' },
      { name: 'url', description: t('help_cmd_url'), icon: 'url' },
      { name: 'file', description: t('help_cmd_file'), icon: 'file' },
      { name: 'clear', description: t('help_cmd_clear'), icon: 'clear' },
      { name: 'new', description: t('help_cmd_new'), icon: 'new' },
      { name: 'settings', description: t('help_cmd_settings'), icon: 'settings' },
      { name: 'canvas', description: t('help_cmd_canvas'), icon: 'canvas' },
      { name: 'pip', description: t('help_cmd_pip'), icon: 'pip' },
      { name: 'fast', description: t('help_cmd_fast'), icon: 'fast' },
    ],
    [t],
  );

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
            return { name, description, icon, action: onToggleGoogleSearch };
          case 'deep':
            return { name, description, icon, action: onToggleDeepSearch };
          case 'code':
            return { name, description, icon, action: onToggleCodeExecution };
          case 'url':
            return { name, description, icon, action: onToggleUrlContext };
          case 'file':
            return { name, description, icon, action: () => onAttachmentAction('upload') };
          case 'clear':
            return { name, description, icon, action: onClearChat };
          case 'new':
            return { name, description, icon, action: onNewChat };
          case 'settings':
            return { name, description, icon, action: onOpenSettings };
          case 'canvas':
            return { name, description, icon, action: onToggleCanvasPrompt };
          case 'pip':
            return { name, description, icon, action: onTogglePip };
          case 'fast':
            return {
              name,
              description,
              icon,
              action: () => {
                const isGemini3Flash = currentModelId.includes('gemini-3') && currentModelId.includes('flash');
                const isGeminiRobotics = currentModelId.includes('gemini-robotics-er');
                const targetLevel = (isGemini3Flash || isGeminiRobotics) ? 'MINIMAL' : 'LOW';
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
      onToggleCanvasPrompt,
      onToggleCodeExecution,
      onToggleDeepSearch,
      onToggleGoogleSearch,
      onTogglePinCurrentSession,
      onTogglePip,
      onToggleUrlContext,
      setInputText,
      setIsHelpModalOpen,
      textareaRef,
      thinkingLevel,
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
    const modelCommands: Command[] = availableModels.map(model => ({
      name: model.name,
      description: model.isPinned ? `Pinned Model` : `ID: ${model.id}`,
      icon: model.id.includes('imagen') ? 'image' : (model.isPinned ? 'pin' : 'bot'),
      action: () => {
        onSelectModel(model.id);
        setInputText('');
        onMessageSent();
      },
    }));

    setSlashCommandState({
      isOpen: true,
      query: 'model',
      filteredCommands: modelCommands,
      selectedIndex: 0,
    });
  }, [availableModels, onMessageSent, onSelectModel, setInputText]);

  const handleCommandSelect = useCallback((command: Command) => {
    if (!command) return;
    
    // Execute the command action immediately
    command.action();
    
    if (command.name === 'model') {
      openModelCommandList();
      return;
    }

    resetSlashCommandState();

    const isDynamicModelCommand = availableModels.some(m => m.name === command.name);

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
  }, [availableModels, openModelCommandList, resetSlashCommandState, setInputText]);
  
  const handleInputChange = useCallback((value: string) => {
    setInputText(value);
  
    if (!value.startsWith('/')) {
      resetSlashCommandState();
      return;
    }
  
    const [commandPart, ...args] = value.split(' ');
    const commandName = commandPart.substring(1).toLowerCase();
  
    if (commandName === 'model') {
      const keyword = args.join(' ').toLowerCase();
      const filteredModels = availableModels.filter(m => m.name.toLowerCase().includes(keyword));
      const modelCommands: Command[] = filteredModels.map(model => ({
        name: model.name,
        description: model.isPinned ? `Pinned Model` : `ID: ${model.id}`,
        icon: model.id.includes('imagen') ? 'image' : (model.isPinned ? 'pin' : 'bot'),
        action: () => {
          onSelectModel(model.id);
          setInputText('');
          onMessageSent();
        },
      }));
  
      setSlashCommandState({
        isOpen: modelCommands.length > 0 || !keyword.trim(),
        query: 'model',
        filteredCommands: modelCommands,
        selectedIndex: 0,
      });
    } else {
      const query = commandPart.substring(1).toLowerCase();
      const filtered = commands.filter(cmd => cmd.name.toLowerCase().startsWith(query));
      setSlashCommandState({
        isOpen: filtered.length > 0 && !value.includes(' '),
        query: query,
        filteredCommands: filtered,
        selectedIndex: 0,
      });
    }
  }, [availableModels, commands, onMessageSent, onSelectModel, resetSlashCommandState, setInputText]);
  
  const handleSlashCommandExecution = useCallback((text: string) => {
    const exactCommandMatch = text.match(/^\/(\S+)$/);
    if (exactCommandMatch) {
      const commandName = exactCommandMatch[1].toLowerCase();
      const command = commands.find(cmd => cmd.name === commandName);
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

    const model = availableModels.find(m => m.name.toLowerCase().includes(keyword));
    if (!model) {
      return false;
    }

    onSelectModel(model.id);
    setInputText('');
    onMessageSent();
    resetSlashCommandState();
    return true;
  }, [availableModels, commands, handleCommandSelect, onMessageSent, onSelectModel, resetSlashCommandState, setInputText]);

  return {
    slashCommandState,
    setSlashCommandState,
    allCommandsForHelp,
    handleCommandSelect,
    handleInputChange,
    handleSlashCommandExecution,
  };
};
