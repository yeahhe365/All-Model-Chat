import React from 'react';
import { KeyRound, Info } from 'lucide-react';

interface ApiConfigSectionProps {
  useCustomApiConfig: boolean;
  setUseCustomApiConfig: (value: boolean) => void;
  apiKey: string | null;
  setApiKey: (value: string | null) => void;
  useProxy: boolean;
  setUseProxy: (value: boolean) => void;
  proxyUrl: string | null;
  setProxyUrl: (value: string | null) => void;
  t: (key: string) => string;
}

export const ApiConfigSection: React.FC<ApiConfigSectionProps> = ({
  useCustomApiConfig,
  setUseCustomApiConfig,
  apiKey,
  setApiKey,
  useProxy,
  setUseProxy,
  proxyUrl,
  setProxyUrl,
  t,
}) => {
  const inputBaseClasses = "w-full p-2 border rounded-md focus:ring-2 focus:border-[var(--theme-border-focus)] text-[var(--theme-text-primary)] placeholder-[var(--theme-text-tertiary)] text-sm custom-scrollbar";
  const enabledInputClasses = "bg-[var(--theme-bg-input)] border-[var(--theme-border-secondary)] focus:ring-[var(--theme-border-focus)]";
  const disabledInputClasses = "bg-[var(--theme-bg-secondary)] border-[var(--theme-border-primary)] opacity-60 cursor-not-allowed";
  const iconSize = window.innerWidth < 640 ? 14 : 16;

  return (
    <div className="space-y-3 p-3 sm:p-4 border border-[var(--theme-border-secondary)] rounded-lg bg-[var(--theme-bg-secondary)]">
      <h3 className="text-sm font-semibold text-[var(--theme-text-primary)] flex items-center mb-2">
        <KeyRound size={iconSize} className="mr-2 text-[var(--theme-text-link)] opacity-80" />
        {t('settingsApiConfig')}
      </h3>

      <label htmlFor="use-custom-api-config-toggle" className="flex items-center justify-between py-1 cursor-pointer">
        <span className="text-sm font-medium text-[var(--theme-text-secondary)]">
          {t('settingsUseCustomApi')}
        </span>
        <div className="relative">
          <input
            id="use-custom-api-config-toggle"
            type="checkbox"
            className="sr-only peer"
            checked={useCustomApiConfig}
            onChange={() => setUseCustomApiConfig(!useCustomApiConfig)}
          />
          <div className="w-11 h-6 bg-[var(--theme-bg-input)] rounded-full peer peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-offset-2 peer-focus:ring-offset-[var(--theme-bg-secondary)] peer-focus:ring-[var(--theme-border-focus)] peer-checked:bg-[var(--theme-bg-accent)] transition-colors duration-200 ease-in-out"></div>
          <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-200 ease-in-out peer-checked:translate-x-5"></div>
        </div>
      </label>

      {!useCustomApiConfig && (
        <p className="text-xs text-[var(--theme-text-tertiary)] flex items-center bg-[var(--theme-bg-info)] bg-opacity-30 p-2 rounded-md border border-[var(--theme-border-secondary)]">
          <Info size={14} className="mr-2 flex-shrink-0 text-[var(--theme-text-info)]" />
          {t('apiConfig_default_info')}
        </p>
      )}

      <div className={`${!useCustomApiConfig ? 'opacity-50' : ''}`}>
        <div>
            <label htmlFor="api-key-input" className="block text-xs font-medium text-[var(--theme-text-secondary)] mb-1.5">{t('settingsApiKey')}</label>
            <textarea
              id="api-key-input"
              rows={3}
              value={apiKey || ''}
              onChange={(e) => setApiKey(e.target.value || null)}
              className={`${inputBaseClasses} ${useCustomApiConfig ? enabledInputClasses : disabledInputClasses} resize-y min-h-[60px]`}
              placeholder={useCustomApiConfig ? t('apiConfig_key_placeholder') : t('apiConfig_key_placeholder_disabled')}
              aria-label="Gemini API Key input"
              disabled={!useCustomApiConfig}
            />
            {useCustomApiConfig && (
              <p className="text-xs text-[var(--theme-text-tertiary)] mt-1.5">
                {t('settingsApiKeyHelpText')}
              </p>
            )}
        </div>
        
        <div className="mt-4">
          <label htmlFor="use-proxy-toggle" className="flex items-center justify-between py-1 cursor-pointer">
            <span className="text-sm font-medium text-[var(--theme-text-secondary)]">
              {t('settingsUseProxy')}
            </span>
            <div className="relative">
              <input
                id="use-proxy-toggle"
                type="checkbox"
                className="sr-only peer"
                checked={useProxy}
                onChange={() => setUseProxy(!useProxy)}
                disabled={!useCustomApiConfig}
              />
              <div className="w-11 h-6 bg-[var(--theme-bg-input)] rounded-full peer peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-offset-2 peer-focus:ring-offset-[var(--theme-bg-secondary)] peer-focus:ring-[var(--theme-border-focus)] peer-checked:bg-[var(--theme-bg-accent)] transition-colors duration-200 ease-in-out"></div>
              <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-200 ease-in-out peer-checked:translate-x-5"></div>
            </div>
          </label>
        </div>
        
        {useCustomApiConfig && useProxy && (
          <div className="mt-2" style={{ animation: 'fadeIn 0.3s ease-out both' }}>
            <label htmlFor="proxy-url-input" className="block text-xs font-medium text-[var(--theme-text-secondary)] mb-1.5">{t('settingsProxyUrl')}</label>
            <input
              id="proxy-url-input"
              type="text"
              value={proxyUrl || ''}
              onChange={(e) => setProxyUrl(e.target.value || null)}
              className={`${inputBaseClasses} ${enabledInputClasses}`}
              placeholder={t('apiConfig_proxy_url_placeholder')}
              aria-label="Proxy URL input"
              disabled={!useCustomApiConfig}
            />
             <p className="text-xs text-[var(--theme-text-tertiary)] mt-1.5">
                {t('settingsProxyUrlHelpText')}{' '}
                <a href="https://api-proxy.me/" target="_blank" rel="noopener noreferrer" className="text-[var(--theme-text-link)] underline hover:text-[var(--theme-bg-accent)]">
                    https://api-proxy.me/
                </a>
             </p>
          </div>
        )}
      </div>
    </div>
  );
};