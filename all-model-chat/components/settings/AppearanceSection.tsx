import React from 'react';
import { Wand2 } from 'lucide-react';
import { Theme } from '../../constants/themeConstants';
import { AppSettings } from '../../types';
import { getResponsiveValue } from '../../utils/appUtils';
import { Select } from './shared/Tooltip';

interface AppearanceSectionProps {
  themeId: string;
  setThemeId: (value: string) => void;
  availableThemes: Theme[];
  baseFontSize: number;
  setBaseFontSize: (value: number) => void;
  language: AppSettings['language'];
  setLanguage: (value: AppSettings['language']) => void;
  t: (key: string) => string;
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

  return (
    <div className="space-y-4 p-3 sm:p-4 border border-[var(--theme-border-secondary)] rounded-lg bg-[var(--theme-bg-secondary)]">
      <h3 className="text-sm font-semibold text-[var(--theme-text-primary)] flex items-center mb-1">
        <Wand2 size={iconSize} className="mr-2 text-[var(--theme-text-link)] opacity-80" />
        {t('settingsAppearance')}
      </h3>
      <Select
        id="theme-select"
        label={t('settingsTheme')}
        value={themeId}
        onChange={(e) => setThemeId(e.target.value)}
        aria-label="Select application theme"
      >
        {availableThemes.map((theme) => ( <option key={theme.id} value={theme.id}>{theme.name}</option> ))}
      </Select>
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
