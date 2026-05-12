import React from 'react';
import { Wand2, PictureInPicture, PictureInPicture2 } from 'lucide-react';
import { type ModelOption } from '@/types';
import { useI18n } from '@/contexts/I18nContext';
import { IconNewChat, IconSidebarToggle, IconScenarios } from '@/components/icons/CustomIcons';
import { HeaderModelSelector } from './HeaderModelSelector';
import { getCachedModelCapabilities } from '@/stores/modelCapabilitiesStore';

interface HeaderProps {
  onNewChat: () => void;
  onOpenScenariosModal: () => void;
  onToggleHistorySidebar: () => void;
  isLoading: boolean;
  currentModelName: string;
  availableModels: ModelOption[];
  selectedModelId: string;
  onSelectModel: (modelId: string) => void;
  isSwitchingModel: boolean;
  isHistorySidebarOpen: boolean;
  onLoadLiveArtifactsPrompt: () => void;
  isLiveArtifactsPromptActive: boolean;
  isLiveArtifactsPromptBusy?: boolean;
  isPipSupported: boolean;
  isPipActive: boolean;
  onTogglePip: () => void;
  themeId: string;
  thinkingLevel?: 'MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH';
  onSetThinkingLevel: (level: 'MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH') => void;
  showThoughts: boolean;
  onToggleGemmaReasoning: () => void;
  newChatShortcut: string;
  pipShortcut: string;
}

export const Header: React.FC<HeaderProps> = ({
  onNewChat,
  onOpenScenariosModal,
  onToggleHistorySidebar,
  isLoading,
  currentModelName,
  availableModels,
  selectedModelId,
  onSelectModel,
  isSwitchingModel,
  isHistorySidebarOpen,
  onLoadLiveArtifactsPrompt,
  isLiveArtifactsPromptActive,
  isLiveArtifactsPromptBusy = false,
  isPipSupported,
  isPipActive,
  onTogglePip,
  themeId,
  thinkingLevel,
  onSetThinkingLevel,
  showThoughts,
  onToggleGemmaReasoning,
  newChatShortcut,
  pipShortcut,
}) => {
  const { t } = useI18n();
  const headerButtonBase =
    'w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-xl transition-all duration-200 ease-[cubic-bezier(0.19,1,0.22,1)] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--theme-bg-primary)] focus-visible:ring-[var(--theme-border-focus)]';
  const headerButtonInactive =
    'bg-transparent text-[var(--theme-icon-settings)] hover:bg-[var(--theme-bg-tertiary)] hover:text-[var(--theme-text-primary)] active:bg-[var(--theme-bg-tertiary)] active:text-[var(--theme-text-primary)]';
  const headerButtonActive =
    'text-[var(--theme-text-link)] bg-[var(--theme-bg-accent)]/10 hover:bg-[var(--theme-bg-accent)]/20';

  const liveArtifactsPromptAriaLabel = isLiveArtifactsPromptActive
    ? t('liveArtifactsHelperActive_aria')
    : t('liveArtifactsHelperInactive_aria');
  const liveArtifactsPromptTitle = isLiveArtifactsPromptActive
    ? t('liveArtifactsHelperActive_title')
    : t('liveArtifactsHelperInactive_title');

  const iconSize = 18;
  const strokeWidth = 2;

  const { permissions } = getCachedModelCapabilities(selectedModelId || '');

  // Only show Live Artifacts for standard chat models (not specialized audio/image models).
  const showTextTools = permissions.canGenerateSuggestions;

  return (
    <header
      className={`${themeId === 'pearl' ? 'bg-[var(--theme-bg-primary)]' : 'bg-[var(--theme-bg-secondary)]'} px-2 py-[0.32rem] sm:px-3 sm:py-[0.48rem] flex items-center justify-between gap-2 sm:gap-3 flex-shrink-0 relative z-20`}
    >
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
          thinkingLevel={thinkingLevel}
          onSetThinkingLevel={onSetThinkingLevel}
          showThoughts={showThoughts}
          onToggleGemmaReasoning={onToggleGemmaReasoning}
        />
      </div>

      {/* Right Section: Action Buttons (Redesigned) */}
      <div className="flex items-center gap-1 sm:gap-2.5 justify-end flex-shrink-0">
        {/* 1. Live Artifacts helper button */}
        {showTextTools && (
          <button
            onClick={onLoadLiveArtifactsPrompt}
            disabled={isLoading || isLiveArtifactsPromptBusy}
            className={`${headerButtonBase} ${isLiveArtifactsPromptActive ? headerButtonActive : headerButtonInactive}`}
            aria-label={liveArtifactsPromptAriaLabel}
            title={liveArtifactsPromptTitle}
          >
            <Wand2 size={iconSize} strokeWidth={strokeWidth} />
          </button>
        )}

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
            aria-label={isPipActive ? t('pipExit') : t('pipEnter')}
            title={(isPipActive ? t('pipExit') : t('pipEnter')) + (pipShortcut ? ` (${pipShortcut})` : '')}
          >
            {isPipActive ? (
              <PictureInPicture2 size={iconSize} strokeWidth={strokeWidth} />
            ) : (
              <PictureInPicture size={iconSize} strokeWidth={strokeWidth} />
            )}
          </button>
        )}

        {/* 4. New Chat Button (formerly Settings) */}
        <a
          href="/"
          onClick={(e) => {
            if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
              e.preventDefault();
              onNewChat();
            }
          }}
          className={`${headerButtonBase} ${headerButtonInactive} md:hidden no-underline`}
          aria-label={t('headerNewChat_aria')}
          title={t('newChat') + (newChatShortcut ? ` (${newChatShortcut})` : '')}
        >
          <IconNewChat size={iconSize} strokeWidth={strokeWidth} />
        </a>
      </div>
    </header>
  );
};
