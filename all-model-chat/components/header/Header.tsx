
import React, { useState, useEffect } from 'react';
import { Wand2, PictureInPicture, PictureInPicture2 } from 'lucide-react'; 
import { ModelOption } from '../../types';
import { translations } from '../../utils/appUtils';
import { IconNewChat, IconSidebarToggle, IconScenarios } from '../icons/CustomIcons';
import { HeaderModelSelector } from './HeaderModelSelector';

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
  isSwitchingModel: boolean;
  isHistorySidebarOpen: boolean;
  onLoadCanvasPrompt: () => void;
  isCanvasPromptActive: boolean;
  t: (key: keyof typeof translations) => string;
  isKeyLocked: boolean;
  isPipSupported: boolean;
  isPipActive: boolean;
  onTogglePip: () => void;
  themeId: string;
  thinkingLevel?: 'LOW' | 'HIGH';
  onSetThinkingLevel: (level: 'LOW' | 'HIGH') => void;
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
  isSwitchingModel,
  isHistorySidebarOpen,
  onLoadCanvasPrompt,
  isCanvasPromptActive,
  t,
  isKeyLocked,
  isPipSupported,
  isPipActive,
  onTogglePip,
  themeId,
  thinkingLevel,
  onSetThinkingLevel,
}) => {
  const [newChatShortcut, setNewChatShortcut] = useState('');
  const [pipShortcut, setPipShortcut] = useState('');

  useEffect(() => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modifier = isMac ? 'Cmd' : 'Ctrl';
    setNewChatShortcut(`${modifier} + Shift + N`);
    setPipShortcut(`${modifier} + Shift + P`);
  }, []);

  const headerButtonBase = "w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl transition-all duration-200 ease-[cubic-bezier(0.19,1,0.22,1)] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--theme-bg-primary)] focus-visible:ring-[var(--theme-border-focus)] hover:scale-105 active:scale-95";
  const headerButtonInactive = "bg-transparent text-[var(--theme-icon-settings)] hover:bg-[var(--theme-bg-tertiary)] hover:text-[var(--theme-text-primary)] active:bg-[var(--theme-bg-tertiary)] active:text-[var(--theme-text-primary)]";
  const headerButtonActive = "text-[var(--theme-text-link)] bg-[var(--theme-bg-accent)]/10 hover:bg-[var(--theme-bg-accent)]/20";

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
        
        <HeaderModelSelector
            currentModelName={currentModelName}
            availableModels={availableModels}
            selectedModelId={selectedModelId}
            onSelectModel={onSelectModel}
            isSwitchingModel={isSwitchingModel}
            isLoading={isLoading}
            t={t}
            thinkingLevel={thinkingLevel}
            onSetThinkingLevel={onSetThinkingLevel}
        />
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

        {/* 2. Scenarios Button (Cards/Book) */}
        <button
          onClick={onOpenScenariosModal}
          className={`${headerButtonBase} ${headerButtonInactive}`}
          aria-label={t('scenariosManage_aria')}
          title={t('scenariosManage_title')}
        >
          <IconScenarios size={iconSize} strokeWidth={strokeWidth} />
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
          title={`${t('newChat')} (${newChatShortcut})`}
        >
          <IconNewChat size={iconSize} strokeWidth={strokeWidth} />
        </button>
      </div>
    </header>
  );
};
