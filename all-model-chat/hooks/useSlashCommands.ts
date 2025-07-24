import { useState, useMemo, useCallback } from 'react';
import { Command } from '../components/chat/input/SlashCommandMenu';
import { translations } from '../utils/appUtils';
import { ModelOption } from '../types';

interface UseSlashCommandsProps {
  t: (key: keyof typeof translations) => string;
  onToggleGoogleSearch: () => void;
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
}

export const useSlashCommands = ({
  t,
  onToggleGoogleSearch, onToggleCodeExecution, onToggleUrlContext,
  onClearChat, onNewChat, onOpenSettings, onToggleCanvasPrompt,
  onTogglePinCurrentSession, onRetryLastTurn, onStopGenerating, onAttachmentAction,
  availableModels, onSelectModel, onMessageSent, setIsHelpModalOpen,
  textareaRef,
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
    { name: 'model', description: t('help_cmd_model'), icon: 'bot', action: (setInputText: (text: string) => void) => {
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
    { name: 'pin', description: t('help_cmd_pin'), icon: 'pin', action: onTogglePinCurrentSession },
    { name: 'retry', description: t('help_cmd_retry'), icon: 'retry', action: onRetryLastTurn },
    { name: 'stop', description: t('help_cmd_stop'), icon: 'stop', action: onStopGenerating },
    { name: 'search', description: t('help_cmd_search'), icon: 'search', action: onToggleGoogleSearch },
    { name: 'code', description: t('help_cmd_code'), icon: 'code', action: onToggleCodeExecution },
    { name: 'url', description: t('help_cmd_url'), icon: 'url', action: onToggleUrlContext },
    { name: 'file', description: t('help_cmd_file'), icon: 'file', action: () => onAttachmentAction('upload') },
    { name: 'clear', description: t('help_cmd_clear'), icon: 'clear', action: onClearChat },
    { name: 'new', description: t('help_cmd_new'), icon: 'new', action: onNewChat },
    { name: 'settings', description: t('help_cmd_settings'), icon: 'settings', action: onOpenSettings },
    { name: 'canvas', description: t('help_cmd_canvas'), icon: 'canvas', action: onToggleCanvasPrompt },
  ], [t, onToggleGoogleSearch, onToggleCodeExecution, onToggleUrlContext, onClearChat, onNewChat, onOpenSettings, onToggleCanvasPrompt, onTogglePinCurrentSession, onRetryLastTurn, onStopGenerating, onAttachmentAction, textareaRef, setIsHelpModalOpen]);
  
  const allCommandsForHelp = useMemo(() => [
    ...commands.map(c => ({ name: `/${c.name}`, description: c.description })),
  ], [commands]);

  const handleCommandSelect = useCallback((command: Command, setInputText: (text: string) => void) => {
    if (!command) return;
    
    // The model command is special as it modifies the input text
    if (command.name === 'model') {
        command.action(setInputText);
    } else {
        command.action();
    }
    
    setSlashCommandState({ isOpen: false, query: '', filteredCommands: [], selectedIndex: 0 });
    
    if (command.name !== 'model') {
        setInputText('');
        onMessageSent();
    }
  }, [onMessageSent]);
  
  const handleInputChange = (value: string, setInputText: (text: string) => void) => {
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
  
  const handleSlashCommandExecution = (text: string, setInputText: (text: string) => void) => {
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
        command.action(setInputText);
        setInputText('');
        onMessageSent();
    }
  };

  return {
    slashCommandState,
    setSlashCommandState,
    allCommandsForHelp,
    handleCommandSelect: (cmd: Command) => handleCommandSelect(cmd, () => {}), // Partial application for JSX
    handleInputChange,
    handleSlashCommandExecution,
  };
};