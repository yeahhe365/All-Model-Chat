
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronDown, Check, Loader2, Search, X, Wand2, MessageSquareText, PictureInPicture, PictureInPicture2, Volume2, Image as ImageIcon, Sparkles, Box } from 'lucide-react'; 
import { ModelOption } from '../types';
import { translations } from '../utils/appUtils';
import { IconNewChat, IconSidebarToggle } from './icons/CustomIcons';

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
    let models = availableModels;
    if (modelSearchQuery.trim()) {
        const query = modelSearchQuery.toLowerCase();
        models = models.filter(model => 
          model.name.toLowerCase().includes(query) || 
          model.id.toLowerCase().includes(query)
        );
    }

    const getCategoryWeight = (id: string) => {
        const lower = id.toLowerCase();
        if (lower.includes('tts')) return 3; // TTS last
        if (lower.includes('imagen') || lower.includes('image')) return 2; // Image middle
        return 1; // Text first
    };

    // Explicitly sort: Pinned first, then by Category (for pinned), then alphabetical
    return [...models].sort((a, b) => {
        // 1. Pinned vs Unpinned
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;

        // 2. If both are pinned, sort by Category
        if (a.isPinned && b.isPinned) {
            // Force Gemini 3 Pro to top
            const isA3 = a.id.includes('gemini-3');
            const isB3 = b.id.includes('gemini-3');
            if (isA3 && !isB3) return -1;
            if (!isA3 && isB3) return 1;

            const weightA = getCategoryWeight(a.id);
            const weightB = getCategoryWeight(b.id);
            if (weightA !== weightB) {
                return weightA - weightB;
            }
        }

        // 3. Alphabetical fallback
        return a.name.localeCompare(b.name);
    });
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

  const getModelIcon = (model: ModelOption | undefined) => {
      if (!model) return <Box size={15} className="text-[var(--theme-text-tertiary)]" strokeWidth={1.5} />;
      
      const { id, isPinned } = model;
      const lowerId = id.toLowerCase();
      
      // 1. TTS Models (Purple)
      if (lowerId.includes('tts')) {
          return <Volume2 size={15} className="text-purple-500 dark:text-purple-400 flex-shrink-0" strokeWidth={1.5} />;
      }
      
      // 2. Image Models (Rose/Red)
      if (lowerId.includes('imagen') || lowerId.includes('image-')) {
          return <ImageIcon size={15} className="text-rose-500 dark:text-rose-400 flex-shrink-0" strokeWidth={1.5} />;
      }
      
      // 3. Pinned Text Models (Sky Blue Sparkles)
      if (isPinned) {
          return <Sparkles size={15} className="text-sky-500 dark:text-sky-400 flex-shrink-0" strokeWidth={1.5} />;
      }
      
      // 4. Unpinned/Generic Models (Gray Box)
      return <Box size={15} className="text-[var(--theme-text-tertiary)] opacity-70 flex-shrink-0" strokeWidth={1.5} />;
  };

  // Enhanced button styles for better tactile feedback
  // Uses a bouncy ease-out curve for hover and a quick snap for active clicks
  const headerButtonBase = "w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl transition-all duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--theme-bg-primary)] focus:ring-[var(--theme-border-focus)] hover:scale-110 active:scale-90 active:duration-75";
  
  // Default state (Inactive) - Transparent background, maintains background on active press
  const headerButtonInactive = "bg-transparent text-[var(--theme-icon-settings)] hover:bg-[var(--theme-bg-tertiary)] hover:text-[var(--theme-text-primary)] active:bg-[var(--theme-bg-tertiary)] active:text-[var(--theme-text-primary)]";
  
  // Active State (e.g. Canvas active) - Deep press effect without shadow
  const headerButtonActive = "bg-[var(--theme-bg-accent)] text-[var(--theme-text-accent)] shadow-premium hover:bg-[var(--theme-bg-accent-hover)] hover:shadow-lg active:shadow-none active:opacity-90";

  const canvasPromptAriaLabel = isCanvasPromptActive 
    ? t('canvasHelperActive_aria')
    : t('canvasHelperInactive_aria');
  const canvasPromptTitle = isCanvasPromptActive 
    ? t('canvasHelperActive_title')
    : t('canvasHelperInactive_title');

  const iconSize = 20; 
  const strokeWidth = 2; 

  return (
    <header className={`${themeId === 'pearl' ? 'bg-[var(--theme-bg-primary)]' : 'bg-[var(--theme-bg-secondary)]'} p-2 sm:p-3 flex items-center justify-between gap-2 sm:gap-3 flex-shrink-0 relative z-20`}>
      
      {/* Left Section: Navigation & Model Selector */}
      <div className="flex items-center gap-2 min-w-0">
        <button
            onClick={onToggleHistorySidebar}
            className={`${headerButtonBase} ${headerButtonInactive} md:hidden`}
            aria-label={isHistorySidebarOpen ? t('historySidebarClose') : t('historySidebarOpen')}
            title={isHistorySidebarOpen ? t('historySidebarClose_short') : t('historySidebarOpen_short')}
        >
            <IconSidebarToggle size={iconSize} strokeWidth={strokeWidth} />
        </button>
        
        <div className="relative" ref={modelSelectorRef}>
          <button
            onClick={() => setIsModelSelectorOpen(!isModelSelectorOpen)}
            disabled={isModelsLoading || isLoading || isSwitchingModel}
            className={`h-10 flex items-center gap-2 rounded-xl px-2 sm:px-3 bg-transparent hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-primary)] font-medium text-base transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--theme-bg-primary)] focus:ring-[var(--theme-border-focus)] disabled:opacity-70 disabled:cursor-not-allowed border border-transparent hover:border-[var(--theme-border-secondary)] hover:scale-[1.02] active:scale-95 active:bg-[var(--theme-bg-tertiary)] ${isSwitchingModel ? 'animate-pulse' : ''}`}
            title={`${t('headerModelSelectorTooltip_current')}: ${displayModelName}. ${t('headerModelSelectorTooltip_action')}`}
            aria-label={`${t('headerModelAriaLabel_current')}: ${displayModelName}. ${t('headerModelAriaLabel_action')}`}
            aria-haspopup="listbox"
            aria-expanded={isModelSelectorOpen}
          >
            {isModelsLoading && !currentModelName && <Loader2 size={16} className="animate-spin text-[var(--theme-text-link)]" />}
            {!isModelsLoading && selectedModelId && (
               <div className="hidden lg:flex items-center opacity-70">
                  {getModelIcon(availableModels.find(m => m.id === selectedModelId) || { id: selectedModelId, name: selectedModelId, isPinned: false })}
               </div>
            )}
            <span className="truncate max-w-[120px] sm:max-w-[240px] lg:hidden">{abbreviatedModelName}</span>
            <span className="hidden lg:block truncate max-w-[400px]">{displayModelName}</span>
            <ChevronDown size={16} className="opacity-50 flex-shrink-0" />
          </button>

          {isModelSelectorOpen && (
            <div 
              className="absolute top-full left-0 mt-1 w-[calc(100vw-2rem)] max-w-[320px] sm:w-96 sm:max-w-none bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-primary)] rounded-xl shadow-premium z-50 flex flex-col modal-enter-animation overflow-hidden"
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
                  filteredModels.map((model, index) => {
                    const prevModel = filteredModels[index - 1];
                    // Show divider when transitioning from pinned to unpinned
                    const showDivider = index > 0 && prevModel.isPinned && !model.isPinned;

                    return (
                    <React.Fragment key={model.id}>
                        {showDivider && (
                            <div className="h-px bg-[var(--theme-border-secondary)] my-1 mx-2 opacity-50" />
                        )}
                        <div
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
                            <div className="flex items-center gap-2.5 min-w-0">
                            {getModelIcon(model)}
                            <span className={`truncate ${model.id === selectedModelId ? 'text-[var(--theme-text-link)] font-semibold' : 'text-[var(--theme-text-primary)]'}`} title={model.name}>
                                {model.name}
                            </span>
                            </div>
                            {model.id === selectedModelId && <Check size={16} className="text-[var(--theme-text-link)] flex-shrink-0" strokeWidth={2} />}
                        </div>
                        
                        {model.id === defaultModelId ? (
                            <div className="mt-2 pl-1 text-xs text-[var(--theme-text-success)] flex items-center gap-1.5 cursor-default" onClick={(e) => e.stopPropagation()}>
                                <Check size={14} strokeWidth={2} />
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
                    </React.Fragment>
                    );
                  })
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

        {/* 4. New Chat Button (formerly Settings) */}
        <button
          onClick={onNewChat} 
          className={`${headerButtonBase} ${headerButtonInactive} md:hidden`}
          aria-label={t('headerNewChat_aria')}
          title={t('newChat')}
        >
          <IconNewChat size={iconSize} strokeWidth={strokeWidth} />
        </button>
      </div>
    </header>
  );
};
