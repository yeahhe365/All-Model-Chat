import { useState, useEffect, useCallback, useRef } from 'react';
import { AppSettings, ChatSettings, SavedChatSession } from '../types';
import { DEFAULT_APP_SETTINGS, TAB_CYCLE_MODELS } from '../constants/appConstants';
import { logService } from '../utils/appUtils';
import { getTranslator } from '../utils/appUtils';

interface AppEventsProps {
    appSettings: AppSettings;
    setAppSettings: (settings: AppSettings | ((prev: AppSettings) => AppSettings)) => void;
    savedSessions: SavedChatSession[];
    language: 'en' | 'zh';
    startNewChat: () => void;
    handleClearCurrentChat: () => void;
    currentChatSettings: ChatSettings;
    handleSelectModelInHeader: (modelId: string) => void;
    isSettingsModalOpen: boolean;
    isPreloadedMessagesModalOpen: boolean;
    setIsLogViewerOpen: (isOpen: boolean | ((prev: boolean) => boolean)) => void;
    updateAndPersistSessions: (updater: (prev: SavedChatSession[]) => SavedChatSession[]) => void;
}

const isCurrentlyInPip = ('documentPictureInPicture' in window) && window.documentPictureInPicture.window === window;

export const useAppEvents = ({
    appSettings,
    setAppSettings,
    savedSessions,
    language,
    startNewChat,
    handleClearCurrentChat,
    currentChatSettings,
    handleSelectModelInHeader,
    isSettingsModalOpen,
    isPreloadedMessagesModalOpen,
    setIsLogViewerOpen,
    updateAndPersistSessions,
}: AppEventsProps) => {
    const [installPromptEvent, setInstallPromptEvent] = useState<any>(null);
    const [isStandalone, setIsStandalone] = useState(window.matchMedia('(display-mode: standalone)').matches);
    const t = getTranslator(language);
    const pipWindowRef = useRef<Window | null>(null);

    // PWA Installation Handlers
    useEffect(() => {
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            logService.info('PWA install prompt available.');
            setInstallPromptEvent(e);
        };
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }, []);

    useEffect(() => {
        const handleAppInstalled = () => {
            logService.info('PWA installed successfully.');
            setInstallPromptEvent(null);
            setIsStandalone(true);
        };
        window.addEventListener('appinstalled', handleAppInstalled);
        return () => window.removeEventListener('appinstalled', handleAppInstalled);
    }, []);

    const handleInstallPwa = async () => {
        if (!installPromptEvent) return;
        installPromptEvent.prompt();
        const { outcome } = await installPromptEvent.userChoice;
        logService.info(`PWA install prompt outcome: ${outcome}`);
        setInstallPromptEvent(null);
    };

    // Settings Import/Export Handlers
    const handleExportSettings = useCallback((includeHistory: boolean) => {
        logService.info(`Exporting settings. Include history: ${includeHistory}`);
        try {
            const dataToExport: any = { settings: appSettings };
            if (includeHistory) {
                dataToExport.history = savedSessions;
            }
            const jsonString = JSON.stringify(dataToExport, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const date = new Date().toISOString().slice(0, 10);
            link.download = `all-model-chat-settings-${date}${includeHistory ? '-with-history' : ''}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            logService.error('Failed to export settings', { error });
            alert('Failed to export settings.');
        }
    }, [appSettings, savedSessions]);

    const handleImportSettings = useCallback((file: File) => {
        logService.info(`Importing settings from file: ${file.name}`);
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result;
                if (typeof text !== 'string') {
                    throw new Error('File content is not text.');
                }
                const data = JSON.parse(text);

                if (data && data.settings && typeof data.settings === 'object') {
                    const importedSettings = data.settings;
                    const newSettings = { ...DEFAULT_APP_SETTINGS };

                    for (const key of Object.keys(DEFAULT_APP_SETTINGS) as Array<keyof AppSettings>) {
                        if (Object.prototype.hasOwnProperty.call(importedSettings, key)) {
                            const importedValue = importedSettings[key];
                            const defaultValue = DEFAULT_APP_SETTINGS[key];
                            
                            if (typeof importedValue === typeof defaultValue) {
                                (newSettings as any)[key] = importedValue;
                            } else if ((key === 'apiKey' || key === 'apiProxyUrl' || key === 'lockedApiKey') && (typeof importedValue === 'string' || importedValue === null)) {
                                (newSettings as any)[key] = importedValue;
                            } else {
                                logService.warn(`Type mismatch for setting "${key}" during import. Using default.`, { imported: typeof importedValue, default: typeof defaultValue });
                            }
                        }
                    }

                    setAppSettings(newSettings);
                    
                    if (data.history && Array.isArray(data.history)) {
                        if (window.confirm(t('settingsImportHistory_confirm'))) {
                            logService.info(`Importing ${data.history.length} chat sessions.`);
                            updateAndPersistSessions(() => data.history);
                            alert(t('settingsImportHistory_success'));
                            window.location.reload();
                            return; // Return to prevent the other alert
                        } else {
                            logService.info('User chose not to import history.');
                        }
                    } else if (data.history) {
                        logService.warn('Imported file contains history, but it is not a valid array.');
                    }

                    alert(t('settingsImport_success'));
                } else {
                    throw new Error('Invalid settings file format. Missing "settings" key.');
                }
            } catch (error) {
                logService.error('Failed to import settings', { error });
                alert(t('settingsImport_error'));
            }
        };
        reader.onerror = (e) => {
            logService.error('Failed to read settings file', { error: e });
            alert(t('settingsImport_error'));
        };
        reader.readAsText(file);
    }, [setAppSettings, t, updateAndPersistSessions]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const activeElement = document.activeElement as HTMLElement;
            const isGenerallyInputFocused = activeElement && (activeElement.tagName.toLowerCase() === 'input' || activeElement.tagName.toLowerCase() === 'textarea' || activeElement.tagName.toLowerCase() === 'select' || activeElement.isContentEditable);
            
            if ((event.ctrlKey || event.metaKey) && event.altKey && event.key.toLowerCase() === 'n') {
                event.preventDefault();
                startNewChat(); 
            } else if ((event.ctrlKey || event.metaKey) && event.altKey && event.key.toLowerCase() === 'l') {
                event.preventDefault();
                setIsLogViewerOpen(prev => !prev);
            } else if (event.key === 'Delete') {
                if (isSettingsModalOpen || isPreloadedMessagesModalOpen) return;
                const chatTextareaAriaLabel = 'Chat message input';
                const isChatTextareaFocused = activeElement?.getAttribute('aria-label') === chatTextareaAriaLabel;
                
                if (isGenerallyInputFocused) {
                    if (isChatTextareaFocused && (activeElement as HTMLTextAreaElement).value.trim() === '') {
                        event.preventDefault();
                        handleClearCurrentChat(); 
                    }
                } else {
                    event.preventDefault();
                    handleClearCurrentChat();
                }
            } else if (event.key === 'Tab' && TAB_CYCLE_MODELS.length > 0) {
                const isChatTextareaFocused = activeElement?.getAttribute('aria-label') === 'Chat message input';
                if (isChatTextareaFocused || !isGenerallyInputFocused) {
                    event.preventDefault();
                    const currentModelId = currentChatSettings.modelId;
                    const currentIndex = TAB_CYCLE_MODELS.indexOf(currentModelId);
                    let nextIndex: number;
                    if (currentIndex === -1) nextIndex = 0;
                    else nextIndex = (currentIndex + 1) % TAB_CYCLE_MODELS.length;
                    const newModelId = TAB_CYCLE_MODELS[nextIndex];
                    if (newModelId) handleSelectModelInHeader(newModelId);
                }
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [startNewChat, handleClearCurrentChat, isSettingsModalOpen, isPreloadedMessagesModalOpen, currentChatSettings.modelId, handleSelectModelInHeader, setIsLogViewerOpen]);
    
    const handleTogglePip = useCallback(async () => {
        // If we are currently in a PiP window, the button should close it.
        if (isCurrentlyInPip) {
            window.close();
            return;
        }
    
        // From the main window, if a PiP window exists and is open, close it.
        if (pipWindowRef.current && !pipWindowRef.current.closed) {
            pipWindowRef.current.close();
            return;
        }

        if (!('documentPictureInPicture' in window)) {
            alert(t('pip_unsupported_error'));
            logService.warn('Document PiP API not supported.');
            return;
        }

        try {
            const pipWidth = Math.min(window.screen.width, 800);
            const pipHeight = Math.min(window.screen.height, 600);
            // @ts-ignore: documentPictureInPicture is a new API and might not be in all TS defs
            const pipWindow = await window.documentPictureInPicture.requestWindow({
                width: pipWidth,
                height: pipHeight,
            });

            pipWindowRef.current = pipWindow;
            
            const url = new URL(window.location.href);
            url.searchParams.set('mode', 'pip');

            const iframe = pipWindow.document.createElement('iframe');
            iframe.src = url.toString();
            iframe.style.width = '100%';
            iframe.style.height = '100%';
            iframe.style.border = 'none';
            pipWindow.document.body.append(iframe);
            pipWindow.document.body.style.margin = '0';
            pipWindow.document.body.style.overflow = 'hidden';
            pipWindow.document.title = 'All Model Chat (PiP)';

            // Listen for the PiP window closing to clear our reference
            pipWindow.addEventListener('pagehide', () => {
                logService.info('PiP window closed.');
                pipWindowRef.current = null;
            });

            logService.info(`PiP window opened for the app.`);
        } catch (error) {
            logService.error('Failed to open PiP window', { error });
            if (error instanceof Error) {
                alert(t('pip_generic_error').replace('{error}', error.message));
            }
        }
    }, [t]);

    return {
        installPromptEvent,
        isStandalone,
        handleInstallPwa,
        handleExportSettings,
        handleImportSettings,
        handleTogglePip,
    };
};