

import React, { useState, useRef } from 'react';
import { ChevronDown, Check, Info, Type, CloudUpload } from 'lucide-react';
import { translations } from '../../utils/appUtils';
import { Toggle, Tooltip } from '../shared/Tooltip';
import { IconThemeSystem, IconThemeDark, IconThemeLight } from '../icons/CustomIcons';
import { useClickOutside } from '../../hooks/useClickOutside';
import { FilesApiConfig } from '../../types';

interface AppearanceSectionProps {
  themeId: 'system' | 'onyx' | 'pearl';
  setThemeId: (value: 'system' | 'onyx' | 'pearl') => void;
  language: 'en' | 'zh' | 'system';
  setLanguage: (value: 'en' | 'zh' | 'system') => void;
  isCompletionNotificationEnabled: boolean;
  setIsCompletionNotificationEnabled: (value: boolean) => void;
  baseFontSize: number;
  setBaseFontSize: (value: number) => void;
  expandCodeBlocksByDefault: boolean;
  setExpandCodeBlocksByDefault: (value: boolean) => void;
  isMermaidRenderingEnabled: boolean;
  setIsMermaidRenderingEnabled: (value: boolean) => void;
  isGraphvizRenderingEnabled: boolean;
  setIsGraphvizRenderingEnabled: (value: boolean) => void;
  isAutoScrollOnSendEnabled: boolean;
  setIsAutoScrollOnSendEnabled: (value: boolean) => void;
  isStreamingEnabled: boolean;
  setIsStreamingEnabled: (value: boolean) => void;
  isAutoTitleEnabled: boolean;
  setIsAutoTitleEnabled: (value: boolean) => void;
  isSuggestionsEnabled: boolean;
  setIsSuggestionsEnabled: (value: boolean) => void;
  isAutoSendOnSuggestionClick: boolean;
  setIsAutoSendOnSuggestionClick: (value: boolean) => void;
  autoFullscreenHtml: boolean;
  setAutoFullscreenHtml: (value: boolean) => void;
  showWelcomeSuggestions: boolean;
  setShowWelcomeSuggestions: (value: boolean) => void;
  isAudioCompressionEnabled: boolean;
  setIsAudioCompressionEnabled: (value: boolean) => void;
  // Updated prop for file strategy
  filesApiConfig: FilesApiConfig;
  setFilesApiConfig: (value: FilesApiConfig) => void;
  t: (key: keyof typeof translations) => string;
}

const ToggleItem = ({ label, checked, onChange, tooltip, small = false }: { label: string, checked: boolean, onChange: (v: boolean) => void, tooltip?: string, small?: boolean }) => (
    <div className={`flex items-center justify-between py-${small ? '2' : '3'} transition-colors`}>
        <div className="flex items-center pr-4 flex-1 min-w-0">
            <span className={`${small ? 'text-xs text-[var(--theme-text-secondary)]' : 'text-sm font-medium text-[var(--theme-text-primary)]'}`}>
                {label}
            </span>
            {tooltip && (
                <Tooltip text={tooltip}>
                    <Info size={14} className="text-[var(--theme-text-tertiary)] cursor-help" strokeWidth={1.5} />
                </Tooltip>
            )}
        </div>
        <div className="flex-shrink-0">
          <Toggle checked={checked} onChange={onChange} />
        </div>
    </div>
);

