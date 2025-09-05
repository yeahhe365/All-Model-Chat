import React from 'react';
import { GitBranch } from 'lucide-react';
import { APP_LOGO_SVG_DATA_URI } from '../../constants/appConstants';
import { getResponsiveValue, translations } from '../../utils/appUtils';

interface AboutSectionProps {
  t: (key: keyof typeof translations) => string;
}

export const AboutSection: React.FC<AboutSectionProps> = ({ t }) => {
  const iconSize = getResponsiveValue(14, 16);
  const version = "1.4.5"; 

  return (
    <div className="space-y-3 p-3 sm:p-4 rounded-lg bg-[var(--theme-bg-secondary)] text-center">
      <img src={APP_LOGO_SVG_DATA_URI} alt={t('about_logo_alt')} className="w-16 h-16 mx-auto mb-4" />
      <h3 className="text-xl font-semibold text-[var(--theme-text-primary)] flex items-center justify-center mb-1">
        {t('about_title')}
      </h3>
      <p className="text-sm text-[var(--theme-text-tertiary)] mb-4">
        {t('about_version')}: <span className="font-semibold text-[var(--theme-text-primary)]">{version}</span>
      </p>

      <p className="text-sm text-[var(--theme-text-secondary)] max-w-md mx-auto">
        {t('about_description')}
      </p>

      <div className="pt-4 mt-4">
        <a 
          href="https://github.com/yeahhe365/All-Model-Chat" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors bg-[var(--theme-bg-tertiary)] hover:bg-[var(--theme-bg-input)] text-[var(--theme-text-link)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--theme-bg-secondary)] focus:ring-[var(--theme-border-focus)]"
        >
          <GitBranch size={iconSize} />
          <span>{t('about_view_on_github')}</span>
        </a>
      </div>
    </div>
  );
};