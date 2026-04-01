
import { useState, useEffect, useCallback } from 'react';
import { AppSettings } from '../../types';
import { DEFAULT_APP_SETTINGS, DEFAULT_FILES_API_CONFIG } from '../../constants/appConstants';
import { AVAILABLE_THEMES, DEFAULT_THEME_ID } from '../../constants/themeConstants';
import { applyThemeToDocument, logService } from '../../utils/appUtils';
import { dbService } from '../../utils/db';
import { useMultiTabSync } from './useMultiTabSync';

export const useAppSettings = () => {
    const [appSettings, setAppSettingsState] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
    const [isSettingsLoaded, setIsSettingsLoaded] = useState(false);

    const loadSettings = useCallback(async () => {
        try {
            const storedSettings = await dbService.getAppSettings();
            if (storedSettings) {
                const newSettings = { ...DEFAULT_APP_SETTINGS, ...storedSettings };
                
                if (storedSettings.filesApiConfig) {
                    // Ensure new keys are present if structure updated
                    newSettings.filesApiConfig = { ...DEFAULT_FILES_API_CONFIG, ...storedSettings.filesApiConfig };
                }

                setAppSettingsState(newSettings);
            }
        } catch (error) {
            logService.error("Failed to load settings from IndexedDB", { error });
        } finally {
            setIsSettingsLoaded(true);
        }
    }, []);

    // Initial Load
    useEffect(() => {
        loadSettings();
    }, [loadSettings]);

    // Sync Hook
    const { broadcast } = useMultiTabSync({
        onSettingsUpdated: () => {
            logService.info("[Sync] Reloading settings from DB");
            loadSettings();
        }
    });
    
    const [language, setLanguage] = useState<'en' | 'zh'>('en');

    const [resolvedThemeId, setResolvedThemeId] = useState<'onyx' | 'pearl'>(() => {
        if (appSettings.themeId === 'system') {
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'onyx' : 'pearl';
        }
        return appSettings.themeId as 'onyx' | 'pearl';
    });

    // Theme Logic
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

    // Apply Side Effects (DOM, Persistence, Broadcasting)
    const setAppSettings = useCallback((newSettings: AppSettings | ((prev: AppSettings) => AppSettings)) => {
        setAppSettingsState(prev => {
            const next = typeof newSettings === 'function' ? newSettings(prev) : newSettings;
            
            // Persist and Broadcast
            if (isSettingsLoaded) {
                dbService.setAppSettings(next)
                    .then(() => broadcast({ type: 'SETTINGS_UPDATED' }))
                    .catch(e => logService.error("Failed to save settings", { error: e }));
            }
            
            return next;
        });
    }, [isSettingsLoaded, broadcast]);

    // Apply styles when settings change
    useEffect(() => {
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

    }, [appSettings, currentTheme]);

    return { appSettings, setAppSettings, currentTheme, language };
};
