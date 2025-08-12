

import { useState, useEffect } from 'react';
import { AppSettings } from '../types';
import { DEFAULT_APP_SETTINGS, APP_SETTINGS_KEY } from '../constants/appConstants';
import { AVAILABLE_THEMES, DEFAULT_THEME_ID } from '../constants/themeConstants';
import { geminiServiceInstance } from '../services/geminiService';
import { generateThemeCssVariables } from '../utils/appUtils';

export const useAppSettings = () => {
    const [appSettings, setAppSettings] = useState<AppSettings>(() => {
        const stored = localStorage.getItem(APP_SETTINGS_KEY);
        const loadedSettings = stored ? JSON.parse(stored) : {};
        if (!['system', 'onyx', 'pearl'].includes(loadedSettings.themeId)) {
            loadedSettings.themeId = DEFAULT_APP_SETTINGS.themeId;
        }
        return { ...DEFAULT_APP_SETTINGS, ...loadedSettings };
    });

    const [language, setLanguage] = useState<'en' | 'zh'>('en');

    const [resolvedThemeId, setResolvedThemeId] = useState<'onyx' | 'pearl'>(() => {
        if (appSettings.themeId === 'system') {
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'onyx' : 'pearl';
        }
        return appSettings.themeId as 'onyx' | 'pearl';
    });

    useEffect(() => {
        if (appSettings.themeId === 'system') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const updateTheme = () => setResolvedThemeId(mediaQuery.matches ? 'onyx' : 'pearl');
            
            updateTheme();
            mediaQuery.addEventListener('change', updateTheme);
            return () => mediaQuery.removeEventListener('change', updateTheme);
        } else {
            setResolvedThemeId(appSettings.themeId as 'onyx' | 'pearl');
        }
    }, [appSettings.themeId]);

    const currentTheme = AVAILABLE_THEMES.find(t => t.id === resolvedThemeId) || AVAILABLE_THEMES.find(t => t.id === DEFAULT_THEME_ID)!;

    useEffect(() => {
        localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(appSettings));

        const themeVariablesStyleTag = document.getElementById('theme-variables');
        if (themeVariablesStyleTag) {
            themeVariablesStyleTag.innerHTML = generateThemeCssVariables(currentTheme.colors);
        }

        const bodyClassList = document.body.classList;
        AVAILABLE_THEMES.forEach(t => bodyClassList.remove(`theme-${t.id}`));
        bodyClassList.add(`theme-${currentTheme.id}`, 'antialiased');

        // Dynamically switch markdown and highlight.js themes
        const markdownDarkTheme = document.getElementById('markdown-dark-theme') as HTMLLinkElement;
        const markdownLightTheme = document.getElementById('markdown-light-theme') as HTMLLinkElement;
        const hljsDarkTheme = document.getElementById('hljs-dark-theme') as HTMLLinkElement;
        const hljsLightTheme = document.getElementById('hljs-light-theme') as HTMLLinkElement;

        const isDark = currentTheme.id === 'onyx';

        if (markdownDarkTheme) markdownDarkTheme.disabled = !isDark;
        if (markdownLightTheme) markdownLightTheme.disabled = isDark;
        if (hljsDarkTheme) hljsDarkTheme.disabled = !isDark;
        if (hljsLightTheme) hljsLightTheme.disabled = isDark;

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

        // Send proxy URL to Service Worker
        if ('serviceWorker' in navigator) {
            const postProxyUrlToSw = (registration?: ServiceWorkerRegistration) => {
                const controller = registration ? registration.active : navigator.serviceWorker.controller;
                controller?.postMessage({
                    type: 'SET_PROXY_URL',
                    url: appSettings.useApiProxy ? appSettings.apiProxyUrl : null,
                });
            };
            navigator.serviceWorker.ready.then(postProxyUrlToSw).catch(e => console.error("SW ready error:", e));
        }


    }, [appSettings, currentTheme]);

    return { appSettings, setAppSettings, currentTheme, language };
};