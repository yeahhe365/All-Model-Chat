import React, { useMemo } from 'react';
import { ClipboardPaste, Eraser, Languages, Loader2, Maximize2, Minimize2 } from 'lucide-react';
import { useI18n } from '../../../../contexts/I18nContext';
import { useChatInputActionsContext, useChatInputComposerStatusContext } from '../ChatInputContext';

export type ComposerAuxiliaryActionId = 'fullscreen' | 'translate' | 'clear' | 'paste';

export interface ComposerAuxiliaryAction {
  id: ComposerAuxiliaryActionId;
  label: string;
  ariaLabel: string;
  title: string;
  icon: React.ReactNode;
  disabled: boolean;
  action: () => void;
  testId?: string;
}

export const useComposerAuxiliaryActions = (): ComposerAuxiliaryAction[] => {
  const {
    isFullscreen,
    onToggleFullscreen,
    isTranslating,
    disabled,
    isLoading,
    isWaitingForUpload,
    isTranscribing,
    isMicInitializing,
    isNativeAudioModel,
    isEditing,
    showInputTranslationButton,
    showInputPasteButton,
    showInputClearButton,
  } = useChatInputActionsContext();
  const { hasTrimmedInput, onTranslate, onPasteFromClipboard, onClearInput } = useChatInputComposerStatusContext();
  const { t } = useI18n();
  const canTranslate = hasTrimmedInput && !isEditing && !isTranscribing && !isMicInitializing;
  const commonBlocked = disabled || isLoading || isWaitingForUpload;

  return useMemo(() => {
    const actions: Array<ComposerAuxiliaryAction | null> = [
      !isNativeAudioModel && onToggleFullscreen
        ? {
            id: 'fullscreen',
            label: isFullscreen ? t('fullscreen_tooltip_collapse') : t('fullscreen_tooltip_expand'),
            ariaLabel: isFullscreen ? t('fullscreen_tooltip_collapse') : t('fullscreen_tooltip_expand'),
            title: isFullscreen ? t('fullscreen_tooltip_collapse') : t('fullscreen_tooltip_expand'),
            icon: isFullscreen ? <Minimize2 size={20} strokeWidth={2} /> : <Maximize2 size={20} strokeWidth={2} />,
            disabled,
            action: onToggleFullscreen,
            testId: 'fullscreen-button',
          }
        : null,
      !isNativeAudioModel && showInputTranslationButton
        ? {
            id: 'translate',
            label: isTranslating ? t('translating_button_title') : t('translate_button_title'),
            ariaLabel: isTranslating ? t('translating_button_title') : t('translate_button_title'),
            title: isTranslating ? t('translating_button_title') : t('translate_button_title'),
            icon: isTranslating ? (
              <Loader2 size={20} className="animate-spin text-[var(--theme-text-link)]" strokeWidth={2} />
            ) : (
              <Languages size={20} strokeWidth={2} />
            ),
            disabled: !canTranslate || isTranslating,
            action: onTranslate,
            testId: 'translate-button',
          }
        : null,
      showInputClearButton
        ? {
            id: 'clear',
            label: t('clearInput_title'),
            ariaLabel: t('clearInput_aria'),
            title: t('clearInput_title'),
            icon: <Eraser size={18} strokeWidth={2} />,
            disabled: commonBlocked,
            action: onClearInput,
            testId: 'clear-input-button',
          }
        : null,
      showInputPasteButton
        ? {
            id: 'paste',
            label: t('pasteClipboard_title'),
            ariaLabel: t('pasteClipboard_aria'),
            title: t('pasteClipboard_title'),
            icon: <ClipboardPaste size={18} strokeWidth={2} />,
            disabled: commonBlocked,
            action: onPasteFromClipboard,
            testId: 'paste-button',
          }
        : null,
    ];

    return actions.filter((item): item is ComposerAuxiliaryAction => item !== null);
  }, [
    canTranslate,
    commonBlocked,
    disabled,
    isFullscreen,
    isNativeAudioModel,
    isTranslating,
    onClearInput,
    onPasteFromClipboard,
    onToggleFullscreen,
    onTranslate,
    showInputClearButton,
    showInputPasteButton,
    showInputTranslationButton,
    t,
  ]);
};
