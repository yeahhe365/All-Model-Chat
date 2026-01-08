
import { useState, useEffect, useCallback } from 'react';
import { AppSettings, ChatSettings } from '../../types';
import { TAB_CYCLE_MODELS } from '../../constants/appConstants';
import { logService } from '../../utils/appUtils';
import { isShortcutPressed } from '../../utils/shortcutUtils';

interface AppEventsProps {
    appSettings: AppSettings;
    startNewChat: () => void;
    handleClearCurrentChat: () => void;
    currentChatSettings: ChatSettings;
    handleSelectModelInHeader: (modelId: string) => void;
    isSettingsModalOpen: boolean;
    isPreloadedMessagesModalOpen: boolean;
    setIsLogViewerOpen: (isOpen: boolean | ((prev: boolean) => boolean)) => void;
    onTogglePip: () => void;
    isPipSupported: boolean;
    pipWindow?: Window | null;
    isLoading: boolean;
    onStopGenerating: () => void;
}

export const useAppEvents = ({
    appSettings,
    startNewChat,
    handleClearCurrentChat,
    currentChatSettings,
    handleSelectModelInHeader,
    isSettingsModalOpen,
    isPreloadedMessagesModalOpen,
    setIsLogViewerOpen,
    onTogglePip,
    isPipSupported,
    pipWindow,
    isLoading,
    onStopGenerating,
}: AppEventsProps) => {
    const [installPromptEvent, setInstallPromptEvent] = useState<any>(null);
    const [isStandalone, setIsStandalone] = useState(window.matchMedia('(display-mode: standalone)').matches);

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

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.defaultPrevented) return; // Ignore if already handled (e.g. by textarea)

            // Check active element in the document where the event occurred
            const targetDoc = event.view?.document || document;
            const activeElement = targetDoc.activeElement as HTMLElement;
            
            const isGenerallyInputFocused = activeElement && (
                activeElement.tagName.toLowerCase() === 'input' || 
                activeElement.tagName.toLowerCase() === 'textarea' || 
                activeElement.tagName.toLowerCase() === 'select' || 
                activeElement.isContentEditable
            );

            // Handle Stop / Cancel (Global Esc)
            if (isShortcutPressed(event, 'global.stopCancel', appSettings)) {
                if (isLoading) {
                    event.preventDefault();
                    onStopGenerating();
                    return;
                }
                // Don't prevent default for Esc generally as it closes modals etc.
                // unless we specifically handle it here.
            }

            // New Chat
            if (isShortcutPressed(event, 'general.newChat', appSettings)) {
                event.preventDefault();
                startNewChat(); 
                return;
            }

            // Open Logs
            if (isShortcutPressed(event, 'general.openLogs', appSettings)) {
                event.preventDefault();
                setIsLogViewerOpen(prev => !prev);
                return;
            }

            // Toggle PiP
            if (isShortcutPressed(event, 'general.togglePip', appSettings)) {
                if (isPipSupported) {
                    event.preventDefault();
                    onTogglePip();
                }
                return;
            }

            // Toggle Fullscreen
            if (isShortcutPressed(event, 'general.toggleFullscreen', appSettings)) {
                event.preventDefault();
                if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen().catch(err => {
                        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
                    });
                } else {
                    if (document.exitFullscreen) {
                        document.exitFullscreen();
                    }
                }
                return;
            }

            // Cycle Models
            if (isShortcutPressed(event, 'input.cycleModels', appSettings)) {
                 const isChatTextareaFocused = activeElement?.getAttribute('aria-label') === 'Chat message input';
                 // Only allow cycling via Tab if not in a general input, OR if specifically in chat input (where Tab indentation isn't primary)
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

            // Focus Input
            if (isShortcutPressed(event, 'input.focusInput', appSettings) && !isGenerallyInputFocused) {
                 event.preventDefault();
                 const textarea = document.querySelector('textarea[aria-label="Chat message input"]') as HTMLTextAreaElement;
                 if (textarea) textarea.focus();
            }

            // File Navigation (Global)
            if (isShortcutPressed(event, 'global.prevFile', appSettings)) {
                 // Dispatch custom event or handle via context if file preview is open?
                 // For now, FilePreviewModal handles its own keys locally, 
                 // this global hook is for app-wide.
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        if (pipWindow && pipWindow.document) {
            pipWindow.document.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            if (pipWindow && pipWindow.document) {
                pipWindow.document.removeEventListener('keydown', handleKeyDown);
            }
        };
    }, [appSettings, startNewChat, isSettingsModalOpen, isPreloadedMessagesModalOpen, currentChatSettings.modelId, handleSelectModelInHeader, setIsLogViewerOpen, isPipSupported, onTogglePip, pipWindow, isLoading, onStopGenerating]);

    return {
        installPromptEvent,
        isStandalone,
        handleInstallPwa,
    };
};
