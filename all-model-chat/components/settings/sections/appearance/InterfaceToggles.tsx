
import React from 'react';
import { translations } from '../../../../utils/appUtils';
import { ToggleItem } from '../../../shared/ToggleItem';

interface InterfaceTogglesProps {
  isStreamingEnabled: boolean;
  setIsStreamingEnabled: (value: boolean) => void;
  isAutoTitleEnabled: boolean;
  setIsAutoTitleEnabled: (value: boolean) => void;
  isSuggestionsEnabled: boolean;
  setIsSuggestionsEnabled: (value: boolean) => void;
  isAutoSendOnSuggestionClick: boolean;
  setIsAutoSendOnSuggestionClick: (value: boolean) => void;
  isAutoScrollOnSendEnabled: boolean;
  setIsAutoScrollOnSendEnabled: (value: boolean) => void;
  isCompletionNotificationEnabled: boolean;
  setIsCompletionNotificationEnabled: (value: boolean) => void;
  expandCodeBlocksByDefault: boolean;
  setExpandCodeBlocksByDefault: (value: boolean) => void;
  autoFullscreenHtml: boolean;
  setAutoFullscreenHtml: (value: boolean) => void;
  isMermaidRenderingEnabled: boolean;
  setIsMermaidRenderingEnabled: (value: boolean) => void;
  isGraphvizRenderingEnabled: boolean;
  setIsGraphvizRenderingEnabled: (value: boolean) => void;
  isAudioCompressionEnabled: boolean;
  setIsAudioCompressionEnabled: (value: boolean) => void;
  isPasteRichTextAsMarkdownEnabled: boolean;
  setIsPasteRichTextAsMarkdownEnabled: (value: boolean) => void;
  isPasteAsTextFileEnabled: boolean;
  setIsPasteAsTextFileEnabled: (value: boolean) => void;
  isSystemAudioRecordingEnabled: boolean;
  setIsSystemAudioRecordingEnabled: (value: boolean) => void;
  isRawModeEnabled: boolean;
  setIsRawModeEnabled: (value: boolean) => void;
  hideThinkingInContext: boolean;
  setHideThinkingInContext: (value: boolean) => void;
  t: (key: keyof typeof translations) => string;
}

export const InterfaceToggles: React.FC<InterfaceTogglesProps> = ({
  isStreamingEnabled, setIsStreamingEnabled,
  isAutoTitleEnabled, setIsAutoTitleEnabled,
  isSuggestionsEnabled, setIsSuggestionsEnabled,
  isAutoSendOnSuggestionClick, setIsAutoSendOnSuggestionClick,
  isAutoScrollOnSendEnabled, setIsAutoScrollOnSendEnabled,
  isCompletionNotificationEnabled, setIsCompletionNotificationEnabled,
  expandCodeBlocksByDefault, setExpandCodeBlocksByDefault,
  autoFullscreenHtml, setAutoFullscreenHtml,
  isMermaidRenderingEnabled, setIsMermaidRenderingEnabled,
  isGraphvizRenderingEnabled, setIsGraphvizRenderingEnabled,
  isAudioCompressionEnabled, setIsAudioCompressionEnabled,
  isPasteRichTextAsMarkdownEnabled, setIsPasteRichTextAsMarkdownEnabled,
  isPasteAsTextFileEnabled, setIsPasteAsTextFileEnabled,
  isSystemAudioRecordingEnabled, setIsSystemAudioRecordingEnabled,
  isRawModeEnabled, setIsRawModeEnabled,
  hideThinkingInContext, setHideThinkingInContext,
  t,
}) => {
  return (
    <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-tertiary)] mb-2">
            Interface Options
        </label>
        <div className="grid grid-cols-1 gap-1">
            <ToggleItem label={t('headerStream')} checked={isStreamingEnabled} onChange={setIsStreamingEnabled} />
            <ToggleItem label={t('settings_rawMode_label')} checked={isRawModeEnabled} onChange={setIsRawModeEnabled} tooltip={t('settings_rawMode_tooltip')} />
            <ToggleItem label={t('settings_hideThinkingInContext_label')} checked={hideThinkingInContext} onChange={setHideThinkingInContext} tooltip={t('settings_hideThinkingInContext_tooltip')} />
            <ToggleItem label={t('settings_pasteRichTextAsMarkdown_label')} checked={isPasteRichTextAsMarkdownEnabled} onChange={setIsPasteRichTextAsMarkdownEnabled} tooltip={t('settings_pasteRichTextAsMarkdown_tooltip')} />
            <ToggleItem label={t('settings_pasteAsTextFile_label')} checked={isPasteAsTextFileEnabled} onChange={setIsPasteAsTextFileEnabled} tooltip={t('settings_pasteAsTextFile_tooltip')} />
            <ToggleItem label={t('settings_systemAudioRecording_label')} checked={isSystemAudioRecordingEnabled} onChange={setIsSystemAudioRecordingEnabled} tooltip={t('settings_systemAudioRecording_tooltip')} />
            
            <ToggleItem label={t('isAutoTitleEnabled')} checked={isAutoTitleEnabled} onChange={setIsAutoTitleEnabled} />

            <ToggleItem label={t('settings_enableSuggestions_label')} checked={isSuggestionsEnabled} onChange={setIsSuggestionsEnabled} tooltip={t('settings_enableSuggestions_tooltip')} />
            
            {isSuggestionsEnabled && (
                <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                    <ToggleItem label={t('settings_autoSendOnSuggestionClick_label')} checked={isAutoSendOnSuggestionClick} onChange={setIsAutoSendOnSuggestionClick} tooltip={t('settings_autoSendOnSuggestionClick_tooltip')} />
                </div>
            )}

            <ToggleItem label={t('settings_autoScrollOnSend_label')} checked={isAutoScrollOnSendEnabled} onChange={setIsAutoScrollOnSendEnabled} />
            <ToggleItem label={t('settings_enableCompletionNotification_label')} checked={isCompletionNotificationEnabled} onChange={setIsCompletionNotificationEnabled} />
            <ToggleItem label={t('settings_expandCodeBlocksByDefault_label')} checked={expandCodeBlocksByDefault} onChange={setExpandCodeBlocksByDefault} />
            <ToggleItem label={t('settings_autoFullscreenHtml_label')} checked={autoFullscreenHtml} onChange={setAutoFullscreenHtml} tooltip={t('settings_autoFullscreenHtml_tooltip')} />
            <ToggleItem label={t('settings_enableMermaidRendering_label')} checked={isMermaidRenderingEnabled} onChange={setIsMermaidRenderingEnabled} tooltip={t('settings_enableMermaidRendering_tooltip')} />
            <ToggleItem label={t('settings_enableGraphvizRendering_label')} checked={isGraphvizRenderingEnabled} onChange={setIsGraphvizRenderingEnabled} tooltip={t('settings_enableGraphvizRendering_tooltip')} />
            <ToggleItem label={t('settings_audioCompression_label')} checked={isAudioCompressionEnabled} onChange={setIsAudioCompressionEnabled} tooltip={t('settings_audioCompression_tooltip')} />
        </div>
    </div>
  );
};