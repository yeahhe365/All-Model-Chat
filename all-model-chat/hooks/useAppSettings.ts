
import { useState, useEffect } from 'react';
import { AppSettings } from '../types';
import { DEFAULT_APP_SETTINGS, DEFAULT_FILES_API_CONFIG } from '../constants/appConstants';
import { AVAILABLE_THEMES, DEFAULT_THEME_ID } from '../constants/themeConstants';
import { applyThemeToDocument, logService } from '../utils/appUtils';
import { dbService } from '../utils/db';

export const useAppSettings = () => {
    const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
    const [isSettingsLoaded, setIsSettingsLoaded] = useState(false);

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const storedSettings = await dbService.getAppSettings();
                if (storedSettings) {
                    const newSettings = { ...DEFAULT_APP_SETTINGS, ...storedSettings };
                    
                    // Migration: Handle legacy useFilesApiForImages
                    if (storedSettings.useFilesApiForImages !== undefined && !storedSettings.filesApiConfig) {
                        newSettings.filesApiConfig = {
                            ...DEFAULT_FILES_API_CONFIG,
                            images: storedSettings.useFilesApiForImages
                        };
                        // Cleanup deprecated key
                        delete newSettings.useFilesApiForImages;
                        logService.info('Migrated legacy useFilesApiForImages to filesApiConfig');
                    } else if (storedSettings.filesApiConfig) {
                        // Ensure new keys are present if structure updated
                        newSettings.filesApiConfig = { ...DEFAULT_FILES_API_CONFIG, ...storedSettings.filesApiConfig };
                    }

                    setAppSettings(newSettings);
                }
            } catch (error) {
                logService.error("Failed to load settings from IndexedDB", { error });
            } finally {
                setIsSettingsLoaded(true);
            }
        };
        loadSettings();
    }, []);
    
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
        // Only save settings after they've been loaded to prevent overwriting stored settings with defaults.
        if (isSettingsLoaded) {
            dbService.setAppSettings(appSettings).catch(e => logService.error("Failed to save settings", { error: e }));
        }

        applyThemeToDocument(document, currentTheme, appSettings);

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
                    url: appSettings.useCustomApiConfig && appSettings.useApiProxy ? appSettings.apiProxyUrl : null,
                });
            };
            navigator.serviceWorker.ready.then(postProxyUrlToSw).catch(e => console.error("SW ready error:", e));
        }


    }, [appSettings, currentTheme, isSettingsLoaded]);

    return { appSettings, setAppSettings, currentTheme, language };
};
