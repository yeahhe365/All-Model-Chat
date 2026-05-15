import { useState, useEffect, type Dispatch, type SetStateAction } from 'react';
import { type AppSettings, type ChatSettings, type ModelOption } from '@/types';
import { logService } from '@/services/logService';
import { isShortcutPressed } from '@/utils/shortcutUtils';
import { useFullscreen } from '@/hooks/ui/useFullscreen';
import { getManualInstallMessage, getPwaInstallState } from '@/pwa/install';
import { registerPwa, type UpdateServiceWorker } from '@/pwa/register';
import { loadRegisterSW } from '@/pwa/loadRegisterSw';
import { getTabCycleModelIds } from '@/utils/modelCatalog';
import { CHAT_INPUT_TEXTAREA_SELECTOR } from '@/constants/appConstants';
import { FOCUS_HISTORY_SEARCH_EVENT } from '@/constants/shortcuts';
import { isOpenAICompatibleApiActive } from '@/utils/openaiCompatibleMode';

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

const buildTabCycleAvailableModels = (appSettings: AppSettings, availableModels: ModelOption[]): ModelOption[] => {
  const seenIds = new Set<string>();
  const openAICompatibleModels =
    appSettings.isOpenAICompatibleApiEnabled === true
      ? appSettings.openaiCompatibleModels.map((model) => ({
          ...model,
          apiMode: 'openai-compatible' as const,
        }))
      : [];

  return [...availableModels, ...openAICompatibleModels].filter((model) => {
    if (seenIds.has(model.id)) {
      return false;
    }

    seenIds.add(model.id);
    return true;
  });
};

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
  const { toggleFullscreen } = useFullscreen();

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
          setNeedRefresh(true);
          setUpdateDismissed(false);
        },
        onOfflineReady: () => {
          if (cancelled) return;
          logService.info('PWA offline app shell is ready.');
        },
        onRegisterError: (error) => {
          if (cancelled) return;
          logService.error('PWA registration failed.', { error });
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
        const isChatTextareaFocused =
          activeElement instanceof Element && activeElement.matches(CHAT_INPUT_TEXTAREA_SELECTOR);
        if (isChatTextareaFocused || !isGenerallyInputFocused) {
          event.preventDefault();
          const isOpenAICompatibleMode = isOpenAICompatibleApiActive(appSettings);
          const currentModelId = isOpenAICompatibleMode
            ? appSettings.openaiCompatibleModelId
            : currentChatSettings.modelId;
          const tabCycleModels = buildTabCycleAvailableModels(appSettings, availableModels);
          const cycleModels = getTabCycleModelIds(tabCycleModels, appSettings.tabModelCycleIds);
          if (cycleModels.length === 0) {
            return;
          }
          const currentIndex = cycleModels.indexOf(currentModelId);
          let nextIndex: number;
          if (currentIndex === -1) nextIndex = 0;
          else nextIndex = (currentIndex + 1) % cycleModels.length;
          const newModelId = cycleModels[nextIndex];
          if (newModelId) {
            const targetModel = tabCycleModels.find((model) => model.id === newModelId);
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
  };
};
