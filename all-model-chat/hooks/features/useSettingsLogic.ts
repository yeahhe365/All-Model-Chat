
import { useState, useEffect, useRef, useLayoutEffect, useMemo, useCallback } from 'react';
import { AppSettings } from '../../types';
import { DEFAULT_APP_SETTINGS } from '../../constants/appConstants';
import { translations, logService, cacheModelSettings, getCachedModelSettings, adjustThinkingBudget } from '../../utils/appUtils';
import { MediaResolution } from '../../types/settings';
import { IconInterface, IconModel, IconApiKey, IconData, IconAbout, IconKeyboard } from '../../components/icons/CustomIcons';

export type SettingsTab = 'interface' | 'model' | 'account' | 'data' | 'shortcuts' | 'about';

// Tabs that require confirmation to save
const CONFIRM_REQUIRED_TABS: SettingsTab[] = ['model', 'interface', 'account'];

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

    // Pending settings state - stores uncommitted changes
    const [pendingSettings, setPendingSettings] = useState<AppSettings>(currentSettings);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Sync pending settings when currentSettings changes (e.g., from external updates)
    useEffect(() => {
        if (!hasUnsavedChanges) {
            setPendingSettings(currentSettings);
        }
    }, [currentSettings, hasUnsavedChanges]);

    // Reset pending state when modal opens
    useEffect(() => {
        if (isOpen) {
            setPendingSettings(currentSettings);
            setHasUnsavedChanges(false);
        }
    }, [isOpen, currentSettings]);

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
            onConfirm: () => {
                onSave(DEFAULT_APP_SETTINGS);
                setPendingSettings(DEFAULT_APP_SETTINGS);
                setHasUnsavedChanges(false);
            },
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

    // Check if current tab requires confirmation
    const requiresConfirmation = CONFIRM_REQUIRED_TABS.includes(activeTab);

    // Update pending settings (for tabs that require confirmation)
    const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
        if (requiresConfirmation) {
            // Update pending settings, not actual settings
            setPendingSettings(prev => ({ ...prev, [key]: value }));
            setHasUnsavedChanges(true);
        } else {
            // For other tabs (data, shortcuts, about), save immediately
            onSave({ ...currentSettings, [key]: value });
        }
    };

    // Save pending changes
    const savePendingChanges = useCallback(() => {
        onSave(pendingSettings);

        // Sync thinking settings to cache
        if (pendingSettings.modelId && (
            pendingSettings.thinkingBudget !== currentSettings.thinkingBudget ||
            pendingSettings.thinkingLevel !== currentSettings.thinkingLevel
        )) {
            const currentCache = getCachedModelSettings(pendingSettings.modelId) || {};
            cacheModelSettings(pendingSettings.modelId, {
                ...currentCache,
                thinkingBudget: pendingSettings.thinkingBudget,
                thinkingLevel: pendingSettings.thinkingLevel
            });
        }

        setHasUnsavedChanges(false);
    }, [pendingSettings, currentSettings, onSave]);

    // Discard pending changes
    const discardPendingChanges = useCallback(() => {
        setPendingSettings(currentSettings);
        setHasUnsavedChanges(false);
    }, [currentSettings]);

    // Handle close with unsaved changes warning
    const handleClose = useCallback(() => {
        if (hasUnsavedChanges) {
            setConfirmConfig({
                isOpen: true,
                title: t('settingsUnsavedChanges') || 'Unsaved Changes',
                message: t('settingsUnsavedChanges_confirm') || 'You have unsaved changes. Do you want to save them before closing?',
                onConfirm: () => {
                    savePendingChanges();
                    onClose();
                },
                isDanger: false,
                confirmLabel: t('save') || 'Save'
            });
        } else {
            onClose();
        }
    }, [hasUnsavedChanges, savePendingChanges, onClose, t]);

    // Handle discard and close
    const handleDiscardAndClose = useCallback(() => {
        discardPendingChanges();
        onClose();
    }, [discardPendingChanges, onClose]);

    const handleModelChange = (newModelId: string) => {
        // 1. Cache current model settings (from pending if we have unsaved changes)
        const settingsToCache = hasUnsavedChanges ? pendingSettings : currentSettings;
        if (settingsToCache.modelId) {
            cacheModelSettings(settingsToCache.modelId, {
                mediaResolution: settingsToCache.mediaResolution,
                thinkingBudget: settingsToCache.thinkingBudget,
                thinkingLevel: settingsToCache.thinkingLevel
            });
        }

        // 2. Load cached settings for new model
        const cached = getCachedModelSettings(newModelId);

        let newThinkingBudget = cached?.thinkingBudget ?? settingsToCache.thinkingBudget;
        const newThinkingLevel = cached?.thinkingLevel ?? settingsToCache.thinkingLevel;
        const newMediaResolution = cached?.mediaResolution ?? settingsToCache.mediaResolution ?? MediaResolution.MEDIA_RESOLUTION_UNSPECIFIED;

        // 3. Apply defaults/clamping logic using shared helper
        newThinkingBudget = adjustThinkingBudget(newModelId, newThinkingBudget);

        const newSettings = {
            ...settingsToCache,
            modelId: newModelId,
            thinkingBudget: newThinkingBudget,
            thinkingLevel: newThinkingLevel,
            mediaResolution: newMediaResolution,
        };

        if (requiresConfirmation) {
            setPendingSettings(newSettings);
            setHasUnsavedChanges(true);
        } else {
            onSave(newSettings);
        }
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
        tabs,
        // New exports for pending state management
        pendingSettings,
        hasUnsavedChanges,
        savePendingChanges,
        discardPendingChanges,
        handleClose,
        handleDiscardAndClose,
        requiresConfirmation
    };
};
