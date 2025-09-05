import React, { useState, useEffect, useRef } from 'react';
import { Settings, ChevronDown, Check, Loader2, Trash2, Pin, MessagesSquare, PanelLeftOpen, PanelLeftClose, SquarePen, Wand2, Lock, Download, PictureInPicture, PictureInPicture2 } from 'lucide-react'; 
import { ModelOption } from '../types';
import { translations, getResponsiveValue } from '../utils/appUtils';

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
  const [hoveredModelId, setHoveredModelId] = useState<string | null>(null);
  const modelSelectorRef = useRef<HTMLDivElement>(null);
  const [newChatShortcut, setNewChatShortcut] = useState('');
  const [pipShortcut, setPipShortcut] = useState('');

  const displayModelName = isModelsLoading && !currentModelName ? t('loading') : currentModelName;

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

  const canvasPromptButtonBaseClasses = "p-2 sm:p-2.5 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--theme-bg-primary)] focus:ring-[var(--theme-border-focus)] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-100";
  const canvasPromptButtonActiveClasses = `bg-[var(--theme-bg-accent)] text-[var(--theme-text-accent)] hover:bg-[var(--theme-bg-accent-hover)] shadow-premium`;
  const canvasPromptButtonInactiveClasses = `bg-[var(--theme-bg-tertiary)] text-[var(--theme-icon-settings)] hover:bg-[var(--theme-bg-input)]`;

  const canvasPromptAriaLabel = isCanvasPromptActive 
    ? t('canvasHelperActive_aria')
    : t('canvasHelperInactive_aria');
  const canvasPromptTitle = isCanvasPromptActive 
    ? t('canvasHelperActive_title')
    : t('canvasHelperInactive_title');


  return (
    <header className={`${themeId === 'pearl' ? 'bg-[var(--theme-bg-primary)]' : 'bg-[var(--theme-bg-secondary)]'} p-2 shadow-premium flex items-center justify-between gap-2 border-b border-[var(--theme-border-primary)] flex-shrink-0`}>
      <div className="flex items-center gap-1 min-w-0">
        <button
            onClick={onToggleHistorySidebar}
            className={`p-1.5 sm:p-2 text-[var(--theme-icon-history)] hover:bg-[var(--theme-bg-tertiary)] rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--theme-bg-primary)] focus:ring-[var(--theme-border-focus)] transition-transform hover:scale-110 active:scale-105 ${isHistorySidebarOpen ? 'md:hidden' : ''}`}
            aria-label={isHistorySidebarOpen ? t('historySidebarClose') : t('historySidebarOpen')}
            title={isHistorySidebarOpen ? t('historySidebarClose_short') : t('historySidebarOpen_short')}
        >
            {isHistorySidebarOpen ? <PanelLeftClose size={getResponsiveValue(18, 20)} /> : <PanelLeftOpen size={getResponsiveValue(18, 20)} />}
        </button>
        {!isHistorySidebarOpen && (
          <button
            onClick={onNewChat}
            className="p-1.5 sm:p-2 text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)] rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--theme-bg-primary)] focus:ring-[var(--theme-border-focus)] transition-transform hover:scale-110 active:scale-105"
            aria-label={t('headerNewChat_aria')}
            title={`${t('newChat')} (${newChatShortcut})`}
          >
            <SquarePen size={getResponsiveValue(18, 20)} />
          </button>
        )}
        <div className="relative" ref={modelSelectorRef}>
          <button
            onClick={() => setIsModelSelectorOpen(!isModelSelectorOpen)}
            disabled={isModelsLoading || isLoading || isSwitchingModel}
            className={`flex items-center gap-2.5 rounded-xl px-1.5 py-1 text-base transition-colors hover:bg-[var(--theme-bg-tertiary)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--theme-bg-primary)] focus:ring-[var(--theme-border-focus)] disabled:opacity-70 disabled:cursor-not-allowed ${isSwitchingModel ? 'animate-pulse' : ''}`}
            title={`${t('headerModelSelectorTooltip_current')}: ${displayModelName}. ${t('headerModelSelectorTooltip_action')}`}
            aria-label={`${t('headerModelAriaLabel_current')}: ${displayModelName}. ${t('headerModelAriaLabel_action')}`}
            aria-haspopup="listbox"
            aria-expanded={isModelSelectorOpen}
          >
            {isModelsLoading && !currentModelName && <Loader2 size={18} className="animate-spin text-[var(--theme-text-link)]" />}
            {isKeyLocked && <Lock size={16} className="text-[var(--theme-text-link)]" title="API Key is locked for this session" />}
            <span className="truncate max-w-[144px] sm:max-w-[300px] font-medium">{displayModelName}</span>
            <ChevronDown size={20} className={`flex-shrink-0 text-[var(--theme-text-tertiary)] transition-transform duration-200 ${isModelSelectorOpen ? 'rotate-180' : ''}`} />
          </button>

          {isModelSelectorOpen && (
            <div 
              className="absolute top-full left-0 mt-1 w-80 sm:w-96 bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-primary)] rounded-xl shadow-premium z-20 flex flex-col modal-enter-animation"
              onMouseLeave={() => setHoveredModelId(null)}
            >
              <div className="max-h-96 overflow-y-auto custom-scrollbar" role="listbox" aria-labelledby="model-selector-button">
                {isModelsLoading ? (
                  <div>
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="px-4 py-2.5 flex items-center gap-2 animate-pulse">
                        <div className="h-5 w-5 bg-[var(--theme-bg-tertiary)] rounded-full"></div>
                        <div className="h-5 flex-grow bg-[var(--theme-bg-tertiary)] rounded"></div>
                      </div>
                    ))}
                  </div>
                ) : availableModels.length > 0 ? (
                  availableModels.map(model => (
                    <div
                      key={model.id}
                      onClick={() => handleModelSelect(model.id)}
                      onMouseEnter={() => setHoveredModelId(model.id)}
                      role="option"
                      aria-selected={model.id === selectedModelId}
                      className={`cursor-pointer w-full text-left px-4 py-2.5 text-sm sm:text-base hover:bg-[var(--theme-bg-tertiary)] transition-colors
                        ${model.id === selectedModelId ? 'bg-[var(--theme-bg-tertiary)]' : ''}`
                      }
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          {model.isPinned && (
                            <Pin size={14} className="text-[var(--theme-text-tertiary)] flex-shrink-0" />
                          )}
                          <span className={`truncate ${model.id === selectedModelId ? 'text-[var(--theme-text-link)] font-semibold' : 'text-[var(--theme-text-primary)]'}`} title={model.name}>{model.name}</span>
                        </div>
                        {model.id === selectedModelId && <Check size={16} className="text-[var(--theme-text-link)] flex-shrink-0" />}
                      </div>
                      
                      {model.id === defaultModelId ? (
                        <div className="mt-2 pl-1 text-xs text-[var(--theme-text-success)] flex items-center gap-1.5 cursor-default" onClick={(e) => e.stopPropagation()}>
                            <Check size={14} />
                            <span>{t('header_setDefault_isDefault')}</span>
                        </div>
                      ) : hoveredModelId === model.id ? (
                          <div className="mt-2 pl-1" style={{ animation: `fadeInUp 0.3s ease-out both` }}>
                              <button
                                  onClick={(e) => handleSetDefault(e, model.id)}
                                  className="text-xs text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] flex items-center gap-1.5"
                              >
                                  <span>{t('header_setDefault_action')}</span>
                              </button>
                          </div>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-2.5 text-sm sm:text-base text-[var(--theme-text-tertiary)]">{t('headerModelSelectorNoModels')}</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5 sm:gap-2 justify-end flex-shrink-0">
        <button
          onClick={onLoadCanvasPrompt}
          disabled={isLoading}
          className={`${canvasPromptButtonBaseClasses} ${isCanvasPromptActive ? canvasPromptButtonActiveClasses : canvasPromptButtonInactiveClasses}`}
          aria-label={canvasPromptAriaLabel}
          title={canvasPromptTitle}
        >
          <Wand2 size={getResponsiveValue(16, 18)} />
        </button>
        <button
          onClick={onOpenScenariosModal}
          className="p-2 sm:p-2.5 bg-[var(--theme-bg-tertiary)] hover:bg-[var(--theme-bg-input)] text-[var(--theme-icon-settings)] rounded-lg shadow transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--theme-bg-primary)] focus:ring-[var(--theme-border-focus)] flex items-center justify-center hover:scale-105 active:scale-100"
          aria-label={t('scenariosManage_aria')}
          title={t('scenariosManage_title')}
        >
          <MessagesSquare size={getResponsiveValue(16, 18)} />
        </button>
        {isPipSupported && (
            <button
              onClick={onTogglePip}
              className="p-2 sm:p-2.5 bg-[var(--theme-bg-tertiary)] hover:bg-[var(--theme-bg-input)] text-[var(--theme-icon-settings)] rounded-lg shadow transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--theme-bg-primary)] focus:ring-[var(--theme-border-focus)] flex items-center justify-center hover:scale-105 active:scale-100"
              aria-label={isPipActive ? 'Exit Picture-in-Picture' : 'Enter Picture-in-Picture'}
              title={`${isPipActive ? 'Exit Picture-in-Picture' : 'Enter Picture-in-Picture'} (${pipShortcut})`}
            >
              {isPipActive ? <PictureInPicture2 size={getResponsiveValue(16, 18)} /> : <PictureInPicture size={getResponsiveValue(16, 18)} />}
            </button>
        )}
        <button
          onClick={onOpenSettingsModal} 
          className="p-2 sm:p-2.5 bg-[var(--theme-bg-tertiary)] hover:bg-[var(--theme-bg-input)] text-[var(--theme-icon-settings)] rounded-lg shadow transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--theme-bg-primary)] focus:ring-[var(--theme-border-focus)] flex items-center justify-center hover:scale-105 active:scale-100"
          aria-label={t('settingsOpen_aria')}
          title={t('settingsOpen_title')}
        >
          <Settings size={getResponsiveValue(16, 18)} />
        </button>
      </div>
    </header>
  );
};