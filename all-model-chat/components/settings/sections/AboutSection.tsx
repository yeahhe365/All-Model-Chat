
import React, { useEffect, useState } from 'react';
import { Github, Star, ExternalLink } from 'lucide-react';
import { translations } from '../../../utils/appUtils';
import { AppLogo } from '../../icons/AppLogo';
import { useResponsiveValue } from '../../../hooks/useDevice';

interface AboutSectionProps {
  t: (key: keyof typeof translations) => string;
}

const compareVersions = (v1: string, v2: string) => {
  const parts1 = v1.replace(/^v/, '').split('.').map(Number);
  const parts2 = v2.replace(/^v/, '').split('.').map(Number);
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return 1; // v1 is greater
    if (p1 < p2) return -1; // v2 is greater
  }
  return 0; // Equal
};

export const AboutSection: React.FC<AboutSectionProps> = ({ t }) => {
  const iconSize = useResponsiveValue(18, 20);
  const currentVersion = "1.8.4"; 
  const [stars, setStars] = useState<number | null>(null);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [repoRes, releaseRes] = await Promise.allSettled([
          fetch('https://api.github.com/repos/yeahhe365/All-Model-Chat'),
          fetch('https://api.github.com/repos/yeahhe365/All-Model-Chat/releases/latest')
        ]);

        if (repoRes.status === 'fulfilled' && repoRes.value.ok) {
          const data = await repoRes.value.json();
          setStars(data.stargazers_count);
        }

        if (releaseRes.status === 'fulfilled' && releaseRes.value.ok) {
          const data = await releaseRes.value.json();
          setLatestVersion(data.tag_name);
        }
      } catch (err) {
        console.error('Failed to fetch about info', err);
      }
    };

    fetchData();
  }, []);

  // Comparison Logic: 1 = Remote is newer, -1 = Local is newer (Beta), 0 = Same
  const comparison = latestVersion ? compareVersions(latestVersion, currentVersion) : 0;
  const isUpdateAvailable = comparison === 1;
  const isBeta = comparison === -1;

  const getStatusColor = () => {
      if (isUpdateAvailable) return 'bg-amber-500';
      if (isBeta) return 'bg-purple-500';
      return 'bg-emerald-500';
  };

  const getStatusText = () => {
    if (isUpdateAvailable) return t('about_update_available');
    if (isBeta) return 'Beta';
    return t('about_latest_version');
  };

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
      <div className="max-w-lg space-y-6 flex flex-col items-center">
         <h3 className="text-3xl font-bold text-[var(--theme-text-primary)] tracking-tight">{t('about_title')}</h3>
         
         {/* Redesigned Version Pill */}
         <a 
            href="https://github.com/yeahhe365/All-Model-Chat/releases" 
            target="_blank" 
            rel="noopener noreferrer"
            className="group relative inline-flex items-center justify-center p-[1px] overflow-hidden rounded-full hover:scale-105 transition-transform duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--theme-border-focus)] focus:ring-offset-[var(--theme-bg-primary)]"
            title={isUpdateAvailable ? `Update available: ${latestVersion}` : undefined}
         >
            {/* Gradient Border Background */}
            <span className={`absolute inset-0 transition-all duration-300 ${
                isUpdateAvailable ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-red-500' : 
                isBeta ? 'bg-gradient-to-r from-purple-400 via-indigo-500 to-blue-500' :
                'bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500'
            } opacity-70 group-hover:opacity-100`}></span>
            
            {/* Inner Content */}
            <span className="relative flex items-center gap-3 px-5 py-2 transition-all ease-in duration-75 bg-[var(--theme-bg-primary)] rounded-full group-hover:bg-opacity-[0.96]">
                <span className="font-mono text-sm font-bold text-[var(--theme-text-primary)]">
                    v{currentVersion}
                </span>
                
                <span className="w-px h-3.5 bg-[var(--theme-border-secondary)] opacity-50"></span>
                
                <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${getStatusColor()}`}></span>
                      <span className={`relative inline-flex rounded-full h-2 w-2 ${getStatusColor()}`}></span>
                    </span>
                    <span className={`text-xs font-medium ${isUpdateAvailable ? 'text-amber-500' : 'text-[var(--theme-text-secondary)]'}`}>
                        {getStatusText()}
                        {isUpdateAvailable && latestVersion && (
                            <span className="ml-1 opacity-80">({latestVersion})</span>
                        )}
                    </span>
                </div>
                
                <ExternalLink size={12} className="text-[var(--theme-text-tertiary)] group-hover:text-[var(--theme-text-primary)] transition-colors opacity-0 group-hover:opacity-100 -ml-1" />
            </span>
         </a>
        
        <p className="text-sm text-[var(--theme-text-secondary)] leading-relaxed max-w-md">
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