export const AppearanceSection: React.FC<AppearanceSectionProps> = ({
  themeId, setThemeId,
  language, setLanguage,
  isCompletionNotificationEnabled, setIsCompletionNotificationEnabled,
  baseFontSize, setBaseFontSize,
  expandCodeBlocksByDefault, setExpandCodeBlocksByDefault,
  isMermaidRenderingEnabled, setIsMermaidRenderingEnabled,
  isGraphvizRenderingEnabled, setIsGraphvizRenderingEnabled,
  isAutoScrollOnSendEnabled, setIsAutoScrollOnSendEnabled,
  isStreamingEnabled, setIsStreamingEnabled,
  isAutoTitleEnabled, setIsAutoTitleEnabled,
  isSuggestionsEnabled, setIsSuggestionsEnabled,
  isAutoSendOnSuggestionClick, setIsAutoSendOnSuggestionClick,
  autoFullscreenHtml, setAutoFullscreenHtml,
  showWelcomeSuggestions, setShowWelcomeSuggestions,
  isAudioCompressionEnabled, setIsAudioCompressionEnabled,
  filesApiConfig, setFilesApiConfig,
  t,
}) => {
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
  const languageDropdownRef = useRef<HTMLDivElement>(null);

  useClickOutside(languageDropdownRef, () => setIsLanguageDropdownOpen(false), isLanguageDropdownOpen);

  const themeOptions: { id: 'system' | 'onyx' | 'pearl'; labelKey: keyof typeof translations; icon: React.ReactNode }[] = [
    { id: 'system', labelKey: 'settingsThemeSystem', icon: <IconThemeSystem size={16} strokeWidth={1.5} /> },
    { id: 'onyx', labelKey: 'settingsThemeDark', icon: <IconThemeDark size={16} strokeWidth={1.5} /> },
    { id: 'pearl', labelKey: 'settingsThemeLight', icon: <IconThemeLight size={16} strokeWidth={1.5} /> },
  ];

  const languageOptions: { id: 'system' | 'en' | 'zh'; label: string; }[] = [
    { id: 'system', label: 'System Default' },
    { id: 'en', label: 'English' },
    { id: 'zh', label: '简体中文' },
  ];

  const currentLanguageDisplay = languageOptions.find(o => o.id === language)?.label;

  const updateFileConfig = (key: keyof FilesApiConfig, val: boolean) => {
      setFilesApiConfig({ ...filesApiConfig, [key]: val });
  };

  return (
    <div className="space-y-6">
      {/* Theme & Language */}
      <div className="grid grid-cols-1 gap-2">
          
          {/* Theme Selector - Row Layout */}
          <div className="flex items-center justify-between py-3 transition-colors">
              <span className="text-sm font-medium text-[var(--theme-text-primary)] flex items-center gap-2">
                  {t('settingsTheme')}
              </span>
              <div className="flex p-1 bg-[var(--theme-bg-tertiary)]/50 rounded-lg border border-[var(--theme-border-secondary)]">
                  {themeOptions.map(option => (
                    <button
                        key={option.id}
                        onClick={() => setThemeId(option.id)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)] ${
                            themeId === option.id
                            ? 'bg-[var(--theme-bg-accent)] text-[var(--theme-text-accent)] shadow-sm'
                            : 'text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]'
                        }`}
                    >
                        {t(option.labelKey)}
                    </button>
                  ))}
              </div>
          </div>

          {/* Language Selector - Row Layout */}
          <div className="relative" ref={languageDropdownRef}>
              <button
                onClick={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
                className="w-full flex items-center justify-between py-3 transition-colors focus:outline-none"
              >
                <span className="text-sm font-medium text-[var(--theme-text-primary)] flex items-center gap-2">
                    {t('settingsLanguage')}
                </span>
                <span className="flex items-center gap-2 text-xs font-medium text-[var(--theme-text-secondary)] bg-[var(--theme-bg-input)]/50 px-3 py-1.5 rounded-lg border border-[var(--theme-border-secondary)]">
                    {currentLanguageDisplay}
                    <ChevronDown size={14} className={`text-[var(--theme-text-tertiary)] transition-transform ${isLanguageDropdownOpen ? 'rotate-180' : ''}`} strokeWidth={1.5} />
                </span>
              </button>

              {isLanguageDropdownOpen && (
                <div className="absolute top-full right-0 mt-2 w-48 py-1 bg-[var(--theme-bg-primary)] border border-[var(--theme-border-secondary)] rounded-xl shadow-xl z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                    {languageOptions.map(option => (
                        <button
                            key={option.id}
                            onClick={() => { setLanguage(option.id as any); setIsLanguageDropdownOpen(false); }}
                            className={`w-full px-4 py-2 text-sm text-left flex items-center justify-between hover:bg-[var(--theme-bg-tertiary)] transition-colors ${language === option.id ? 'text-[var(--theme-text-link)] bg-[var(--theme-bg-tertiary)]/30' : 'text-[var(--theme-text-primary)]'}`}
                        >
                            {option.label}
                            {language === option.id && <Check size={14} strokeWidth={1.5} />}
                        </button>
                    ))}
                </div>
              )}
          </div>
      </div>

      {/* Font Size */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-tertiary)] flex items-center gap-2">
                <Type size={14} strokeWidth={1.5} /> {t('settingsFontSize')}
            </label>
            <span className="text-sm font-mono text-[var(--theme-text-link)] bg-[var(--theme-bg-tertiary)] px-2 py-0.5 rounded-md">{baseFontSize}px</span>
        </div>
        <input
            type="range" min="12" max="24" step="1"
            value={baseFontSize} onChange={(e) => setBaseFontSize(parseInt(e.target.value, 10))}
            className="w-full h-1.5 bg-[var(--theme-border-secondary)] rounded-lg appearance-none cursor-pointer accent-[var(--theme-bg-accent)] hover:accent-[var(--theme-bg-accent-hover)]"
        />
        <div className="flex justify-between text-xs text-[var(--theme-text-tertiary)] font-mono px-1">
            <span>12px</span>
            <span>18px</span>
            <span>24px</span>
        </div>
      </div>

      {/* File Strategy Section */}
      <div className="bg-[var(--theme-bg-tertiary)]/20 p-3 rounded-xl border border-[var(--theme-border-secondary)]/50">
          <div className="flex items-start justify-between mb-3">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-tertiary)] flex items-center gap-2">
                  <CloudUpload size={14} strokeWidth={1.5} />
                  {t('settings_filesApi_title')}
              </label>
              <Tooltip text={t('settings_filesApi_tooltip')}>
                  <Info size={14} className="text-[var(--theme-text-tertiary)] cursor-help" strokeWidth={1.5} />
              </Tooltip>
          </div>
          <p className="text-xs text-[var(--theme-text-secondary)] mb-3 leading-relaxed opacity-80">
              {t('settings_filesApi_desc')}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-0">
              <ToggleItem label={t('settings_filesApi_images')} checked={filesApiConfig.images} onChange={(v) => updateFileConfig('images', v)} small />
              <ToggleItem label={t('settings_filesApi_pdfs')} checked={filesApiConfig.pdfs} onChange={(v) => updateFileConfig('pdfs', v)} small />
              <ToggleItem label={t('settings_filesApi_audio')} checked={filesApiConfig.audio} onChange={(v) => updateFileConfig('audio', v)} small />
              <ToggleItem label={t('settings_filesApi_video')} checked={filesApiConfig.video} onChange={(v) => updateFileConfig('video', v)} small />
              <ToggleItem label={t('settings_filesApi_text')} checked={filesApiConfig.text} onChange={(v) => updateFileConfig('text', v)} small />
          </div>
      </div>

      {/* Interface Toggles Grid */}
      <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-tertiary)] mb-2">
              Interface Options
          </label>
          <div className="grid grid-cols-1 gap-1">
              <ToggleItem label={t('headerStream')} checked={isStreamingEnabled} onChange={setIsStreamingEnabled} />
              <ToggleItem label={t('isAutoTitleEnabled')} checked={isAutoTitleEnabled} onChange={setIsAutoTitleEnabled} />
              
              <ToggleItem label={t('settings_showWelcomeSuggestions_label')} checked={showWelcomeSuggestions} onChange={setShowWelcomeSuggestions} tooltip={t('settings_showWelcomeSuggestions_tooltip')} />

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
    </div>
  );
};
