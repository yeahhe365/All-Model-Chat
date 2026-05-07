import React from 'react';
import { Maximize2, Minimize2, Languages, Loader2 } from 'lucide-react';
import { useI18n } from '../../../../contexts/I18nContext';
import { CHAT_INPUT_BUTTON_CLASS } from '../../../../constants/appConstants';
import { useSettingsStore } from '../../../../stores/settingsStore';
import { useChatStore } from '../../../../stores/chatStore';
import { useChatInputActionsContext, useChatInputComposerStatusContext } from '../ChatInputContext';

export const UtilityControls: React.FC = () => {
  const { isFullscreen, onToggleFullscreen, isTranslating, disabled, isTranscribing, isMicInitializing } =
    useChatInputActionsContext();
  const { hasTrimmedInput, onTranslate } = useChatInputComposerStatusContext();
  const showTranslateButton = useSettingsStore((state) => state.appSettings.showInputTranslationButton ?? false);
  const isEditing = !!useChatStore((state) => state.editingMessageId);
  const { t } = useI18n();
  const iconSize = 20;
  const canTranslate = hasTrimmedInput && !isEditing && !isTranscribing && !isMicInitializing;

  return (
    <>
      {onToggleFullscreen && (
        <button
          type="button"
          onClick={onToggleFullscreen}
          disabled={disabled}
          className={`${CHAT_INPUT_BUTTON_CLASS} bg-transparent text-[var(--theme-icon-settings)] hover:bg-[var(--theme-bg-tertiary)]`}
          aria-label={isFullscreen ? t('fullscreen_tooltip_collapse') : t('fullscreen_tooltip_expand')}
          title={isFullscreen ? t('fullscreen_tooltip_collapse') : t('fullscreen_tooltip_expand')}
        >
          {isFullscreen ? <Minimize2 size={iconSize} strokeWidth={2} /> : <Maximize2 size={iconSize} strokeWidth={2} />}
        </button>
      )}

      {showTranslateButton && (
        <button
          type="button"
          onClick={onTranslate}
          disabled={!canTranslate || isTranslating}
          className={`${CHAT_INPUT_BUTTON_CLASS} bg-transparent text-[var(--theme-icon-settings)] hover:bg-[var(--theme-bg-tertiary)]`}
          aria-label={isTranslating ? t('translating_button_title') : t('translate_button_title')}
          title={isTranslating ? t('translating_button_title') : t('translate_button_title')}
          data-testid="translate-button"
        >
          {isTranslating ? (
            <Loader2 size={iconSize} className="animate-spin text-[var(--theme-text-link)]" strokeWidth={2} />
          ) : (
            <Languages size={iconSize} strokeWidth={2} />
          )}
        </button>
      )}
    </>
  );
};
