export type UpdateServiceWorker = (reloadPage?: boolean) => Promise<void>;

export interface RegisterPwaOptions {
  enabled: boolean;
  registerSWImpl?: (options: {
    immediate: boolean;
    onNeedRefresh?: () => void;
    onOfflineReady?: () => void;
  }) => UpdateServiceWorker;
  onNeedRefresh?: () => void;
  onOfflineReady?: () => void;
}

const noopUpdateServiceWorker: UpdateServiceWorker = async () => undefined;

export const registerPwa = ({
  enabled,
  registerSWImpl,
  onNeedRefresh,
  onOfflineReady,
}: RegisterPwaOptions): UpdateServiceWorker => {
  if (!enabled || !registerSWImpl) {
    return noopUpdateServiceWorker;
  }

  return registerSWImpl({
    immediate: true,
    onNeedRefresh,
    onOfflineReady,
  });
};
