
import React, { useEffect, useState } from 'react';
import { Github, Star, ExternalLink } from 'lucide-react';
import { useI18n } from '../../../contexts/I18nContext';
import { AppLogo } from '../../icons/AppLogo';
import { useResponsiveValue } from '../../../hooks/useDevice';
import packageJson from '../../../../package.json';

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

export const AboutSection: React.FC = () => {
  const { language, t } = useI18n();
  const iconSize = useResponsiveValue(18, 20);
  const isCompactViewport = useResponsiveValue(true, false, 900);
  const currentVersion = packageJson.version;
  const [stars, setStars] = useState<number | null>(null);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasReleaseData, setHasReleaseData] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    const fetchData = async () => {
      try {
        const [repoRes, releaseRes] = await Promise.allSettled([
          fetch('https://api.github.com/repos/yeahhe365/All-Model-Chat'),
          fetch('https://api.github.com/repos/yeahhe365/All-Model-Chat/releases/latest')
        ]);

        if (isCancelled) {
          return;
        }

        if (repoRes.status === 'fulfilled' && repoRes.value.ok) {
          const data = await repoRes.value.json();
          if (typeof data.stargazers_count === 'number') {
            setStars(data.stargazers_count);
          } else {
            setStars(null);
          }
        }

        if (releaseRes.status === 'fulfilled' && releaseRes.value.ok) {
          const data = await releaseRes.value.json();
          if (typeof data.tag_name === 'string' && data.tag_name.length > 0) {
            setLatestVersion(data.tag_name);
            setHasReleaseData(true);
          } else {
            setLatestVersion(null);
            setHasReleaseData(false);
          }
        } else {
          setHasReleaseData(false);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('Failed to fetch about info', err);
          setHasReleaseData(false);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isCancelled = true;
    };
  }, []);

  // Comparison Logic: 1 = Remote is newer, -1 = Local is newer (Beta), 0 = Same
  const comparison = latestVersion ? compareVersions(latestVersion, currentVersion) : 0;
  const isUpdateAvailable = comparison === 1;
  const isBeta = comparison === -1;
  const isReleaseStatusUnavailable = !isLoading && !hasReleaseData;
  const starStatusText = stars !== null ? stars.toLocaleString() : t(isLoading ? 'loading' : 'about_unavailable');
  const statusSeparator = language === 'zh' ? '：' : ': ';
  const versionTooltip = isUpdateAvailable && latestVersion
    ? `${t('about_update_available')}${statusSeparator}${latestVersion}`
    : undefined;

  const getStatusColor = () => {
      if (isLoading) return 'bg-sky-500';
      if (isUpdateAvailable) return 'bg-amber-500';
      if (isBeta) return 'bg-purple-500';
      if (isReleaseStatusUnavailable) return 'bg-slate-400';
      return 'bg-emerald-500';
  };

  const getStatusText = () => {
    if (isLoading) return t('about_version_checking');
    if (isUpdateAvailable) return t('about_update_available');
    if (isBeta) return t('about_beta');
    if (isReleaseStatusUnavailable) return t('about_unavailable');
    return t('about_latest_version');
  };

  return (
    <div className={`flex min-h-full flex-col items-center px-4 text-center animate-in fade-in slide-in-from-bottom-4 duration-500 ${isCompactViewport ? 'py-2.5' : 'py-3 sm:py-4 md:py-5'}`}>
      
      {/* Logo Section with Glow */}
      <div className="relative group">
        <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
        <div className="relative">
            <AppLogo
              className={`h-auto drop-shadow-2xl ${isCompactViewport ? 'w-24' : 'w-28 sm:w-32 md:w-36'}`}
              ariaLabel={t('about_logo_alt')}
            />
        </div>
      </div>

      {/* Main Content */}
      <div className={`flex max-w-lg flex-col items-center ${isCompactViewport ? 'mt-3 space-y-3.5' : 'mt-4 space-y-4 sm:mt-5 sm:space-y-5'}`}>
         <h3 className={`font-bold tracking-tight text-[var(--theme-text-primary)] ${isCompactViewport ? 'text-[1.75rem]' : 'text-2xl'}`}>{t('about_title')}</h3>
         
         <div className="flex flex-wrap items-center justify-center gap-2">
           {/* Redesigned Version Pill */}
           <a 
              href="https://github.com/yeahhe365/All-Model-Chat/releases" 
              target="_blank" 
              rel="noopener noreferrer"
              className="group relative inline-flex items-center justify-center overflow-hidden rounded-full p-[1px] transition-transform duration-200 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)] focus:ring-offset-2 focus:ring-offset-[var(--theme-bg-primary)]"
              title={versionTooltip}
           >
              {/* Gradient Border Background */}
              <span className={`absolute inset-0 transition-all duration-300 ${
                  isUpdateAvailable ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-red-500' : 
                  isBeta ? 'bg-gradient-to-r from-purple-400 via-indigo-500 to-blue-500' :
                  isReleaseStatusUnavailable ? 'bg-gradient-to-r from-slate-300 via-slate-400 to-slate-500' :
                  isLoading ? 'bg-gradient-to-r from-sky-400 via-cyan-500 to-blue-500' :
                  'bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500'
              } opacity-70 group-hover:opacity-100`}></span>
              
              {/* Inner Content */}
              <span className={`relative flex items-center gap-3 rounded-full bg-[var(--theme-bg-primary)] px-4 transition-all duration-75 ease-in group-hover:bg-opacity-[0.96] sm:px-5 ${isCompactViewport ? 'py-1' : 'py-1.5'}`}>
                  <span className="font-mono text-sm font-bold text-[var(--theme-text-primary)]">
                      v{currentVersion}
                  </span>
                  
                  <span className="w-px h-3.5 bg-[var(--theme-border-secondary)] opacity-50"></span>
                  
                  <div className="flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
                          isUpdateAvailable ? `motion-safe:animate-ping ${getStatusColor()}` : getStatusColor()
                        }`}></span>
                        <span className={`relative inline-flex rounded-full h-2 w-2 ${getStatusColor()}`}></span>
                      </span>
                      <span className={`text-xs font-medium ${isUpdateAvailable ? 'text-amber-500' : 'text-[var(--theme-text-secondary)]'}`}>
                          {getStatusText()}
                          {isUpdateAvailable && latestVersion && (
                              <span className="ml-1 opacity-80">({latestVersion})</span>
                          )}
                      </span>
                  </div>
                  
                  <ExternalLink size={12} className="ml-0.5 text-[var(--theme-text-tertiary)] opacity-70 transition-colors group-hover:text-[var(--theme-text-primary)] group-hover:opacity-100" />
              </span>
           </a>

         </div>
        
        <p className={`max-w-md text-sm text-[var(--theme-text-secondary)] ${isCompactViewport ? 'leading-5' : 'leading-6'}`}>
          {t('about_description')}
        </p>
      </div>

      {/* Actions */}
      <div className={`flex w-full flex-col items-stretch justify-center gap-2.5 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center ${isCompactViewport ? 'mt-3.5' : 'mt-4 sm:mt-5'}`}>
        <a 
          href="https://github.com/yeahhe365/All-Model-Chat" 
          target="_blank" 
          rel="noopener noreferrer"
          className={`inline-flex w-full items-center justify-center gap-2.5 rounded-xl bg-[#24292F] text-sm font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-[#24292F]/90 hover:shadow-xl active:translate-y-0 dark:bg-white dark:text-black dark:hover:bg-gray-200 sm:min-w-[10.5rem] sm:w-auto ${isCompactViewport ? 'px-4 py-2' : 'px-5 py-2.5'}`}
        >
          <Github size={iconSize} />
          <span>{t('about_view_on_github')}</span>
        </a>

         <a 
           href="https://github.com/yeahhe365/All-Model-Chat/stargazers" 
           target="_blank" 
           rel="noopener noreferrer"
           className={`group inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--theme-border-secondary)] bg-[var(--theme-bg-input)] text-sm font-medium text-[var(--theme-text-primary)] shadow-sm transition-all hover:-translate-y-0.5 hover:border-[var(--theme-border-focus)] hover:bg-[var(--theme-bg-tertiary)] hover:shadow-md active:translate-y-0 sm:min-w-[10.5rem] sm:w-auto ${isCompactViewport ? 'px-4 py-2' : 'px-5 py-2.5'}`}
         >
           <Star size={iconSize} className="text-yellow-500 fill-yellow-500 transition-transform duration-300 group-hover:scale-110" />
           <span className="tabular-nums">{stars !== null ? stars.toLocaleString() : '—'}</span>
           <span className="text-[var(--theme-text-tertiary)]">{t('about_stars_label')}</span>
           {stars === null && (
             <span className="text-[var(--theme-text-tertiary)]">{starStatusText}</span>
           )}
         </a>
      </div>
    </div>
  );
};
