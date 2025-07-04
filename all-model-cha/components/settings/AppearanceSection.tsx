import React from 'react';
import { Wand2 } from 'lucide-react';
import { Theme } from '../../constants/themeConstants';
import { AppSettings } from '../../types';

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
  const inputBaseClasses = "w-full p-2 border rounded-md focus:ring-2 focus:border-[var(--theme-border-focus)] text-[var(--theme-text-primary)] placeholder-[var(--theme-text-tertiary)] text-sm";
  const enabledInputClasses = "bg-[var(--theme-bg-input)] border-[var(--theme-border-secondary)] focus:ring-[var(--theme-border-focus)]";
  const iconSize = window.innerWidth < 640 ? 14 : 16;

  return (
    <div className="space-y-4 p-3 sm:p-4 border border-[var(--theme-border-secondary)] rounded-lg bg-[var(--theme-bg-secondary)]">
      <h3 className="text-sm font-semibold text-[var(--theme-text-primary)] flex items-center mb-1">
        <Wand2 size={iconSize} className="mr-2 text-[var(--theme-text-link)] opacity-80" />
        {t('settingsAppearance')}
      </h3>
      <div>
        <label htmlFor="theme-select" className="block text-xs font-medium text-[var(--theme-text-secondary)] mb-1.5">{t('settingsTheme')}</label>
        <div className="relative">
            <select
              id="theme-select" value={themeId} onChange={(e) => setThemeId(e.target.value)}
              className={`${inputBaseClasses} ${enabledInputClasses} appearance-none pr-8`}
              aria-label="Select application theme"
            >
              {availableThemes.map((theme) => ( <option key={theme.id} value={theme.id}>{theme.name}</option> ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[var(--theme-text-tertiary)]">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.516 7.548c.436-.446 1.043-.48 1.576 0L10 10.405l2.908-2.857c.533-.48 1.14-.446 1.576 0 .436.445.408 1.197 0 1.615l-3.695 3.63c-.533.48-1.14.446-1.576 0L5.516 9.163c-.408-.418-.436-1.17 0-1.615z"/></svg>
            </div>
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
      <div>
        <label htmlFor="language-select" className="block text-xs font-medium text-[var(--theme-text-secondary)] mb-1.5">{t('settingsLanguage')}</label>
        <div className="relative">
            <select
              id="language-select" value={language} onChange={(e) => setLanguage(e.target.value as 'en' | 'zh' | 'system')}
              className={`${inputBaseClasses} ${enabledInputClasses} appearance-none pr-8`}
              aria-label="Select application language"
            >
              <option value="system">{t('settingsLanguageSystem')}</option>
              <option value="en">{t('settingsLanguageEn')}</option>
              <option value="zh">{t('settingsLanguageZh')}</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[var(--theme-text-tertiary)]">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.516 7.548c.436-.446 1.043-.48 1.576 0L10 10.405l2.908-2.857c.533-.48 1.14-.446 1.576 0 .436.445.408 1.197 0 1.615l-3.695 3.63c-.533.48-1.14.446-1.576 0L5.516 9.163c-.408-.418-.436-1.17 0-1.615z"/></svg>
            </div>
        </div>
      </div>
    </div>
  );
};
