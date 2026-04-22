export type UpdateServiceWorker = (reloadPage?: boolean) => Promise<void>;

interface RegisterPwaOptions {
  enabled: boolean;
  registerSWImpl?: (options: {
    immediate: boolean;
    onNeedRefresh?: () => void;
    onOfflineReady?: () => void;
    onRegisteredSW?: (swScriptUrl: string, registration: ServiceWorkerRegistration | undefined) => void;
    onRegisterError?: (error: unknown) => void;
  }) => UpdateServiceWorker;
  onNeedRefresh?: () => void;
  onOfflineReady?: () => void;
  onRegisteredSW?: (swScriptUrl: string, registration: ServiceWorkerRegistration | undefined) => void;
  onRegisterError?: (error: unknown) => void;
}

const noopUpdateServiceWorker: UpdateServiceWorker = async () => undefined;

export const registerPwa = ({
  enabled,
  registerSWImpl,
  onNeedRefresh,
  onOfflineReady,
  onRegisteredSW,
  onRegisterError,
}: RegisterPwaOptions): UpdateServiceWorker => {
  if (!enabled || !registerSWImpl) {
    return noopUpdateServiceWorker;
  }

  return registerSWImpl({
    immediate: true,
    onNeedRefresh,
    onOfflineReady,
    onRegisteredSW,
    onRegisterError,
  });
};
