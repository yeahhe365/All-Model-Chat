
import React from 'react';
import { useI18n } from '../../../../contexts/I18nContext';
import { IconThemeSystem, IconThemeDark, IconThemeLight } from '../../../icons/CustomIcons';
import { AppSettings } from '../../../../types';
import { Select } from '../../../shared/Select';

interface ThemeLanguageSelectorProps {
  settings: AppSettings;
  onUpdate: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}

export const ThemeLanguageSelector: React.FC<ThemeLanguageSelectorProps> = ({
  settings,
  onUpdate,
}) => {
  const { t } = useI18n();
  const themeOptions = [
    { id: 'system', labelKey: 'settingsThemeSystem', icon: <IconThemeSystem size={16} strokeWidth={1.5} /> },
    { id: 'onyx', labelKey: 'settingsThemeDark', icon: <IconThemeDark size={16} strokeWidth={1.5} /> },
    { id: 'pearl', labelKey: 'settingsThemeLight', icon: <IconThemeLight size={16} strokeWidth={1.5} /> },
  ] as const;

  const languageOptions = [
    { id: 'system', label: t('settingsLanguageSystem') },
    { id: 'en', label: t('settingsLanguageEn') },
    { id: 'zh', label: t('settingsLanguageZh') },
  ] as const;

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
                    onClick={() => onUpdate('themeId', option.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)] ${
                        settings.themeId === option.id
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
      <Select
          id="language-selector"
          label={t('settingsLanguage')}
          layout="horizontal"
          value={settings.language}
          onChange={(e) => onUpdate('language', e.target.value as any)}
          className="py-3"
          wrapperClassName="relative w-48"
      >
          {languageOptions.map(option => (
              <option key={option.id} value={option.id}>
                  {option.label}
              </option>
          ))}
      </Select>
    </div>
  );
};
