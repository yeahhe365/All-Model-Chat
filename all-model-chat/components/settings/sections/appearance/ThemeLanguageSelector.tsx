
import React, { useState, useRef } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { translations } from '../../../../utils/appUtils';
import { IconThemeSystem, IconThemeDark, IconThemeLight } from '../../../icons/CustomIcons';
import { useClickOutside } from '../../../../hooks/useClickOutside';

interface ThemeLanguageSelectorProps {
  themeId: 'system' | 'onyx' | 'pearl';
  setThemeId: (value: 'system' | 'onyx' | 'pearl') => void;
  language: 'en' | 'zh' | 'system';
  setLanguage: (value: 'en' | 'zh' | 'system') => void;
  t: (key: keyof typeof translations) => string;
}

export const ThemeLanguageSelector: React.FC<ThemeLanguageSelectorProps> = ({
  themeId,
  setThemeId,
  language,
  setLanguage,
  t
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

  return (
    <div className="grid grid-cols-1 gap-2">
      {/* Theme Selector */}
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

      {/* Language Selector */}
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
  );
};
