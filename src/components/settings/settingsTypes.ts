import type { PwaInstallState } from '../../pwa/install';
import type { AppSettings } from '../../types';

export type SettingsUpdateHandler = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;

export interface SettingsTransferProps {
  onInstallPwa: () => void;
  installState: PwaInstallState;
  onImportScenarios: (file: File) => void;
  onExportScenarios: () => void;
}
