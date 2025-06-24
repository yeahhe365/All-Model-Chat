
import React, { useState, useEffect, useRef } from 'react';
import { Settings, ChevronDown, Check, Loader2, Trash2, Pin, MessagesSquare, Menu, FilePlus2, Wand2 } from 'lucide-react'; 
import { ModelOption } from '../types';

interface HeaderProps {
  onNewChat: () => void; // Changed from onClearChat
  onOpenSettingsModal: () => void; 
  onOpenScenariosModal: () => void; 
  onToggleHistorySidebar: () => void;
  isLoading: boolean;
  currentModelName?: string;
  availableModels: ModelOption[];
  selectedModelId: string;
  onSelectModel: (modelId: string) => void;
  isModelsLoading: boolean; 
  isStreamingEnabled: boolean;
  onToggleStreaming: () => void;
  isHistorySidebarOpen: boolean;
  onLoadCanvasPrompt: () => void;
  isCanvasPromptActive: boolean; // New prop for canvas prompt status
}

export const Header: React.FC<HeaderProps> = ({
  onNewChat,
  onOpenSettingsModal, 
  onOpenScenariosModal,
  onToggleHistorySidebar,
  isLoading,
  currentModelName,
  availableModels,
  selectedModelId,
  onSelectModel,
  isModelsLoading,
  isStreamingEnabled,
  onToggleStreaming,
  isHistorySidebarOpen,
  onLoadCanvasPrompt,
  isCanvasPromptActive, // Destructure new prop
}) => {
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  const modelSelectorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modelSelectorRef.current && !modelSelectorRef.current.contains(event.target as Node)) {
        setIsModelSelectorOpen(false);
      }
    };
    if (isModelSelectorOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isModelSelectorOpen]);

  const handleModelSelect = (modelId: string) => {
    onSelectModel(modelId);
    setIsModelSelectorOpen(false);
  };

  const displayModelName = isModelsLoading && !currentModelName ? "Loading models..." : currentModelName;

  const canvasPromptButtonBaseClasses = "p-2.5 rounded-lg shadow transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)] focus:ring-opacity-50 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed";
  const canvasPromptButtonActiveClasses = `bg-[var(--theme-bg-accent)] text-[var(--theme-text-accent)] hover:bg-[var(--theme-bg-accent-hover)]`;
  const canvasPromptButtonInactiveClasses = `bg-[var(--theme-bg-tertiary)] text-[var(--theme-icon-settings)] hover:bg-[var(--theme-bg-input)]`;

  const canvasPromptAriaLabel = isCanvasPromptActive 
    ? "Canvas Helper system prompt is active. Click to remove." 
    : "Load Canvas Helper system prompt and save settings";
  const canvasPromptTitle = isCanvasPromptActive 
    ? "Canvas Helper prompt is active. Click to remove." 
    : "Load Canvas Helper Prompt and save";


  return (
    <header className="bg-[var(--theme-bg-primary)] p-3 sm:p-4 shadow-lg flex items-center justify-between flex-wrap gap-3 border-b border-[var(--theme-border-primary)] flex-shrink-0">
      <div className="flex items-center gap-2 sm:gap-3">
        <button
            onClick={onToggleHistorySidebar}
            className="p-2 text-[var(--theme-icon-history)] hover:bg-[var(--theme-bg-tertiary)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)]"
            aria-label={isHistorySidebarOpen ? "Close history sidebar" : "Open history sidebar"}
            title={isHistorySidebarOpen ? "Close History" : "Open History"}
        >
            <Menu size={20} />
        </button>
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--theme-text-link)] whitespace-nowrap">All Model Chat</h1>
          
          <div className="relative" ref={modelSelectorRef}>
            <button
              onClick={() => setIsModelSelectorOpen(!isModelSelectorOpen)}
              disabled={isModelsLoading || isLoading}
              className="text-xs sm:text-sm text-[var(--theme-text-secondary)] bg-[var(--theme-bg-tertiary)] hover:bg-[var(--theme-bg-input)] px-2 py-1 rounded-md self-start sm:self-center whitespace-nowrap flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)] disabled:opacity-70 disabled:cursor-not-allowed"
              title={`Current Model: ${displayModelName}. Click to change.`}
              aria-label={`Current AI Model: ${displayModelName}. Click to change model.`}
              aria-haspopup="listbox"
              aria-expanded={isModelSelectorOpen}
            >
              {isModelsLoading && !currentModelName ? <Loader2 size={14} className="animate-spin mr-1 text-[var(--theme-text-link)]" /> : null}
              <span className="truncate max-w-[120px] sm:max-w-[180px]">{displayModelName}</span>
              <ChevronDown size={14} className={`transition-transform duration-200 ${isModelSelectorOpen ? 'rotate-180' : ''}`} />
            </button>

            {isModelSelectorOpen && (
              <div 
                className="absolute top-full left-0 mt-1 w-64 sm:w-72 bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-primary)] rounded-md shadow-2xl z-20 max-h-60 overflow-y-auto"
                role="listbox"
                aria-labelledby="model-selector-button" 
              >
                {availableModels.length > 0 ? (
                  availableModels.map(model => (
                    <button
                      key={model.id}
                      onClick={() => handleModelSelect(model.id)}
                      role="option"
                      aria-selected={model.id === selectedModelId}
                      className={`w-full text-left px-3 py-2.5 text-sm flex items-center justify-between hover:bg-[var(--theme-bg-tertiary)] transition-colors
                        ${model.id === selectedModelId ? 'text-[var(--theme-text-link)]' : 'text-[var(--theme-text-primary)]'}`
                      }
                    >
                      <div className="flex items-center gap-2">
                        {model.isPinned && (
                          <Pin size={14} className="text-[var(--theme-text-tertiary)] flex-shrink-0" />
                        )}
                        <span className="truncate" title={model.name}>{model.name}</span>
                      </div>
                      {model.id === selectedModelId && <Check size={16} className="text-[var(--theme-text-link)] flex-shrink-0" />}
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-2.5 text-sm text-[var(--theme-text-tertiary)]">No models available.</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
        <label htmlFor="streaming-toggle-header" className="flex items-center cursor-pointer select-none py-2 px-1 sm:px-2 rounded-lg hover:bg-[var(--theme-bg-input)] transition-colors" title={isStreamingEnabled ? "Streaming enabled" : "Streaming disabled"}>
            <span className="mr-1.5 sm:mr-2 text-xs sm:text-sm text-[var(--theme-text-secondary)]">Stream</span>
            <div className="relative">
                <input
                id="streaming-toggle-header"
                type="checkbox"
                className="sr-only peer"
                checked={isStreamingEnabled}
                onChange={onToggleStreaming}
                disabled={isLoading}
                />
                <div className="w-10 h-5 bg-[var(--theme-bg-input)] rounded-full shadow-inner peer-checked:bg-[var(--theme-bg-accent)] transition-colors duration-200 ease-in-out peer-disabled:opacity-50"></div>
                <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-200 ease-in-out peer-checked:translate-x-[calc(1.25rem-2px)] peer-disabled:opacity-70"></div>
            </div>
        </label>
        <button
          onClick={onLoadCanvasPrompt}
          disabled={isLoading}
          className={`${canvasPromptButtonBaseClasses} ${isCanvasPromptActive ? canvasPromptButtonActiveClasses : canvasPromptButtonInactiveClasses}`}
          aria-label={canvasPromptAriaLabel}
          title={canvasPromptTitle}
        >
          <Wand2 size={18} />
        </button>
        <button
          onClick={onOpenScenariosModal}
          className="p-2.5 bg-[var(--theme-bg-tertiary)] hover:bg-[var(--theme-bg-input)] text-[var(--theme-icon-settings)] rounded-lg shadow transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)] focus:ring-opacity-50 flex items-center justify-center"
          aria-label="Manage Preloaded Scenarios"
          title="Manage Scenarios"
        >
          <MessagesSquare size={18} />
        </button>
        <button
          onClick={onOpenSettingsModal} 
          className="p-2.5 bg-[var(--theme-bg-tertiary)] hover:bg-[var(--theme-bg-input)] text-[var(--theme-icon-settings)] rounded-lg shadow transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)] focus:ring-opacity-50 flex items-center justify-center"
          aria-label="Open Chat Settings"
          title="Chat Settings"
        >
          <Settings size={18} />
        </button>
        
        <button
          onClick={onNewChat} // Changed from onClearChat
          className="p-3 bg-[var(--theme-bg-accent)] hover:bg-[var(--theme-bg-accent-hover)] text-[var(--theme-icon-clear-chat)] rounded-lg shadow transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-bg-accent)] focus:ring-opacity-50 flex items-center justify-center"
          aria-label="Start a new chat session" // Updated aria-label
          title="New Chat" // Updated title
        >
          <FilePlus2 size={16} /> {/* Changed icon from Trash2 */}
        </button>
      </div>
    </header>
  );
};
