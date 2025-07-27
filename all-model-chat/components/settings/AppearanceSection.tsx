import React from 'react';
import { Wand2 } from 'lucide-react';
import { Theme } from '../../constants/themeConstants';
import { AppSettings, translations } from '../../types';
import { getResponsiveValue } from '../../utils/appUtils';
import { Select } from './shared/Tooltip';

interface AppearanceSectionProps {
  themeId: 'system' | 'onyx' | 'pearl';
  setThemeId: (value: 'system' | 'onyx' | 'pearl') => void;
  availableThemes: Theme[];
  baseFontSize: number;
  setBaseFontSize: (value: number) => void;
  language: AppSettings['language'];
  setLanguage: (value: AppSettings['language']) => void;
  t: (key: keyof typeof translations) => string;
}

export const AppearanceSection: React.FC<AppearanceSectionProps> = ({
  themeId,
  setThemeId,
  availableThemes,
  baseFontSize,
  setBaseFontSize,
  language,
  setLanguage,
  t,
}) => {
  const iconSize = getResponsiveValue(14, 16);

  const themeOptions: { id: 'system' | 'onyx' | 'pearl'; labelKey: keyof typeof translations }[] = [
    { id: 'system', labelKey: 'settingsThemeSystem' },
    { id: 'onyx', labelKey: 'settingsThemeDark' },
    { id: 'pearl', labelKey: 'settingsThemeLight' },
  ];

  return (
    <div className="space-y-4 p-3 sm:p-4 border border-[var(--theme-border-secondary)] rounded-lg bg-[var(--theme-bg-secondary)]">
      <h3 className="text-sm font-semibold text-[var(--theme-text-primary)] flex items-center mb-1">
        <Wand2 size={iconSize} className="mr-2 text-[var(--theme-text-link)] opacity-80" />
        {t('settingsAppearance')}
      </h3>
       <div>
        <label className="block text-xs font-medium text-[var(--theme-text-secondary)] mb-1.5">
          {t('settingsTheme')}
        </label>
        <div role="radiogroup" className="flex w-full bg-[var(--theme-bg-tertiary)] p-1 rounded-lg">
          {themeOptions.map(option => (
            <button
              key={option.id}
              role="radio"
              aria-checked={themeId === option.id}
              onClick={() => setThemeId(option.id)}
              className={`flex-1 text-center px-2 py-1.5 text-sm font-medium rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--theme-bg-tertiary)] focus:ring-[var(--theme-border-focus)] ${
                themeId === option.id
                  ? 'bg-[var(--theme-bg-accent)] text-[var(--theme-text-accent)] shadow'
                  : 'text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-input)]/50'
              }`}
            >
              {t(option.labelKey)}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label htmlFor="base-font-size-slider" className="block text-xs font-medium text-[var(--theme-text-secondary)] mb-1.5">
          {t('settingsFontSize')}: <span className="font-mono text-[var(--theme-text-link)]">{baseFontSize}px</span>
        </label>
        <input
          id="base-font-size-slider" type="range" min="12" max="24" step="1"
          value={baseFontSize} onChange={(e) => setBaseFontSize(parseInt(e.target.value, 10))}
          className="w-full h-2 bg-[var(--theme-border-secondary)] rounded-lg appearance-none cursor-pointer accent-[var(--theme-bg-accent)]"
          aria-label={`Base font size for the application: ${baseFontSize}px`}
        />
      </div>
      <Select
        id="language-select"
        label={t('settingsLanguage')}
        value={language}
        onChange={(e) => setLanguage(e.target.value as 'en' | 'zh' | 'system')}
        aria-label="Select application language"
      >
        <option value="system">{t('settingsLanguageSystem')}</option>
        <option value="en">{t('settingsLanguageEn')}</option>
        <option value="zh">{t('settingsLanguageZh')}</option>
      </Select>
    </div>
  );
};