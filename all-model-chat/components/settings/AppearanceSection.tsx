import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Info, Moon, Sun, Monitor, Globe, Type } from 'lucide-react';
import { translations } from '../../utils/appUtils';
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

  const themeOptions: { id: 'system' | 'onyx' | 'pearl'; labelKey: keyof typeof translations; icon: React.ReactNode }[] = [
    { id: 'system', labelKey: 'settingsThemeSystem', icon: <Monitor size={16} strokeWidth={1.5} /> },
    { id: 'onyx', labelKey: 'settingsThemeDark', icon: <Moon size={16} strokeWidth={1.5} /> },
    { id: 'pearl', labelKey: 'settingsThemeLight', icon: <Sun size={16} strokeWidth={1.5} /> },
  ];

  const languageOptions: { id: 'system' | 'en' | 'zh'; label: string; }[] = [
    { id: 'system', label: 'System Default' },
    { id: 'en', label: 'English' },
    { id: 'zh', label: '简体中文' },
  ];

  const currentLanguageDisplay = languageOptions.find(o => o.id === language)?.label;

  const ToggleItem = ({ label, checked, onChange, tooltip }: { label: string, checked: boolean, onChange: (v: boolean) => void, tooltip?: string }) => (
      <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--theme-bg-tertiary)]/30 border border-[var(--theme-border-secondary)] hover:border-[var(--theme-border-focus)] transition-colors">
          <span className="text-sm text-[var(--theme-text-primary)] flex items-center gap-2">
              {label}
              {tooltip && <Tooltip text={tooltip}><Info size={14} className="text-[var(--theme-text-tertiary)] cursor-help" strokeWidth={1.5} /></Tooltip>}
          </span>
          <Toggle id={label} checked={checked} onChange={onChange} />
      </div>
  );

  return (
    <div className="space-y-8">
      {/* Theme & Language */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-tertiary)] flex items-center gap-2">
                  {t('settingsTheme')}
              </label>
              <div className="flex gap-2 p-1 bg-[var(--theme-bg-tertiary)]/50 rounded-xl border border-[var(--theme-border-secondary)]">
                  {themeOptions.map(option => (
                    <button
                        key={option.id}
                        onClick={() => setThemeId(option.id)}
                        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)] ${
                            themeId === option.id
                            ? 'bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)] shadow-sm'
                            : 'text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-input)]/50'
                        }`}
                    >
                        {option.icon}
                        <span className="hidden sm:inline">{t(option.labelKey)}</span>
                    </button>
                  ))}
              </div>
          </div>

          <div className="space-y-3">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-tertiary)] flex items-center gap-2">
                   {t('settingsLanguage')}
              </label>
              <div className="relative" ref={languageDropdownRef}>
                  <button
                    onClick={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-sm bg-[var(--theme-bg-input)] border border-[var(--theme-border-secondary)] rounded-xl hover:border-[var(--theme-border-focus)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)]"
                  >
                    <span className="flex items-center gap-2 text-[var(--theme-text-primary)]">
                        <Globe size={16} className="text-[var(--theme-text-tertiary)]" strokeWidth={1.5} />
                        {currentLanguageDisplay}
                    </span>
                    <ChevronDown size={16} className={`text-[var(--theme-text-tertiary)] transition-transform ${isLanguageDropdownOpen ? 'rotate-180' : ''}`} strokeWidth={1.5} />
                  </button>

                  {isLanguageDropdownOpen && (
                    <div className="absolute top-full left-0 w-full mt-2 py-1 bg-[var(--theme-bg-primary)] border border-[var(--theme-border-secondary)] rounded-xl shadow-xl z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
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
      </div>

      <hr className="border-[var(--theme-border-primary)]/50" />

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

      <hr className="border-[var(--theme-border-primary)]/50" />

      {/* Interface Toggles Grid */}
      <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-tertiary)] mb-4">
              Interface Options
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <ToggleItem label={t('headerStream')} checked={isStreamingEnabled} onChange={setIsStreamingEnabled} />
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
          </div>
      </div>
    </div>
  );
};