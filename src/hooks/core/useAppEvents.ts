import { useState, useEffect } from 'react';
import { AppSettings, ChatSettings } from '../../types';
import { TAB_CYCLE_MODELS } from '../../constants/appConstants';
import { logService } from '../../utils/appUtils';
import { isShortcutPressed } from '../../utils/shortcutUtils';
import { useFullscreen } from '../ui/useFullscreen';
import { getManualInstallMessage, getPwaInstallState } from '../../pwa/install';
import { registerPwa, type UpdateServiceWorker } from '../../pwa/register';

interface AppEventsProps {
    appSettings: AppSettings;
    startNewChat: () => void;
    currentChatSettings: ChatSettings;
    handleSelectModelInHeader: (modelId: string) => void;
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
    currentChatSettings,
    handleSelectModelInHeader,
    setIsLogViewerOpen,
    onTogglePip,
    isPipSupported,
    pipWindow,
    isLoading,
    onStopGenerating,
}: AppEventsProps) => {
    const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
    const [installState, setInstallState] = useState(() =>
      getPwaInstallState({
        installPromptEvent: null,
        win: window,
      }),
    );
    const [needRefresh, setNeedRefresh] = useState(false);
    const [updateDismissed, setUpdateDismissed] = useState(false);
    const [updateServiceWorker, setUpdateServiceWorker] = useState<UpdateServiceWorker>(() => async () => undefined);
    const { toggleFullscreen } = useFullscreen();

    useEffect(() => {
        setInstallState(
          getPwaInstallState({
            installPromptEvent,
            win: window,
          }),
        );
    }, [installPromptEvent]);

    // PWA Installation Handlers
    useEffect(() => {
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            logService.info('PWA install prompt available.');
            setInstallPromptEvent(e as BeforeInstallPromptEvent);
        };
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }, []);

    useEffect(() => {
        const handleAppInstalled = () => {
            logService.info('PWA installed successfully.');
            setInstallPromptEvent(null);
            setInstallState(
              getPwaInstallState({
                installPromptEvent: null,
                win: window,
              }),
            );
        };
        window.addEventListener('appinstalled', handleAppInstalled);
        return () => window.removeEventListener('appinstalled', handleAppInstalled);
    }, []);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(display-mode: standalone)');
        const syncInstallState = () => {
            setInstallState(
              getPwaInstallState({
                installPromptEvent,
                win: window,
              }),
            );
        };

        mediaQuery.addEventListener?.('change', syncInstallState);
        return () => mediaQuery.removeEventListener?.('change', syncInstallState);
    }, [installPromptEvent]);

    useEffect(() => {
        let cancelled = false;

        const registerRuntimePwa = async () => {
            if (!import.meta.env.PROD) {
                return;
            }

            const { registerSW } = await import('virtual:pwa-register');
            const nextUpdater = registerPwa({
                enabled: true,
                registerSWImpl: registerSW,
                onNeedRefresh: () => {
                    if (cancelled) return;
                    setNeedRefresh(true);
                    setUpdateDismissed(false);
                },
                onOfflineReady: () => {
                    if (cancelled) return;
                    logService.info('PWA offline app shell is ready.');
                },
            });

            if (!cancelled) {
                setUpdateServiceWorker(() => nextUpdater);
            }
        };

        void registerRuntimePwa();

        return () => {
            cancelled = true;
        };
    }, []);

    const handleInstallPwa = async () => {
        if (installState.state === 'available' && installPromptEvent) {
            installPromptEvent.prompt();
            const { outcome } = await installPromptEvent.userChoice;
            logService.info(`PWA install prompt outcome: ${outcome}`);
            setInstallPromptEvent(null);
            return;
        }

        if (installState.state === 'manual') {
            const manualMessage = getManualInstallMessage(appSettings.language);
            window.alert(manualMessage);
            logService.info('PWA install instructions shown for manual-install browser.');
        }
    };

    const handleRefreshApp = async () => {
        await updateServiceWorker(true);
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
    }, [appSettings, startNewChat, currentChatSettings.modelId, handleSelectModelInHeader, setIsLogViewerOpen, isPipSupported, onTogglePip, pipWindow, isLoading, onStopGenerating, toggleFullscreen]);

    return {
        installPromptEvent,
        installState,
        handleInstallPwa,
        needRefresh,
        updateDismissed,
        dismissUpdateBanner: () => setUpdateDismissed(true),
        handleRefreshApp,
    };
};
