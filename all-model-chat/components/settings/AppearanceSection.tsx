import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Info } from 'lucide-react';
import { AppSettings, translations } from '../../types';
import { Toggle, Tooltip } from './shared/Tooltip';

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
  t: (key: keyof typeof translations) => string;
}

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
  t,
}) => {
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
  const languageDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (languageDropdownRef.current && !languageDropdownRef.current.contains(event.target as Node)) {
        setIsLanguageDropdownOpen(false);
      }
    };
    if (isLanguageDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isLanguageDropdownOpen]);

  const themeOptions: { id: 'system' | 'onyx' | 'pearl'; labelKey: keyof typeof translations }[] = [
    { id: 'system', labelKey: 'settingsThemeSystem' },
    { id: 'onyx', labelKey: 'settingsThemeDark' },
    { id: 'pearl', labelKey: 'settingsThemeLight' },
  ];

  const languageOptions: { id: 'system' | 'en' | 'zh'; label: string; }[] = [
    { id: 'system', label: 'System Default (跟随系统)' },
    { id: 'en', label: 'English' },
    { id: 'zh', label: '简体中文' },
  ];

  const currentLanguageDisplay = languageOptions.find(o => o.id === language)?.label;

  return (
    <div>
      <h3 className="text-lg font-semibold text-[var(--theme-text-primary)] flex items-center mb-4">
        {t('settingsTabInterface')}
      </h3>
      <div className="divide-y divide-[var(--theme-border-primary)]">
        
        <div className="flex justify-between items-center py-4">
            <span className="text-sm text-[var(--theme-text-primary)]">{t('settingsTheme')}</span>
            <div role="radiogroup" className="flex bg-[var(--theme-bg-tertiary)] p-0.5 rounded-lg">
                {themeOptions.map(option => (
                <button
                    key={option.id}
                    role="radio"
                    aria-checked={themeId === option.id}
                    onClick={() => setThemeId(option.id)}
                    className={`flex-1 text-center px-3 py-1 text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--theme-bg-tertiary)] focus:ring-[var(--theme-border-focus)] ${
                        themeId === option.id
                        ? 'bg-[var(--theme-bg-primary)] text-[var(--theme-text-link)] shadow-sm'
                        : 'text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-input)]/50'
                    }`}
                >
                    {t(option.labelKey)}
                </button>
                ))}
            </div>
        </div>
        
        <div className="flex justify-between items-center py-4">
            <span className="text-sm text-[var(--theme-text-primary)]">{t('settingsLanguage')}</span>
            <div className="relative" ref={languageDropdownRef}>
                <button
                onClick={() => setIsLanguageDropdownOpen(prev => !prev)}
                className="flex items-center gap-2 text-left text-sm rounded-md transition-colors hover:bg-[var(--theme-bg-tertiary)]/50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-[var(--theme-bg-primary)] focus:ring-[var(--theme-border-focus)] p-1 -m-1"
                aria-haspopup="listbox"
                aria-expanded={isLanguageDropdownOpen}
                >
                <span className="text-[var(--theme-text-secondary)]">{currentLanguageDisplay}</span>
                <ChevronDown size={16} className={`text-[var(--theme-text-tertiary)] transition-transform duration-200 ${isLanguageDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isLanguageDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-[var(--theme-bg-primary)] border border-[var(--theme-border-secondary)] rounded-md shadow-lg z-10 py-1" style={{ animation: 'fadeInUp 0.2s ease-out both' }} role="listbox">
                    <ul className="space-y-0.5">
                    {languageOptions.map(option => (
                        <li key={option.id}>
                        <button
                            onClick={() => {
                            setLanguage(option.id);
                            setIsLanguageDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-1.5 text-sm flex items-center justify-between rounded-md mx-1 w-[calc(100%-0.5rem)] transition-colors ${
                            language === option.id
                                ? 'bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-300'
                                : 'text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)] hover:text-[var(--theme-text-primary)]'
                            }`}
                            role="option"
                            aria-selected={language === option.id}
                        >
                            <span>{option.label}</span>
                            {language === option.id && <Check size={16} />}
                        </button>
                        </li>
                    ))}
                    </ul>
                </div>
                )}
            </div>
        </div>
        
        <div className="py-4">
            <label htmlFor="base-font-size-slider" className="block text-sm font-medium text-[var(--theme-text-primary)] mb-2">
                {t('settingsFontSize')}: <span className="font-mono text-[var(--theme-text-link)]">{baseFontSize}px</span>
            </label>
            <input
                id="base-font-size-slider" type="range" min="12" max="24" step="1"
                value={baseFontSize} onChange={(e) => setBaseFontSize(parseInt(e.target.value, 10))}
                className="w-full h-2 bg-[var(--theme-border-secondary)] rounded-lg appearance-none cursor-pointer accent-[var(--theme-bg-accent)]"
                aria-label={`Base font size for the application: ${baseFontSize}px`}
            />
        </div>

        <div className="flex justify-between items-center py-4">
            <span className="text-sm text-[var(--theme-text-primary)]">{t('headerStream')}</span>
            <Toggle id="streaming-toggle" checked={isStreamingEnabled} onChange={setIsStreamingEnabled} />
        </div>
        
        <div className="flex justify-between items-center py-4">
            <span className="text-sm text-[var(--theme-text-primary)]">{t('isAutoTitleEnabled')}</span>
            <Toggle id="auto-title-toggle" checked={isAutoTitleEnabled} onChange={setIsAutoTitleEnabled} />
        </div>
        
        <div className="py-4">
            <div className="flex justify-between items-center">
                <span className="text-sm text-[var(--theme-text-primary)]">{t('settings_enableSuggestions_label')}</span>
                <Toggle id="suggestions-toggle" checked={isSuggestionsEnabled} onChange={setIsSuggestionsEnabled} />
            </div>
            {isSuggestionsEnabled && (
                <div style={{ animation: 'fadeIn 0.3s ease-out both' }} className="pl-6 pt-4">
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-[var(--theme-text-secondary)]">{t('settings_autoSendOnSuggestionClick_label')}</span>
                        <Toggle id="auto-send-suggestions-toggle" checked={isAutoSendOnSuggestionClick} onChange={setIsAutoSendOnSuggestionClick} />
                    </div>
                </div>
            )}
        </div>

        <div className="flex justify-between items-center py-4">
            <span className="text-sm text-[var(--theme-text-primary)]">{t('settings_enableCompletionNotification_label')}</span>
            <Toggle id="completion-notification-toggle" checked={isCompletionNotificationEnabled} onChange={setIsCompletionNotificationEnabled} />
        </div>

        <div className="flex justify-between items-center py-4">
            <span className="text-sm text-[var(--theme-text-primary)]">{t('settings_autoScrollOnSend_label')}</span>
            <Toggle id="auto-scroll" checked={isAutoScrollOnSendEnabled} onChange={setIsAutoScrollOnSendEnabled} />
        </div>

        <div className="flex justify-between items-center py-4">
            <span className="text-sm text-[var(--theme-text-primary)]">{t('settings_expandCodeBlocksByDefault_label')}</span>
            <Toggle id="expand-code-blocks" checked={expandCodeBlocksByDefault} onChange={setExpandCodeBlocksByDefault} />
        </div>
        
        <div className="flex justify-between items-center py-4">
            <span className="text-sm text-[var(--theme-text-primary)]">{t('settings_enableMermaidRendering_label')}</span>
            <Toggle id="mermaid-rendering" checked={isMermaidRenderingEnabled} onChange={setIsMermaidRenderingEnabled} />
        </div>
        
        <div className="flex justify-between items-center py-4">
            <span className="text-sm text-[var(--theme-text-primary)]">{t('settings_enableGraphvizRendering_label')}</span>
            <Toggle id="graphviz-rendering" checked={isGraphvizRenderingEnabled} onChange={setIsGraphvizRenderingEnabled} />
        </div>
        
        <div className="flex justify-between items-center py-4">
            <span className="text-sm text-[var(--theme-text-primary)] flex items-center">
                {t('settings_autoFullscreenHtml_label')}
                <Tooltip text={t('settings_autoFullscreenHtml_tooltip')}>
                    <Info size={12} className="text-[var(--theme-text-tertiary)] cursor-help" />
                </Tooltip>
            </span>
            <Toggle id="auto-preview-html" checked={autoFullscreenHtml} onChange={setAutoFullscreenHtml} />
        </div>
        
      </div>
    </div>
  );
};