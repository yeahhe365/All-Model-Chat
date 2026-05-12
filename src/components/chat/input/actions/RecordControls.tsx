import React from 'react';
import { Loader2, Mic } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import { CHAT_INPUT_BUTTON_CLASS } from '@/constants/appConstants';
import { useChatInputActionsContext } from '@/components/chat/input/ChatInputContext';

export const RecordControls: React.FC = () => {
  const { isRecording, isTranscribing, isMicInitializing, onRecordButtonClick, onCancelRecording, disabled } =
    useChatInputActionsContext();
  const { t } = useI18n();
  const micIconSize = 20;

  return (
    <div
      data-testid="record-controls-group"
      className={`flex items-center ${isRecording ? 'gap-3 overflow-visible pr-2.5' : ''}`}
    >
      {isRecording && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onCancelRecording();
          }}
          className="px-3 py-1.5 text-xs sm:text-sm bg-transparent hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-secondary)] rounded-md transition-colors"
          aria-label={t('cancelRecording_aria')}
          title={t('cancelRecording_aria')}
        >
          {t('cancel')}
        </button>
      )}

      <button
        type="button"
        onClick={onRecordButtonClick}
        disabled={disabled || isTranscribing || isMicInitializing}
        className={`${CHAT_INPUT_BUTTON_CLASS} ${isRecording ? 'relative z-10 mic-recording-animate' : 'bg-transparent text-[var(--theme-icon-settings)] hover:bg-[var(--theme-bg-tertiary)]'}`}
        aria-label={
          isRecording
            ? t('voiceInput_stop_aria')
            : isTranscribing
              ? t('voiceInput_transcribing_aria')
              : isMicInitializing
                ? t('mic_initializing')
                : t('voiceInput_start_aria')
        }
        title={
          isRecording
            ? t('voiceInput_stop_aria')
            : isTranscribing
              ? t('voiceInput_transcribing_aria')
              : isMicInitializing
                ? t('mic_initializing')
                : t('voiceInput_start_aria')
        }
      >
        {isTranscribing || isMicInitializing ? (
          <Loader2 size={micIconSize} className="animate-spin text-[var(--theme-text-link)]" strokeWidth={2} />
        ) : (
          <Mic size={micIconSize} strokeWidth={2} />
        )}
      </button>
    </div>
  );
};
