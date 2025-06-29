import { useState, useEffect } from 'react';
import { AppSettings } from '../types';
import { DEFAULT_APP_SETTINGS, APP_SETTINGS_KEY } from '../constants/appConstants';
import { AVAILABLE_THEMES, DEFAULT_THEME_ID } from '../constants/themeConstants';
import { geminiServiceInstance } from '../services/geminiService';
import { generateThemeCssVariables } from '../utils/appUtils';

const updateServiceWorkerProxy = (url: string | null) => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
            type: 'SET_PROXY_URL',
            url: url,
        });
    }
};

export const useAppSettings = () => {
    const [appSettings, setAppSettings] = useState<AppSettings>(() => {
        const stored = localStorage.getItem(APP_SETTINGS_KEY);
        const loadedSettings = stored ? { ...DEFAULT_APP_SETTINGS, ...JSON.parse(stored) } : DEFAULT_APP_SETTINGS;

        // Initialize gemini service with loaded/default settings
        const apiKeyToUse = loadedSettings.useCustomApiConfig ? loadedSettings.apiKey : null;
        let apiUrlToUse = null;
        if (loadedSettings.useCustomApiConfig) {
            apiUrlToUse = loadedSettings.useProxy ? loadedSettings.proxyUrl : loadedSettings.apiUrl;
        }
        geminiServiceInstance.updateApiKeyAndUrl(apiKeyToUse, apiUrlToUse, loadedSettings.useCustomApiConfig);
        
        // Send proxy config to SW on initial load, once it's ready.
        if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
            navigator.serviceWorker.ready.then(() => {
                updateServiceWorkerProxy(apiUrlToUse);
            });
        }

        return loadedSettings;
    });

    const [language, setLanguage] = useState<'en' | 'zh'>('en');

    const currentTheme = AVAILABLE_THEMES.find(t => t.id === appSettings.themeId) || AVAILABLE_THEMES.find(t => t.id === DEFAULT_THEME_ID)!;

    useEffect(() => {
        localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(appSettings));

        // Update Gemini service based on useCustomApiConfig toggle
        const apiKeyToUse = appSettings.useCustomApiConfig ? appSettings.apiKey : null;
        let apiUrlToUse = null;
        if (appSettings.useCustomApiConfig) {
            apiUrlToUse = appSettings.useProxy ? appSettings.proxyUrl : appSettings.apiUrl;
        }
        geminiServiceInstance.updateApiKeyAndUrl(apiKeyToUse, apiUrlToUse, appSettings.useCustomApiConfig);

        // Send proxy config to SW on setting change
        updateServiceWorkerProxy(apiUrlToUse);

        const themeVariablesStyleTag = document.getElementById('theme-variables');
        if (themeVariablesStyleTag) {
            themeVariablesStyleTag.innerHTML = generateThemeCssVariables(currentTheme.colors);
        }

        const bodyClassList = document.body.classList;
        AVAILABLE_THEMES.forEach(t => bodyClassList.remove(`theme-${t.id}`));
        bodyClassList.add(`theme-${currentTheme.id}`, 'antialiased');

        document.body.style.fontSize = `${appSettings.baseFontSize}px`;

        let effectiveLang: 'en' | 'zh' = 'en';
        const settingLang = appSettings.language || 'system';
        if (settingLang === 'system') {
            const browserLang = navigator.language.toLowerCase();
            if (browserLang.startsWith('zh')) {
                effectiveLang = 'zh';
            }
        } else {
            effectiveLang = settingLang;
        }
        setLanguage(effectiveLang);


    }, [appSettings, currentTheme]);

    return { appSettings, setAppSettings, currentTheme, language };
};