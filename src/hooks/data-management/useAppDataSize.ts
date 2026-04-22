import { useEffect, useState } from 'react';
import { dbService, type AppDataSizeEstimate } from '../../utils/db';

const formatAppDataSize = (bytes: number): string => {
  if (bytes <= 0) {
    return '0 B';
  }

  if (bytes < 1024) {
    return `${Math.round(bytes)} B`;
  }

  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const decimals = unitIndex === 0 ? 1 : 2;
  return `${value.toFixed(decimals)} ${units[unitIndex]}`;
};

interface AppDataSizeState {
  estimate: AppDataSizeEstimate | null;
  isLoading: boolean;
  hasError: boolean;
  formattedTotalSize: string;
  refresh: () => Promise<void>;
}

export const useAppDataSize = (): AppDataSizeState => {
  const [estimate, setEstimate] = useState<AppDataSizeEstimate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const refresh = async () => {
    setIsLoading(true);
    setHasError(false);

    try {
      const nextEstimate = await dbService.estimateAppDataSize();
      setEstimate(nextEstimate);
    } catch (error) {
      console.error('Failed to estimate app data size:', error);
      setEstimate(null);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  return {
    estimate,
    isLoading,
    hasError,
    formattedTotalSize: formatAppDataSize(estimate?.totalBytes ?? 0),
    refresh,
  };
};
