
import { useState, useEffect, useRef, useLayoutEffect, useMemo } from 'react';
import { AppSettings } from '../../types';
import { DEFAULT_APP_SETTINGS, THINKING_BUDGET_RANGES, MODELS_MANDATORY_THINKING } from '../../constants/appConstants';
import { translations, logService, cacheModelSettings, getCachedModelSettings } from '../../utils/appUtils';
import { MediaResolution } from '../../types/settings';
import { IconInterface, IconModel, IconApiKey, IconData, IconAbout, IconKeyboard } from '../../components/icons/CustomIcons';

export type SettingsTab = 'interface' | 'model' | 'account' | 'data' | 'shortcuts' | 'about';

const SETTINGS_TAB_STORAGE_KEY = 'chatSettingsLastTab';

interface UseSettingsLogicProps {
    isOpen: boolean;
    onClose: () => void;
    currentSettings: AppSettings;
    onSave: (newSettings: AppSettings) => void;
    onClearAllHistory: () => void;
    onClearCache: () => void;
    onOpenLogViewer: () => void;
    onImportHistory: (file: File) => void;
    t: (key: keyof typeof translations) => string;
}

export const useSettingsLogic = ({
    isOpen,
    onClose,
    currentSettings,
    onSave,
    onClearAllHistory,
    onClearCache,
    onOpenLogViewer,
    onImportHistory,
    t
}: UseSettingsLogicProps) => {
    const [activeTab, setActiveTab] = useState<SettingsTab>(() => {
        try {
            const saved = localStorage.getItem(SETTINGS_TAB_STORAGE_KEY);
            const validTabs: SettingsTab[] = ['model', 'interface', 'account', 'data', 'shortcuts', 'about'];
            if (saved && validTabs.includes(saved as SettingsTab)) {
                return saved as SettingsTab;
            }
        } catch (e) {
            // Ignore storage errors
        }
        return 'model';
    });

    const [confirmConfig, setConfirmConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        isDanger?: boolean;
        confirmLabel?: string;
    }>({ isOpen: false, title: '', message: '', onConfirm: () => { } });

    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const scrollSaveTimeoutRef = useRef<number | null>(null);

    useEffect(() => {
        if (activeTab) {
            localStorage.setItem(SETTINGS_TAB_STORAGE_KEY, activeTab);
        }
    }, [activeTab]);

    // Restore scroll position when tab changes or modal opens
    useLayoutEffect(() => {
        if (isOpen && scrollContainerRef.current) {
            const key = `chatSettingsScroll_${activeTab}`;
            const savedPosition = localStorage.getItem(key);

            // Use requestAnimationFrame to ensure content has reflowed
            requestAnimationFrame(() => {
                if (scrollContainerRef.current) {
                    scrollContainerRef.current.scrollTop = savedPosition ? parseInt(savedPosition, 10) : 0;
                }
            });
        }
    }, [activeTab, isOpen]);

    const handleContentScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const scrollTop = e.currentTarget.scrollTop;

        if (scrollSaveTimeoutRef.current) {
            clearTimeout(scrollSaveTimeoutRef.current);
        }

        // Debounce saving to localStorage
        scrollSaveTimeoutRef.current = window.setTimeout(() => {
            localStorage.setItem(`chatSettingsScroll_${activeTab}`, scrollTop.toString());
        }, 150);
    };

    const handleResetToDefaults = () => {
        setConfirmConfig({
            isOpen: true,
            title: t('settingsReset'),
            message: t('settingsReset_confirm'),
            onConfirm: () => onSave(DEFAULT_APP_SETTINGS),
            isDanger: true,
            confirmLabel: t('settingsReset')
        });
    };

    const handleClearLogs = async () => {
        setConfirmConfig({
            isOpen: true,
            title: t('settingsClearLogs'),
            message: t('settingsClearLogs_confirm'),
            onConfirm: async () => { await logService.clearLogs(); },
            isDanger: true,
            confirmLabel: t('delete')
        });
    };

    const handleRequestClearHistory = () => {
        setConfirmConfig({
            isOpen: true,
            title: t('settingsClearHistory'),
            message: t('settingsClearHistory_confirm'),
            onConfirm: onClearAllHistory,
            isDanger: true,
            confirmLabel: t('delete')
        });
    };

    const handleRequestClearCache = () => {
        setConfirmConfig({
            isOpen: true,
            title: t('settingsClearCache'),
            message: t('settingsClearCache_confirm'),
            onConfirm: onClearCache,
            isDanger: true,
            confirmLabel: t('delete')
        });
    };

    const handleRequestImportHistory = (file: File) => {
        setConfirmConfig({
            isOpen: true,
            title: t('settingsImportHistory'),
            message: t('settingsImportHistory_confirm'),
            onConfirm: () => onImportHistory(file),
            isDanger: false,
            confirmLabel: t('import')
        });
    };

    const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
        onSave({ ...currentSettings, [key]: value });
    };

    const handleModelChange = (newModelId: string) => {
        // 1. Cache current model settings
        if (currentSettings.modelId) {
            cacheModelSettings(currentSettings.modelId, {
                mediaResolution: currentSettings.mediaResolution,
                thinkingBudget: currentSettings.thinkingBudget,
                thinkingLevel: currentSettings.thinkingLevel
            });
        }

        // 2. Load cached settings for new model
        const cached = getCachedModelSettings(newModelId);

        let newThinkingBudget = cached?.thinkingBudget ?? currentSettings.thinkingBudget;
        const newThinkingLevel = cached?.thinkingLevel ?? currentSettings.thinkingLevel;
        const newMediaResolution = cached?.mediaResolution ?? currentSettings.mediaResolution ?? MediaResolution.MEDIA_RESOLUTION_UNSPECIFIED;

        // 3. Apply defaults/clamping logic (mirroring useChatActions)
        const range = THINKING_BUDGET_RANGES[newModelId];
        if (range) {
            const isGemini3 = newModelId.includes('gemini-3');
            const isMandatory = MODELS_MANDATORY_THINKING.includes(newModelId);

            // Mandatory Check
            if (isMandatory && newThinkingBudget === 0) {
                newThinkingBudget = isGemini3 ? -1 : range.max;
            }

            // Auto Compatibility Check
            if (!isGemini3 && newThinkingBudget === -1) {
                newThinkingBudget = range.max;
            }

            // Range Clamp
            if (newThinkingBudget > 0) {
                if (newThinkingBudget > range.max) newThinkingBudget = range.max;
                if (newThinkingBudget < range.min) newThinkingBudget = range.min;
            }
        }

        onSave({
            ...currentSettings,
            modelId: newModelId,
            thinkingBudget: newThinkingBudget,
            thinkingLevel: newThinkingLevel,
            mediaResolution: newMediaResolution,
        });
    };

    const tabs = useMemo(() => [
        { id: 'model' as SettingsTab, labelKey: 'settingsTabModel', icon: IconModel },
        { id: 'interface' as SettingsTab, labelKey: 'settingsTabInterface', icon: IconInterface },
        { id: 'account' as SettingsTab, labelKey: 'settingsTabAccount', icon: IconApiKey },
        { id: 'data' as SettingsTab, labelKey: 'settingsTabData', icon: IconData },
        { id: 'shortcuts' as SettingsTab, labelKey: 'settingsTabShortcuts', icon: IconKeyboard },
        { id: 'about' as SettingsTab, labelKey: 'settingsTabAbout', icon: IconAbout },
    ], []);

    const closeConfirm = () => setConfirmConfig(prev => ({ ...prev, isOpen: false }));

    return {
        activeTab,
        setActiveTab,
        confirmConfig,
        closeConfirm,
        scrollContainerRef,
        handleContentScroll,
        handleResetToDefaults,
        handleClearLogs,
        handleRequestClearHistory,
        handleRequestClearCache,
        handleRequestImportHistory,
        updateSetting,
        handleModelChange,
        tabs
    };
};
