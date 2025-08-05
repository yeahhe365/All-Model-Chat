import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { AppSettings, translations } from '../../types';

const SettingsRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex justify-between items-center py-4 border-b border-[var(--theme-border-primary)]">
    <span className="text-sm text-[var(--theme-text-primary)]">{label}</span>
    <div>{children}</div>
  </div>
);

const Toggle: React.FC<{
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}> = ({ id, checked, onChange }) => (
  <label htmlFor={id} className="flex items-center cursor-pointer">
    <div className="relative">
      <input id={id} type="checkbox" className="sr-only peer" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <div className="w-12 h-7 bg-[var(--theme-bg-tertiary)] rounded-full peer peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-offset-2 peer-focus:ring-offset-[var(--theme-bg-primary)] peer-focus:ring-[var(--theme-border-focus)] peer-checked:bg-[var(--theme-bg-accent)] transition-colors duration-200 ease-in-out"></div>
      <div className="absolute left-1 top-1 w-5 h-5 bg-white rounded-full shadow transform transition-transform duration-200 ease-in-out peer-checked:translate-x-5"></div>
    </div>
  </label>
);

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
    { id: 'en', label: 'English (English)' },
    { id: 'zh', label: 'Chinese (中文)' },
  ];

  const currentLanguageDisplay = languageOptions.find(o => o.id === language)?.label;


  return (
    <div>
      <h3 className="text-lg font-semibold text-[var(--theme-text-primary)] flex items-center mb-4">
        {t('settingsAppearance')}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
        {/* Column 1 */}
        <div className="space-y-2">
          <SettingsRow label={t('settingsTheme')}>
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
          </SettingsRow>
          <div className="flex justify-between items-center py-4 border-b border-[var(--theme-border-primary)]">
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
          <SettingsRow label={t('settings_enableCompletionNotification_label')}>
              <Toggle 
                id="completion-notification-toggle" 
                checked={isCompletionNotificationEnabled} 
                onChange={setIsCompletionNotificationEnabled}
              />
          </SettingsRow>
          <div className="pt-4">
            <label htmlFor="base-font-size-slider" className="block text-sm font-medium text-[var(--theme-text-secondary)] mb-1.5">
              {t('settingsFontSize')}: <span className="font-mono text-[var(--theme-text-link)]">{baseFontSize}px</span>
            </label>
            <input
              id="base-font-size-slider" type="range" min="12" max="24" step="1"
              value={baseFontSize} onChange={(e) => setBaseFontSize(parseInt(e.target.value, 10))}
              className="w-full h-2 bg-[var(--theme-border-secondary)] rounded-lg appearance-none cursor-pointer accent-[var(--theme-bg-accent)]"
              aria-label={`Base font size for the application: ${baseFontSize}px`}
            />
          </div>
        </div>
        {/* Column 2 */}
        <div className="space-y-2">
            <h4 className="text-base font-semibold text-[var(--theme-text-primary)] flex items-center mb-1 md:mt-0 pt-4 md:pt-0 border-t md:border-none border-[var(--theme-border-primary)]">Rendering</h4>
            <SettingsRow label={t('settings_expandCodeBlocksByDefault_label')}>
                <Toggle id="expand-code-blocks" checked={expandCodeBlocksByDefault} onChange={setExpandCodeBlocksByDefault} />
            </SettingsRow>
            <SettingsRow label={t('settings_enableMermaidRendering_label')}>
                <Toggle id="mermaid-rendering" checked={isMermaidRenderingEnabled} onChange={setIsMermaidRenderingEnabled} />
            </SettingsRow>
            <SettingsRow label={t('settings_enableGraphvizRendering_label')}>
                <Toggle id="graphviz-rendering" checked={isGraphvizRenderingEnabled} onChange={setIsGraphvizRenderingEnabled} />
            </SettingsRow>
            <SettingsRow label={t('settings_autoScrollOnSend_label')}>
                <Toggle id="auto-scroll" checked={isAutoScrollOnSendEnabled} onChange={setIsAutoScrollOnSendEnabled} />
            </SettingsRow>
        </div>
      </div>
    </div>
  );
};