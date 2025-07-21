import React from 'react';
import { GitBranch } from 'lucide-react';
import { APP_LOGO_SVG_DATA_URI } from '../../constants/appConstants';
import { getResponsiveValue } from '../../utils/appUtils';

interface AboutSectionProps {
  t: (key: string) => string;
}

export const AboutSection: React.FC<AboutSectionProps> = ({ t }) => {
  const iconSize = getResponsiveValue(14, 16);
  const version = "初代"; 

  return (
    <div className="space-y-3 p-3 sm:p-4 border border-[var(--theme-border-secondary)] rounded-lg bg-[var(--theme-bg-secondary)] text-center">
      <img src={APP_LOGO_SVG_DATA_URI} alt="All Model Chat Logo" className="w-16 h-16 mx-auto mb-4" />
      <h3 className="text-xl font-semibold text-[var(--theme-text-primary)] flex items-center justify-center mb-1">
        All Model Chat
      </h3>
      <p className="text-sm text-[var(--theme-text-tertiary)] mb-4">
        版本: <span className="font-semibold text-[var(--theme-text-primary)]">{version}</span>
      </p>

      <p className="text-sm text-[var(--theme-text-secondary)] max-w-md mx-auto">
        A versatile chatbot interface designed to interact with the Gemini API, featuring system message configuration, streaming responses, context management, and dynamic model selection.
      </p>

      <div className="pt-4 mt-4 border-t border-[var(--theme-border-secondary)]">
        <a 
          href="https://github.com/yeahhe365/All-Model-Chat" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors bg-[var(--theme-bg-tertiary)] hover:bg-[var(--theme-bg-input)] text-[var(--theme-text-link)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--theme-bg-secondary)] focus:ring-[var(--theme-border-focus)]"
        >
          <GitBranch size={iconSize} />
          <span>View on GitHub</span>
        </a>
      </div>
    </div>
  );
};