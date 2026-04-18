import { translations } from '../../utils/appUtils';

export interface SettingsTransferProps {
    onInstallPwa: () => void;
    isInstallable: boolean;
    onImportSettings: (file: File) => void;
    onExportSettings: () => void;
    onImportHistory: (file: File) => void;
    onExportHistory: () => void;
    onImportScenarios: (file: File) => void;
    onExportScenarios: () => void;
    t: (key: keyof typeof translations | string, fallback?: string) => string;
}
