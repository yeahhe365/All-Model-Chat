
import React, { useState, useMemo, useCallback, Dispatch, SetStateAction } from 'react';
import { Command } from '../components/chat/input/SlashCommandMenu';
import { translations } from '../utils/appUtils';
import { ModelOption } from '../types';

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
  onStopGenerating: () => void;
  onAttachmentAction: (action: any) => void;
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

export const useSlashCommands = ({
  t,
  onToggleGoogleSearch, onToggleDeepSearch, onToggleCodeExecution, onToggleUrlContext,
  onClearChat, onNewChat, onOpenSettings, onToggleCanvasPrompt,
  onTogglePinCurrentSession, onRetryLastTurn, onStopGenerating, onAttachmentAction,
  availableModels, onSelectModel, onMessageSent, setIsHelpModalOpen,
  textareaRef, onEditLastUserMessage, onTogglePip, setInputText,
  currentModelId, onSetThinkingLevel, thinkingLevel
}: UseSlashCommandsProps) => {
  
  const [slashCommandState, setSlashCommandState] = useState<{
    isOpen: boolean;
    query: string;
    filteredCommands: Command[];
    selectedIndex: number;
  }>({
    isOpen: false,
    query: '',
    filteredCommands: [],
    selectedIndex: 0,
  });

  const commands = useMemo<Command[]>(() => [
    { name: 'model', description: t('help_cmd_model'), icon: 'bot', action: () => {
        setInputText('/model ');
        setTimeout(() => {
            const textarea = textareaRef.current;
            if (textarea) {
                textarea.focus();
                const textLength = textarea.value.length;
                textarea.setSelectionRange(textLength, textLength);
            }
        }, 0);
    } },
    { name: 'help', description: t('help_cmd_help'), icon: 'help', action: () => setIsHelpModalOpen(true) },
    { name: 'edit', description: t('help_cmd_edit'), icon: 'edit', action: onEditLastUserMessage },
    { name: 'pin', description: t('help_cmd_pin'), icon: 'pin', action: onTogglePinCurrentSession },
    { name: 'retry', description: t('help_cmd_retry'), icon: 'retry', action: onRetryLastTurn },
    { name: 'online', description: t('help_cmd_search'), icon: 'search', action: onToggleGoogleSearch },
    { name: 'deep', description: t('help_cmd_deep'), icon: 'deep', action: onToggleDeepSearch },
    { name: 'code', description: t('help_cmd_code'), icon: 'code', action: onToggleCodeExecution },
    { name: 'url', description: t('help_cmd_url'), icon: 'url', action: onToggleUrlContext },
    { name: 'file', description: t('help_cmd_file'), icon: 'file', action: () => onAttachmentAction('upload') },
    { name: 'clear', description: t('help_cmd_clear'), icon: 'clear', action: onClearChat },
    { name: 'new', description: t('help_cmd_new'), icon: 'new', action: onNewChat },
    { name: 'settings', description: t('help_cmd_settings'), icon: 'settings', action: onOpenSettings },
    { name: 'canvas', description: t('help_cmd_canvas'), icon: 'canvas', action: onToggleCanvasPrompt },
    { name: 'pip', description: t('help_cmd_pip'), icon: 'pip', action: onTogglePip },
    { name: 'fast', description: t('help_cmd_fast'), icon: 'fast', action: () => {
        const isGemini3Flash = currentModelId.includes('gemini-3') && currentModelId.includes('flash');
        const targetLevel = isGemini3Flash ? 'MINIMAL' : 'LOW';
        onSetThinkingLevel(thinkingLevel === targetLevel ? 'HIGH' : targetLevel);
    }},
  ], [t, onToggleGoogleSearch, onToggleDeepSearch, onToggleCodeExecution, onToggleUrlContext, onClearChat, onNewChat, onOpenSettings, onToggleCanvasPrompt, onTogglePinCurrentSession, onRetryLastTurn, onStopGenerating, onAttachmentAction, setInputText, textareaRef, setIsHelpModalOpen, onEditLastUserMessage, onTogglePip, onSetThinkingLevel, thinkingLevel, currentModelId]);
  
  const allCommandsForHelp = useMemo(() => [
    ...commands.map(c => ({ name: `/${c.name}`, description: c.description, icon: c.icon })),
  ], [commands]);

  const handleCommandSelect = useCallback((command: Command) => {
    if (!command) return;
    
    // Execute the command action immediately
    command.action();
    
    setSlashCommandState({ isOpen: false, query: '', filteredCommands: [], selectedIndex: 0 });

    const commandsThatPopulateInput = ['model', 'edit'];
    const isDynamicModelCommand = availableModels.some(m => m.name === command.name);

    // If the command is meant to clear the input (i.e. not a template command or dynamic model selection)
    // we explicitly clear the text.
    // Dynamic model commands handle their own clearing in their action definition (see handleInputChange).
    if (!commandsThatPopulateInput.includes(command.name) && !isDynamicModelCommand) {
        // Use setTimeout to ensure the input clear happens after the event loop tick
        // This solves issues where Enter key press might interfere with state updates
        setTimeout(() => {
            setInputText('');
            onMessageSent();
        }, 0);
    }
  }, [onMessageSent, setInputText, availableModels]);
  
  const handleInputChange = (value: string) => {
    setInputText(value);
  
    if (!value.startsWith('/')) {
      setSlashCommandState(prev => ({ ...prev, isOpen: false }));
      return;
    }
  
    const [commandPart, ...args] = value.split(' ');
    const commandName = commandPart.substring(1).toLowerCase();
  
    if (value.endsWith(' ') && value.trim() === `/${commandName}`) {
      const matchedCommand = commands.find(cmd => cmd.name === commandName);
      if (matchedCommand && matchedCommand.name !== 'model') {
        matchedCommand.action();
        setInputText('');
        onMessageSent();
        setSlashCommandState({ isOpen: false, query: '', filteredCommands: [], selectedIndex: 0 });
        return;
      }
    }
  
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
  };
  
  const handleSlashCommandExecution = (text: string) => {
    const [commandWithSlash, ...args] = text.split(' ');
    const keyword = args.join(' ').toLowerCase();
    const commandName = commandWithSlash.substring(1);

    if (commandName === 'model' && keyword) {
        const model = availableModels.find(m => m.name.toLowerCase().includes(keyword));
        if (model) {
            onSelectModel(model.id);
            setInputText('');
            onMessageSent();
        }
        return;
    }

    const command = commands.find(cmd => cmd.name === commandName);
    if (command && !keyword) {
        command.action();
        const commandsThatPopulateInput = ['model', 'edit'];
        if (!commandsThatPopulateInput.includes(command.name)) {
            setInputText('');
            onMessageSent();
        }
    }
  };

  return {
    slashCommandState,
    setSlashCommandState,
    allCommandsForHelp,
    handleCommandSelect,
    handleInputChange,
    handleSlashCommandExecution,
  };
};
