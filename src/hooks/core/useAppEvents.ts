import { useState, useEffect } from 'react';
import { AppSettings, ChatSettings } from '../../types';
import { TAB_CYCLE_MODELS } from '../../constants/appConstants';
import { logService } from '../../utils/appUtils';
import { isShortcutPressed } from '../../utils/shortcutUtils';
import { useFullscreen } from '../ui/useFullscreen';

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
    const { toggleFullscreen } = useFullscreen();

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
            if (event.defaultPrevented) return;

            const targetDoc = event.view?.document || document;
            const activeElement = targetDoc.activeElement as HTMLElement;
            
            const isGenerallyInputFocused = activeElement && (
                activeElement.tagName.toLowerCase() === 'input' || 
                activeElement.tagName.toLowerCase() === 'textarea' || 
                activeElement.tagName.toLowerCase() === 'select' || 
                activeElement.isContentEditable
            );

            if (isShortcutPressed(event, 'global.stopCancel', appSettings)) {
                if (isLoading) {
                    event.preventDefault();
                    onStopGenerating();
                    return;
                }
            }

            if (isShortcutPressed(event, 'general.newChat', appSettings)) {
                event.preventDefault();
                startNewChat(); 
                return;
            }

            if (isShortcutPressed(event, 'general.openLogs', appSettings)) {
                event.preventDefault();
                setIsLogViewerOpen(prev => !prev);
                return;
            }

            if (isShortcutPressed(event, 'general.togglePip', appSettings)) {
                if (isPipSupported) {
                    event.preventDefault();
                    onTogglePip();
                }
                return;
            }

            if (isShortcutPressed(event, 'general.toggleFullscreen', appSettings)) {
                event.preventDefault();
                toggleFullscreen(document.documentElement);
                return;
            }

            if (isShortcutPressed(event, 'input.cycleModels', appSettings)) {
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

            if (isShortcutPressed(event, 'input.focusInput', appSettings) && !isGenerallyInputFocused) {
                 event.preventDefault();
                 const textarea = document.querySelector('textarea[aria-label="Chat message input"]') as HTMLTextAreaElement;
                 if (textarea) textarea.focus();
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
    }, [appSettings, startNewChat, isSettingsModalOpen, isPreloadedMessagesModalOpen, currentChatSettings.modelId, handleSelectModelInHeader, setIsLogViewerOpen, isPipSupported, onTogglePip, pipWindow, isLoading, onStopGenerating, toggleFullscreen]);

    return {
        installPromptEvent,
        isStandalone,
        handleInstallPwa,
    };
};
