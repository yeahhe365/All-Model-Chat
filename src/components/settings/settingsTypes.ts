import type { PwaInstallState } from '../../pwa/install';

export interface SettingsTransferProps {
  onInstallPwa: () => void;
  installState: PwaInstallState;
  onImportSettings: (file: File) => void;
  onExportSettings: () => void;
  onImportHistory: (file: File) => void;
  onExportHistory: () => void;
  onImportScenarios: (file: File) => void;
  onExportScenarios: () => void;
}
