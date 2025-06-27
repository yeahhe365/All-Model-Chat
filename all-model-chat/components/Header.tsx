import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { Settings, ChevronDown, Check, Loader2, Trash2, Pin, MessagesSquare, Menu, FilePlus2, Wand2 } from 'lucide-react'; 
import { ModelOption } from '../types';
import { translations } from '../utils/appUtils';

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
  isSwitchingModel: boolean;
  isHistorySidebarOpen: boolean;
  onLoadCanvasPrompt: () => void;
  isCanvasPromptActive: boolean; // New prop for canvas prompt status
  t: (key: keyof typeof translations) => string;
}

const MOBILE_BREAKPOINT = 640; // Tailwind's sm breakpoint

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
  isSwitchingModel,
  isHistorySidebarOpen,
  onLoadCanvasPrompt,
  isCanvasPromptActive, // Destructure new prop
  t,
}) => {
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  const modelSelectorRef = useRef<HTMLDivElement>(null);
  const [newChatShortcut, setNewChatShortcut] = useState('');
  
  const [isModelNameOverflowing, setIsModelNameOverflowing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentWrapperRef = useRef<HTMLDivElement>(null);
  const singleInstanceRef = useRef<HTMLSpanElement>(null);

  const displayModelName = isModelsLoading && !currentModelName ? "Loading models..." : currentModelName;

  useLayoutEffect(() => {
    const container = containerRef.current;
    const singleInstance = singleInstanceRef.current;
    const contentWrapper = contentWrapperRef.current;

    if (container && singleInstance && contentWrapper) {
        const isOverflowing = singleInstance.scrollWidth > container.clientWidth;
        
        if (isOverflowing !== isModelNameOverflowing) {
            setIsModelNameOverflowing(isOverflowing);
        }
        
        if (isOverflowing) {
            // pl-4 is 1rem = 16px
            const scrollAmount = singleInstance.scrollWidth + 16;
            contentWrapper.style.setProperty('--marquee-scroll-amount', `-${scrollAmount}px`);
        }
    }
  }, [displayModelName, isModelNameOverflowing]);

  useEffect(() => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    setNewChatShortcut(`${isMac ? 'Cmd' : 'Ctrl'} + Alt + N`);
  }, []);

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

  const canvasPromptButtonBaseClasses = "p-2 sm:p-2.5 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)] focus:ring-opacity-50 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-100";
  const canvasPromptButtonActiveClasses = `bg-[var(--theme-bg-accent)] text-[var(--theme-text-accent)] hover:bg-[var(--theme-bg-accent-hover)] shadow-premium`;
  const canvasPromptButtonInactiveClasses = `bg-[var(--theme-bg-tertiary)] text-[var(--theme-icon-settings)] hover:bg-[var(--theme-bg-input)]`;

  const canvasPromptAriaLabel = isCanvasPromptActive 
    ? "Canvas Helper system prompt is active. Click to remove." 
    : "Load Canvas Helper system prompt and save settings";
  const canvasPromptTitle = isCanvasPromptActive 
    ? "Canvas Helper prompt is active. Click to remove." 
    : "Load Canvas Helper Prompt and save";


  return (
    <header className="bg-[var(--theme-bg-primary)] p-2 shadow-premium flex items-center justify-between flex-wrap gap-2 border-b border-[var(--theme-border-primary)] flex-shrink-0">
      <div className="flex items-center gap-2">
        <button
            onClick={onToggleHistorySidebar}
            className="p-1.5 sm:p-2 text-[var(--theme-icon-history)] hover:bg-[var(--theme-bg-tertiary)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)] transition-transform hover:scale-110 active:scale-105"
            aria-label={isHistorySidebarOpen ? "Close history sidebar" : "Open history sidebar"}
            title={isHistorySidebarOpen ? "Close History" : "Open History"}
        >
            <Menu size={window.innerWidth < MOBILE_BREAKPOINT ? 18 : 20} />
        </button>
        <div className="flex flex-col">
          <h1 className="text-base sm:text-lg font-bold text-[var(--theme-text-link)] whitespace-nowrap">{t('headerTitle')}</h1>
          
          <div className="relative mt-0.5" ref={modelSelectorRef}>
            <button
              onClick={() => setIsModelSelectorOpen(!isModelSelectorOpen)}
              disabled={isModelsLoading || isLoading || isSwitchingModel}
              className={`w-[6.6rem] sm:w-[7.8rem] md:w-[9rem] text-xs bg-[var(--theme-bg-tertiary)] hover:bg-[var(--theme-bg-input)] px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md self-start flex items-center justify-between gap-1 focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)] disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-200 active:scale-95 ${isSwitchingModel ? 'animate-pulse' : ''}`}
              title={`Current Model: ${displayModelName}. Click to change.`}
              aria-label={`Current AI Model: ${displayModelName}. Click to change model.`}
              aria-haspopup="listbox"
              aria-expanded={isModelSelectorOpen}
            >
               <div ref={containerRef} className="flex-1 overflow-hidden">
                    <div ref={contentWrapperRef} className={`flex w-max items-center ${isModelNameOverflowing ? 'horizontal-scroll-marquee' : ''}`}>
                        <span ref={singleInstanceRef} className="flex items-center gap-1 whitespace-nowrap">
                            {isModelsLoading && !currentModelName ? <Loader2 size={12} className="animate-spin mr-1 text-[var(--theme-text-link)] flex-shrink-0" /> : null}
                            <span>{displayModelName}</span>
                        </span>
                        {isModelNameOverflowing && (
                            <span className="flex items-center gap-1 whitespace-nowrap pl-4">
                                {isModelsLoading && !currentModelName ? <Loader2 size={12} className="animate-spin mr-1 text-[var(--theme-text-link)] flex-shrink-0" /> : null}
                                <span>{displayModelName}</span>
                            </span>
                        )}
                    </div>
                </div>
              <ChevronDown size={12} className={`transition-transform duration-200 flex-shrink-0 ${isModelSelectorOpen ? 'rotate-180' : ''}`} />
            </button>

            {isModelSelectorOpen && (
              <div 
                className="absolute top-full left-0 mt-1 w-60 sm:w-72 bg-[var(--theme-bg-secondary)]/80 backdrop-blur-md border border-[var(--theme-border-primary)] rounded-md shadow-2xl z-20 max-h-60 overflow-y-auto custom-scrollbar shadow-premium"
                role="listbox"
                aria-labelledby="model-selector-button" 
              >
                {isModelsLoading ? (
                  <div>
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="px-3 py-2 flex items-center gap-2 animate-pulse">
                        <div className="h-4 w-4 bg-[var(--theme-bg-tertiary)] rounded-full"></div>
                        <div className="h-4 flex-grow bg-[var(--theme-bg-tertiary)] rounded"></div>
                      </div>
                    ))}
                  </div>
                ) : availableModels.length > 0 ? (
                  availableModels.map(model => (
                    <button
                      key={model.id}
                      onClick={() => handleModelSelect(model.id)}
                      role="option"
                      aria-selected={model.id === selectedModelId}
                      className={`w-full text-left px-3 py-2 text-xs sm:text-sm flex items-center justify-between hover:bg-[var(--theme-bg-tertiary)] transition-colors
                        ${model.id === selectedModelId ? 'text-[var(--theme-text-link)]' : 'text-[var(--theme-text-primary)]'}`
                      }
                    >
                      <div className="flex items-center gap-2">
                        {model.isPinned && (
                          <Pin size={12} className="text-[var(--theme-text-tertiary)] flex-shrink-0" />
                        )}
                        <span className="truncate" title={model.name}>{model.name}</span>
                      </div>
                      {model.id === selectedModelId && <Check size={14} className="text-[var(--theme-text-link)] flex-shrink-0" />}
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-2 text-xs sm:text-sm text-[var(--theme-text-tertiary)]">No models available.</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
        <button
          onClick={onLoadCanvasPrompt}
          disabled={isLoading}
          className={`${canvasPromptButtonBaseClasses} ${isCanvasPromptActive ? canvasPromptButtonActiveClasses : canvasPromptButtonInactiveClasses}`}
          aria-label={canvasPromptAriaLabel}
          title={canvasPromptTitle}
        >
          <Wand2 size={window.innerWidth < MOBILE_BREAKPOINT ? 16 : 18} />
        </button>
        <button
          onClick={onOpenScenariosModal}
          className="p-2 sm:p-2.5 bg-[var(--theme-bg-tertiary)] hover:bg-[var(--theme-bg-input)] text-[var(--theme-icon-settings)] rounded-lg shadow transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)] focus:ring-opacity-50 flex items-center justify-center hover:scale-105 active:scale-100"
          aria-label="Manage Preloaded Scenarios"
          title="Manage Scenarios"
        >
          <MessagesSquare size={window.innerWidth < MOBILE_BREAKPOINT ? 16 : 18} />
        </button>
        <button
          onClick={onOpenSettingsModal} 
          className="p-2 sm:p-2.5 bg-[var(--theme-bg-tertiary)] hover:bg-[var(--theme-bg-input)] text-[var(--theme-icon-settings)] rounded-lg shadow transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)] focus:ring-opacity-50 flex items-center justify-center hover:scale-105 active:scale-100"
          aria-label="Open Chat Settings"
          title="Chat Settings"
        >
          <Settings size={window.innerWidth < MOBILE_BREAKPOINT ? 16 : 18} />
        </button>
        
        <button
          onClick={onNewChat}
          className="p-2.5 sm:p-3 bg-[var(--theme-bg-accent)] hover:bg-[var(--theme-bg-accent-hover)] text-[var(--theme-icon-clear-chat)] rounded-lg shadow-premium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--theme-bg-accent)] focus:ring-opacity-50 flex items-center justify-center hover:scale-105 active:scale-100"
          aria-label="Start a new chat session"
          title={`${t('headerNewChat')} (${newChatShortcut})`}
        >
          <FilePlus2 size={window.innerWidth < MOBILE_BREAKPOINT ? 14 : 16} />
        </button>
      </div>
    </header>
  );
};