import type { PwaInstallState } from '../../pwa/install';

export interface SettingsTransferProps {
  onInstallPwa: () => void;
  installState: PwaInstallState;
  onImportScenarios: (file: File) => void;
  onExportScenarios: () => void;
}
