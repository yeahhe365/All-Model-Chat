
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronDown, Check, Loader2, Pin, PanelLeft, Search, X, Wand2, MessageSquareText, PictureInPicture, Settings, PictureInPicture2 } from 'lucide-react'; 
import { ModelOption } from '../types';
import { translations, getResponsiveValue } from '../utils/appUtils';
import { IconNewChat } from './icons/CustomIcons';

interface HeaderProps {
  onNewChat: () => void;
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
  isCanvasPromptActive: boolean;
  t: (key: keyof typeof translations) => string;
  isKeyLocked: boolean;
  defaultModelId: string;
  onSetDefaultModel: (modelId: string) => void;
  isPipSupported: boolean;
  isPipActive: boolean;
  onTogglePip: () => void;
  themeId: string;
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
  isSwitchingModel,
  isHistorySidebarOpen,
  onLoadCanvasPrompt,
  isCanvasPromptActive,
  t,
  isKeyLocked,
  defaultModelId,
  onSetDefaultModel,
  isPipSupported,
  isPipActive,
  onTogglePip,
  themeId,
}) => {
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [modelSearchQuery, setModelSearchQuery] = useState('');
  const modelSelectorRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [newChatShortcut, setNewChatShortcut] = useState('');
  const [pipShortcut, setPipShortcut] = useState('');

  const displayModelName = isModelsLoading && !currentModelName ? t('loading') : currentModelName;

  const abbreviatedModelName = useMemo(() => {
    if (!displayModelName) return '';
    if (displayModelName === t('loading')) return displayModelName;
    
    let name = displayModelName;
    // Remove "Gemini" prefix (case insensitive)
    name = name.replace(/^Gemini\s+/i, '');
    // Remove "Preview" (case insensitive)
    name = name.replace(/\s+Preview/i, '');
    // Remove "Latest" (case insensitive)
    name = name.replace(/\s+Latest/i, '');
    
    return name;
  }, [displayModelName, t]);

  useEffect(() => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modifier = isMac ? 'Cmd' : 'Ctrl';
    setNewChatShortcut(`${modifier} + Alt + N`);
    setPipShortcut(`${modifier} + Alt + P`);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modelSelectorRef.current && !modelSelectorRef.current.contains(event.target as Node)) {
        setIsModelSelectorOpen(false);
      }
    };
    if (isModelSelectorOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Focus search input when opened
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      // Clear search when closed
      const timer = setTimeout(() => {
          setModelSearchQuery('');
          setHighlightedIndex(0);
      }, 200);
      return () => clearTimeout(timer);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isModelSelectorOpen]);

  const handleModelSelect = (modelId: string) => {
    onSelectModel(modelId);
    setIsModelSelectorOpen(false);
  };
  
  const handleSetDefault = (e: React.MouseEvent, modelId: string) => {
      e.stopPropagation();
      onSetDefaultModel(modelId);
      setIsModelSelectorOpen(false);
  }

  const filteredModels = useMemo(() => {
    if (!modelSearchQuery.trim()) return availableModels;
    const query = modelSearchQuery.toLowerCase();
    return availableModels.filter(model => 
      model.name.toLowerCase().includes(query) || 
      model.id.toLowerCase().includes(query)
    );
  }, [availableModels, modelSearchQuery]);

  // Reset highlighted index when search query changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [modelSearchQuery]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isModelSelectorOpen && listRef.current && filteredModels.length > 0) {
      const activeItem = listRef.current.children[highlightedIndex] as HTMLElement;
      if (activeItem) {
        activeItem.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isModelSelectorOpen, filteredModels.length]);

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (filteredModels.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % filteredModels.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 + filteredModels.length) % filteredModels.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selectedModel = filteredModels[highlightedIndex];
      if (selectedModel) {
        handleModelSelect(selectedModel.id);
      }
    }
  };

  // Standardized button styles matching the requested aesthetic (Soft, Rounded, Clean)
  // Added flex-shrink-0 to prevent buttons from being squished on small screens
  const headerButtonBase = "w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--theme-bg-primary)] focus:ring-[var(--theme-border-focus)] hover:shadow-md active:scale-95";
  
  // Default state (Inactive) - Transparent background
  const headerButtonInactive = "bg-transparent text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)] hover:text-[var(--theme-text-primary)]";
  
  // Active State (e.g. Canvas active)
  const headerButtonActive = "bg-[var(--theme-bg-accent)] text-[var(--theme-text-accent)] shadow-premium hover:bg-[var(--theme-bg-accent-hover)]";

  const canvasPromptAriaLabel = isCanvasPromptActive 
    ? t('canvasHelperActive_aria')
    : t('canvasHelperInactive_aria');
  const canvasPromptTitle = isCanvasPromptActive 
    ? t('canvasHelperActive_title')
    : t('canvasHelperInactive_title');

  const iconSize = 20; 
  const strokeWidth = 2; 

  return (
    <header className={`${themeId === 'pearl' ? 'bg-[var(--theme-bg-primary)]' : 'bg-[var(--theme-bg-secondary)]'} p-2 sm:p-3 shadow-premium flex items-center justify-between gap-2 sm:gap-3 flex-shrink-0`}>
      
      {/* Left Section: Navigation & Model Selector */}
      <div className="flex items-center gap-2 min-w-0">
        <button
            onClick={onToggleHistorySidebar}
            className={`${headerButtonBase} ${headerButtonInactive} ${isHistorySidebarOpen ? 'md:hidden' : ''}`}
            aria-label={isHistorySidebarOpen ? t('historySidebarClose') : t('historySidebarOpen')}
            title={isHistorySidebarOpen ? t('historySidebarClose_short') : t('historySidebarOpen_short')}
        >
            <PanelLeft size={iconSize} strokeWidth={strokeWidth} />
        </button>
        
        {!isHistorySidebarOpen && (
          <button
            onClick={onNewChat}
            className={`${headerButtonBase} ${headerButtonInactive} hidden sm:flex`}
            aria-label={t('headerNewChat_aria')}
            title={`${t('newChat')} (${newChatShortcut})`}
          >
            <IconNewChat size={iconSize} strokeWidth={strokeWidth} />
          </button>
        )}

        <div className="relative" ref={modelSelectorRef}>
          <button
            onClick={() => setIsModelSelectorOpen(!isModelSelectorOpen)}
            disabled={isModelsLoading || isLoading || isSwitchingModel}
            className={`h-10 flex items-center gap-2 rounded-xl px-2 sm:px-3 bg-transparent hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-primary)] font-medium text-base transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--theme-bg-primary)] focus:ring-[var(--theme-border-focus)] disabled:opacity-70 disabled:cursor-not-allowed border border-transparent hover:border-[var(--theme-border-secondary)] ${isSwitchingModel ? 'animate-pulse' : ''}`}
            title={`${t('headerModelSelectorTooltip_current')}: ${displayModelName}. ${t('headerModelSelectorTooltip_action')}`}
            aria-label={`${t('headerModelAriaLabel_current')}: ${displayModelName}. ${t('headerModelAriaLabel_action')}`}
            aria-haspopup="listbox"
            aria-expanded={isModelSelectorOpen}
          >
            {isModelsLoading && !currentModelName && <Loader2 size={16} className="animate-spin text-[var(--theme-text-link)]" />}
            <span className="truncate max-w-[120px] sm:max-w-[240px] lg:hidden">{abbreviatedModelName}</span>
            <span className="hidden lg:block truncate max-w-[400px]">{displayModelName}</span>
            <ChevronDown size={16} className="opacity-50 flex-shrink-0" />
          </button>

          {isModelSelectorOpen && (
            <div 
              className="fixed top-14 left-2 right-2 w-auto sm:absolute sm:top-full sm:left-0 sm:right-auto sm:w-96 bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-primary)] rounded-xl shadow-premium z-50 flex flex-col modal-enter-animation overflow-hidden"
            >
              <div className="px-3 py-2 border-b border-[var(--theme-border-secondary)] sticky top-0 bg-[var(--theme-bg-secondary)] z-10">
                  <div className="flex items-center gap-2 bg-[var(--theme-bg-input)] border border-[var(--theme-border-secondary)] rounded-lg px-2 py-1.5 focus-within:ring-2 focus-within:ring-[var(--theme-border-focus)]">
                      <Search size={16} className="text-[var(--theme-text-tertiary)]" />
                      <input 
                          ref={searchInputRef}
                          type="text"
                          className="flex-1 bg-transparent border-none outline-none text-base text-[var(--theme-text-primary)] placeholder-[var(--theme-text-tertiary)] min-w-0"
                          placeholder={t('header_model_search_placeholder' as any) || "Search models..."}
                          value={modelSearchQuery}
                          onChange={(e) => setModelSearchQuery(e.target.value)}
                          onKeyDown={handleSearchKeyDown}
                          onClick={(e) => e.stopPropagation()}
                          autoComplete="off"
                      />
                      {modelSearchQuery && (
                          <button onClick={(e) => { e.stopPropagation(); setModelSearchQuery(''); searchInputRef.current?.focus(); }} className="text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)]">
                              <X size={14} />
                          </button>
                      )}
                  </div>
              </div>

              <div 
                ref={listRef}
                className="max-h-96 overflow-y-auto custom-scrollbar" 
                role="listbox" 
                aria-labelledby="model-selector-button"
              >
                {isModelsLoading ? (
                  <div>
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="px-4 py-2.5 flex items-center gap-2 animate-pulse">
                        <div className="h-5 w-5 bg-[var(--theme-bg-tertiary)] rounded-full"></div>
                        <div className="h-5 flex-grow bg-[var(--theme-bg-tertiary)] rounded"></div>
                      </div>
                    ))}
                  </div>
                ) : filteredModels.length > 0 ? (
                  filteredModels.map((model, index) => (
                    <div
                      key={model.id}
                      onClick={() => handleModelSelect(model.id)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      role="option"
                      aria-selected={index === highlightedIndex}
                      className={`cursor-pointer w-full text-left px-4 py-2.5 text-base transition-colors
                        ${index === highlightedIndex ? 'bg-[var(--theme-bg-tertiary)]' : ''}
                        ${model.id === selectedModelId ? 'bg-[var(--theme-bg-tertiary)]/50' : ''}
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          {model.isPinned && (
                            <Pin size={14} className="text-[var(--theme-text-tertiary)] flex-shrink-0" strokeWidth={1.5} />
                          )}
                          <span className={`truncate ${model.id === selectedModelId ? 'text-[var(--theme-text-link)] font-semibold' : 'text-[var(--theme-text-primary)]'}`} title={model.name}>
                            {model.name}
                          </span>
                        </div>
                        {model.id === selectedModelId && <Check size={16} className="text-[var(--theme-text-link)] flex-shrink-0" strokeWidth={2} />}
                      </div>
                      
                      {model.id === defaultModelId ? (
                        <div className="mt-2 pl-1 text-xs text-[var(--theme-text-success)] flex items-center gap-1.5 cursor-default" onClick={(e) => e.stopPropagation()}>
                            <Check size={14} strokeWidth={1.5} />
                            <span>{t('header_setDefault_isDefault')}</span>
                        </div>
                      ) : index === highlightedIndex ? (
                          <div className="mt-2 pl-1" style={{ animation: `fadeInUp 0.3s ease-out both` }}>
                              <button
                                  onClick={(e) => handleSetDefault(e, model.id)}
                                  className="text-xs text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] flex items-center gap-1.5 focus:outline-none"
                                  tabIndex={-1}
                              >
                                  <span>{t('header_setDefault_action')}</span>
                              </button>
                          </div>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-8 text-center text-sm text-[var(--theme-text-tertiary)] flex flex-col items-center justify-center gap-2">
                      <Search size={24} className="opacity-50" />
                      <p>{modelSearchQuery ? "No matching models found" : t('headerModelSelectorNoModels')}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Section: Action Buttons (Redesigned) */}
      <div className="flex items-center gap-1 sm:gap-2.5 justify-end flex-shrink-0">
        
        {/* 1. Canvas Helper Button (Arc/Wand) */}
        <button
          onClick={onLoadCanvasPrompt}
          disabled={isLoading}
          className={`${headerButtonBase} ${isCanvasPromptActive ? headerButtonActive : headerButtonInactive}`}
          aria-label={canvasPromptAriaLabel}
          title={canvasPromptTitle}
        >
          <Wand2 size={iconSize} strokeWidth={strokeWidth} />
        </button>

        {/* 2. Scenarios Button (Chat Bubbles) */}
        <button
          onClick={onOpenScenariosModal}
          className={`${headerButtonBase} ${headerButtonInactive}`}
          aria-label={t('scenariosManage_aria')}
          title={t('scenariosManage_title')}
        >
          <MessageSquareText size={iconSize} strokeWidth={strokeWidth} />
        </button>

        {/* 3. PiP Button (Expand) */}
        {isPipSupported && (
            <button
              onClick={onTogglePip}
              className={`${headerButtonBase} ${headerButtonInactive}`}
              aria-label={isPipActive ? 'Exit Picture-in-Picture' : 'Enter Picture-in-Picture'}
              title={`${isPipActive ? 'Exit Picture-in-Picture' : 'Enter Picture-in-Picture'} (${pipShortcut})`}
            >
              {isPipActive ? <PictureInPicture2 size={iconSize} strokeWidth={strokeWidth} /> : <PictureInPicture size={iconSize} strokeWidth={strokeWidth} />}
            </button>
        )}

        {/* 4. Settings Button (Gear) */}
        <button
          onClick={onOpenSettingsModal} 
          className={`${headerButtonBase} ${headerButtonInactive}`}
          aria-label={t('settingsOpen_aria')}
          title={t('settingsOpen_title')}
        >
          <Settings size={iconSize} strokeWidth={strokeWidth} />
        </button>
      </div>
    </header>
  );
};
