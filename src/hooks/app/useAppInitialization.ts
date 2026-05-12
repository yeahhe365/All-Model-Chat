import { useEffect } from 'react';
import { logService } from '@/services/logService';

export const useAppInitialization = () => {
  useEffect(() => {
    logService.info('App initialized.');
  }, []);
};
