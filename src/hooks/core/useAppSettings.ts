import { useEffect } from 'react';
import { useSettingsStore } from '../../stores/settingsStore';
import { applyThemeToDocument } from '../../utils/appUtils';

export const useAppSettings = () => {
    const appSettings = useSettingsStore((s) => s.appSettings);
    const setAppSettings = useSettingsStore((s) => s.setAppSettings);
    const currentTheme = useSettingsStore((s) => s.currentTheme);
    const language = useSettingsStore((s) => s.language);
    const loadSettings = useSettingsStore((s) => s.loadSettings);

    // Initial load
    useEffect(() => {
        loadSettings();
    }, [loadSettings]);

    // Apply theme to DOM when settings change
    useEffect(() => {
        applyThemeToDocument(document, currentTheme, appSettings);
    }, [appSettings, currentTheme]);

    return { appSettings, setAppSettings, currentTheme, language };
};
