


import React from 'react';
import { translations } from '../../../../utils/appUtils';
import { ToggleItem } from '../../../shared/ToggleItem';
import { AppSettings } from '../../../../types';

interface InterfaceTogglesProps {
  settings: AppSettings;
  onUpdate: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  t: (key: keyof typeof translations) => string;
}

export const InterfaceToggles: React.FC<InterfaceTogglesProps> = ({
  settings,
  onUpdate,
  t,
}) => {
  const handleNotificationToggle = async (enabled: boolean) => {
    if (enabled) {
      if (!('Notification' in window)) {
        alert('Desktop notifications are not supported by your browser.');
        return;
      }
      
      if (Notification.permission === 'denied') {
        alert('Notifications are blocked by your browser. Please enable them in your browser settings to use this feature.');
        return;
      }

      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          return;
        }
      }
    }
    onUpdate('isCompletionNotificationEnabled', enabled);
  };

  return (
    <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-tertiary)] mb-2">
            Interface Options
        </label>
        <div className="grid grid-cols-1 gap-1">
            <ToggleItem label={t('headerStream')} checked={settings.isStreamingEnabled} onChange={(v) => onUpdate('isStreamingEnabled', v)} />
            <ToggleItem label={t('settings_rawMode_label')} checked={settings.isRawModeEnabled ?? false} onChange={(v) => onUpdate('isRawModeEnabled', v)} tooltip={t('settings_rawMode_tooltip')} />
            <ToggleItem label={t('settings_hideThinkingInContext_label')} checked={settings.hideThinkingInContext ?? false} onChange={(v) => onUpdate('hideThinkingInContext', v)} tooltip={t('settings_hideThinkingInContext_tooltip')} />
            <ToggleItem label={t('settings_pasteRichTextAsMarkdown_label')} checked={settings.isPasteRichTextAsMarkdownEnabled ?? true} onChange={(v) => onUpdate('isPasteRichTextAsMarkdownEnabled', v)} tooltip={t('settings_pasteRichTextAsMarkdown_tooltip')} />
            <ToggleItem label={t('settings_pasteAsTextFile_label')} checked={settings.isPasteAsTextFileEnabled ?? true} onChange={(v) => onUpdate('isPasteAsTextFileEnabled', v)} tooltip={t('settings_pasteAsTextFile_tooltip')} />
            <ToggleItem label={t('settings_systemAudioRecording_label')} checked={settings.isSystemAudioRecordingEnabled ?? false} onChange={(v) => onUpdate('isSystemAudioRecordingEnabled', v)} tooltip={t('settings_systemAudioRecording_tooltip')} />
            
            <ToggleItem label={t('isAutoTitleEnabled')} checked={settings.isAutoTitleEnabled} onChange={(v) => onUpdate('isAutoTitleEnabled', v)} />

            <ToggleItem label={t('settings_enableSuggestions_label')} checked={settings.isSuggestionsEnabled} onChange={(v) => onUpdate('isSuggestionsEnabled', v)} tooltip={t('settings_enableSuggestions_tooltip')} />
            
            {settings.isSuggestionsEnabled && (
                <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                    <ToggleItem label={t('settings_autoSendOnSuggestionClick_label')} checked={settings.isAutoSendOnSuggestionClick ?? true} onChange={(v) => onUpdate('isAutoSendOnSuggestionClick', v)} tooltip={t('settings_autoSendOnSuggestionClick_tooltip')} />
                </div>
            )}

            <ToggleItem label={t('settings_autoScrollOnSend_label')} checked={settings.isAutoScrollOnSendEnabled ?? true} onChange={(v) => onUpdate('isAutoScrollOnSendEnabled', v)} />
            <ToggleItem label={t('settings_enableCompletionNotification_label')} checked={settings.isCompletionNotificationEnabled} onChange={handleNotificationToggle} tooltip={t('settings_enableCompletionNotification_tooltip')} />
            <ToggleItem label={t('settings_enableCompletionSound_label')} checked={settings.isCompletionSoundEnabled ?? false} onChange={(v) => onUpdate('isCompletionSoundEnabled', v)} tooltip={t('settings_enableCompletionSound_tooltip')} />
            <ToggleItem label={t('settings_expandCodeBlocksByDefault_label')} checked={settings.expandCodeBlocksByDefault} onChange={(v) => onUpdate('expandCodeBlocksByDefault', v)} />
            <ToggleItem label={t('settings_autoFullscreenHtml_label')} checked={settings.autoFullscreenHtml ?? true} onChange={(v) => onUpdate('autoFullscreenHtml', v)} tooltip={t('settings_autoFullscreenHtml_tooltip')} />
            <ToggleItem label={t('settings_enableMermaidRendering_label')} checked={settings.isMermaidRenderingEnabled} onChange={(v) => onUpdate('isMermaidRenderingEnabled', v)} tooltip={t('settings_enableMermaidRendering_tooltip')} />
            <ToggleItem label={t('settings_enableGraphvizRendering_label')} checked={settings.isGraphvizRenderingEnabled ?? true} onChange={(v) => onUpdate('isGraphvizRenderingEnabled', v)} tooltip={t('settings_enableGraphvizRendering_tooltip')} />
            <ToggleItem label={t('settings_audioCompression_label')} checked={settings.isAudioCompressionEnabled} onChange={(v) => onUpdate('isAudioCompressionEnabled', v)} tooltip={t('settings_audioCompression_tooltip')} />
        </div>
    </div>
  );
};
