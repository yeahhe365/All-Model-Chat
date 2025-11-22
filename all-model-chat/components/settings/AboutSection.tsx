import React from 'react';
import { GitBranch } from 'lucide-react';
import { getResponsiveValue, translations } from '../../utils/appUtils';
import { AppLogo } from '../icons/AppLogo';

interface AboutSectionProps {
  t: (key: keyof typeof translations) => string;
}

export const AboutSection: React.FC<AboutSectionProps> = ({ t }) => {
  const iconSize = getResponsiveValue(14, 16);
  const version = "1.7.2"; 

  return (
    <div className="space-y-3 py-4 text-center">
      <div className="flex justify-center mb-4">
        <AppLogo className="w-32 h-auto" />
      </div>
      
      <p className="text-sm text-[var(--theme-text-tertiary)] mb-4">
        {t('about_version')}: <span className="font-semibold text-[var(--theme-text-primary)]">{version}</span>
      </p>

      <p className="text-sm text-[var(--theme-text-secondary)] max-w-md mx-auto leading-relaxed">
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