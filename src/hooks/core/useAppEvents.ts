import { useState, useEffect, useRef, useCallback, type Dispatch, type SetStateAction } from 'react';
import { AppSettings, ChatSettings, ModelOption } from '../../types';
import { logService } from '../../services/logService';
import { isShortcutPressed } from '../../utils/shortcutUtils';
import { useFullscreen } from '../ui/useFullscreen';
import { getManualInstallMessage, getPwaInstallState } from '../../pwa/install';
import { registerPwa, type UpdateServiceWorker } from '../../pwa/register';
import { loadRegisterSW } from '../../pwa/loadRegisterSw';
import { getTabCycleModelIds } from '../../utils/modelCatalog';
import { FOCUS_HISTORY_SEARCH_EVENT } from '../../constants/shortcuts';
import { isOpenAICompatibleApiActive } from '../../utils/openaiCompatibleMode';

interface AppEventsProps {
  appSettings: AppSettings;
  setAppSettings: Dispatch<SetStateAction<AppSettings>>;
  startNewChat: () => void;
  currentChatSettings: ChatSettings;
  availableModels: ModelOption[];
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
  setAppSettings,
  startNewChat,
  currentChatSettings,
  availableModels,
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
  const [canCheckForUpdates, setCanCheckForUpdates] = useState(false);
  const [manualUpdateCheckState, setManualUpdateCheckState] = useState<
    'idle' | 'checking' | 'up-to-date' | 'update-available' | 'error'
  >('idle');
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const manualUpdateTimerRef = useRef<number | null>(null);
  const manualUpdateCheckIdRef = useRef(0);
  const { toggleFullscreen } = useFullscreen();

  const clearManualUpdateTimer = useCallback(() => {
    if (manualUpdateTimerRef.current !== null) {
      window.clearTimeout(manualUpdateTimerRef.current);
      manualUpdateTimerRef.current = null;
    }
  }, []);

  // PWA Installation Handlers
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      logService.info('PWA install prompt available.');
      const nextPromptEvent = e as BeforeInstallPromptEvent;
      setInstallPromptEvent(nextPromptEvent);
      setInstallState(
        getPwaInstallState({
          installPromptEvent: nextPromptEvent,
          win: window,
        }),
      );
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

      const registerSW = await loadRegisterSW();
      const nextUpdater = registerPwa({
        enabled: true,
        registerSWImpl: registerSW,
        onNeedRefresh: () => {
          if (cancelled) return;
          clearManualUpdateTimer();
          setNeedRefresh(true);
          setUpdateDismissed(false);
          setManualUpdateCheckState('update-available');
        },
        onOfflineReady: () => {
          if (cancelled) return;
          logService.info('PWA offline app shell is ready.');
        },
        onRegisteredSW: (_swScriptUrl, registration) => {
          if (cancelled) return;
          registrationRef.current = registration ?? null;
          setCanCheckForUpdates(!!registration);
        },
        onRegisterError: (error) => {
          if (cancelled) return;
          logService.error('PWA registration failed.', { error });
          registrationRef.current = null;
          setCanCheckForUpdates(false);
        },
      });

      if (!cancelled) {
        setUpdateServiceWorker(() => nextUpdater);
      }
    };

    void registerRuntimePwa();

    return () => {
      cancelled = true;
      clearManualUpdateTimer();
    };
  }, [clearManualUpdateTimer]);

  const handleInstallPwa = async () => {
    if (installState.state === 'available' && installPromptEvent) {
      installPromptEvent.prompt();
      const { outcome } = await installPromptEvent.userChoice;
      logService.info(`PWA install prompt outcome: ${outcome}`);
      setInstallPromptEvent(null);
      setInstallState(
        getPwaInstallState({
          installPromptEvent: null,
          win: window,
        }),
      );
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

  const handleCheckForUpdates = useCallback(async () => {
    const registration = registrationRef.current;
    if (!registration) {
      setManualUpdateCheckState('error');
      return;
    }

    clearManualUpdateTimer();
    const checkId = manualUpdateCheckIdRef.current + 1;
    manualUpdateCheckIdRef.current = checkId;
    setManualUpdateCheckState('checking');

    try {
      await registration.update();
      manualUpdateTimerRef.current = window.setTimeout(() => {
        if (manualUpdateCheckIdRef.current !== checkId) {
          return;
        }

        setManualUpdateCheckState((prev) => (prev === 'update-available' ? prev : 'up-to-date'));
        manualUpdateTimerRef.current = null;
      }, 1200);
    } catch (error) {
      logService.error('Manual PWA update check failed.', { error });
      if (manualUpdateCheckIdRef.current === checkId) {
        setManualUpdateCheckState('error');
      }
    }
  }, [clearManualUpdateTimer]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;

      const targetDoc = event.view?.document || document;
      const activeElement = targetDoc.activeElement as HTMLElement;

      const isGenerallyInputFocused =
        activeElement &&
        (activeElement.tagName.toLowerCase() === 'input' ||
          activeElement.tagName.toLowerCase() === 'textarea' ||
          activeElement.tagName.toLowerCase() === 'select' ||
          activeElement.isContentEditable);

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

      if (isShortcutPressed(event, 'general.searchChats', appSettings)) {
        event.preventDefault();
        targetDoc.dispatchEvent(new Event(FOCUS_HISTORY_SEARCH_EVENT));
        return;
      }

      if (isShortcutPressed(event, 'general.openLogs', appSettings)) {
        event.preventDefault();
        setIsLogViewerOpen((prev) => !prev);
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
          const isOpenAICompatibleMode = isOpenAICompatibleApiActive(appSettings);
          const currentModelId = isOpenAICompatibleMode
            ? appSettings.openaiCompatibleModelId
            : currentChatSettings.modelId;
          const cycleModels = getTabCycleModelIds(availableModels, appSettings.tabModelCycleIds);
          if (cycleModels.length === 0) {
            return;
          }
          const currentIndex = cycleModels.indexOf(currentModelId);
          let nextIndex: number;
          if (currentIndex === -1) nextIndex = 0;
          else nextIndex = (currentIndex + 1) % cycleModels.length;
          const newModelId = cycleModels[nextIndex];
          if (newModelId) {
            const targetModel = availableModels.find((model) => model.id === newModelId);
            if (appSettings.isOpenAICompatibleApiEnabled === true && targetModel?.apiMode === 'openai-compatible') {
              setAppSettings((prev) => ({
                ...prev,
                apiMode: 'openai-compatible',
                openaiCompatibleModelId: newModelId,
              }));
              return;
            }

            if (isOpenAICompatibleMode) {
              setAppSettings((prev) => ({
                ...prev,
                apiMode: 'gemini-native',
              }));
            }
            handleSelectModelInHeader(newModelId);
          }
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
  }, [
    appSettings,
    setAppSettings,
    startNewChat,
    currentChatSettings.modelId,
    availableModels,
    handleSelectModelInHeader,
    setIsLogViewerOpen,
    isPipSupported,
    onTogglePip,
    pipWindow,
    isLoading,
    onStopGenerating,
    toggleFullscreen,
  ]);

  return {
    installPromptEvent,
    installState,
    handleInstallPwa,
    needRefresh,
    updateDismissed,
    dismissUpdateBanner: () => setUpdateDismissed(true),
    handleRefreshApp,
    canCheckForUpdates,
    manualUpdateCheckState,
    handleCheckForUpdates,
  };
};
