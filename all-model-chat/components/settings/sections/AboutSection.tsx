
import React, { useEffect, useState } from 'react';
import { Github, Star, ExternalLink, CheckCircle2, ArrowUpCircle } from 'lucide-react';
import { translations } from '../../../utils/appUtils';
import { AppLogo } from '../../icons/AppLogo';
import { useResponsiveValue } from '../../../hooks/useDevice';

interface AboutSectionProps {
  t: (key: keyof typeof translations) => string;
}

export const AboutSection: React.FC<AboutSectionProps> = ({ t }) => {
  const iconSize = useResponsiveValue(18, 20);
  const currentVersion = "1.8.3"; 
  const [stars, setStars] = useState<number | null>(null);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);

  useEffect(() => {
    // Fetch Stars
    fetch('https://api.github.com/repos/yeahhe365/All-Model-Chat')
      .then(res => res.json())
      .then(data => {
        if (data.stargazers_count !== undefined) {
          setStars(data.stargazers_count);
        }
      })
      .catch(err => console.error('Failed to fetch stars', err));

    // Fetch Latest Release
    fetch('https://api.github.com/repos/yeahhe365/All-Model-Chat/releases/latest')
      .then(res => res.json())
      .then(data => {
        if (data.tag_name) {
          setLatestVersion(data.tag_name);
        }
      })
      .catch(err => console.error('Failed to fetch release info', err));
  }, []);

  const isUpdateAvailable = latestVersion && latestVersion.replace(/^v/, '') !== currentVersion;

  return (
    <div className="flex flex-col items-center justify-center py-6 px-4 space-y-8 text-center h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Logo Section with Glow */}
      <div className="relative group">
        <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
        <div className="relative">
            <AppLogo className="w-48 h-auto drop-shadow-2xl" />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-lg space-y-4">
        <div className="flex flex-col items-center gap-3">
             <h3 className="text-2xl font-bold text-[var(--theme-text-primary)] tracking-tight">{t('about_title')}</h3>
             
             {/* Version Badge */}
             <a 
                href="https://github.com/yeahhe365/All-Model-Chat/releases" 
                target="_blank" 
                rel="noopener noreferrer"
                className={`
                    inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 group
                    ${isUpdateAvailable 
                        ? 'bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30' 
                        : 'bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-secondary)] border-[var(--theme-border-secondary)] hover:border-[var(--theme-text-secondary)]'
                    }
                `}
                title={isUpdateAvailable ? `New version ${latestVersion} available` : 'Current version'}
             >
                {isUpdateAvailable ? (
                    <ArrowUpCircle size={14} className="animate-bounce" />
                ) : (
                    <CheckCircle2 size={14} className="text-green-500" />
                )}
                
                <span className="font-mono">v{currentVersion}</span>
                
                {isUpdateAvailable && (
                    <>
                        <span className="w-px h-3 bg-current opacity-20 mx-0.5"></span>
                        <span className="font-bold">{latestVersion}</span>
                    </>
                )}
                
                <span className="text-[10px] uppercase tracking-wide opacity-80 group-hover:opacity-100 ml-1">
                    {isUpdateAvailable ? t('about_update_available') : t('about_latest_version')}
                </span>
                
                <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 transition-opacity -ml-1" />
             </a>
        </div>
        
        <p className="text-sm text-[var(--theme-text-secondary)] leading-relaxed">
          {t('about_description')}
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
        <a 
          href="https://github.com/yeahhe365/All-Model-Chat" 
          target="_blank" 
          rel="noopener noreferrer"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3 text-sm font-semibold text-white bg-[#24292F] hover:bg-[#24292F]/90 dark:bg-white dark:text-black dark:hover:bg-gray-200 rounded-xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
        >
          <Github size={iconSize} />
          <span>{t('about_view_on_github')}</span>
        </a>

        {stars !== null && (
             <a 
             href="https://github.com/yeahhe365/All-Model-Chat/stargazers" 
             target="_blank" 
             rel="noopener noreferrer"
             className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium text-[var(--theme-text-primary)] bg-[var(--theme-bg-input)] border border-[var(--theme-border-secondary)] hover:bg-[var(--theme-bg-tertiary)] hover:border-[var(--theme-border-focus)] rounded-xl transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 group"
           >
             <Star size={iconSize} className="text-yellow-500 fill-yellow-500 group-hover:scale-110 transition-transform duration-300" />
             <span className="tabular-nums">{stars.toLocaleString()}</span>
             <span className="text-[var(--theme-text-tertiary)] ml-1">Stars</span>
           </a>
        )}
      </div>
    </div>
  );
};
