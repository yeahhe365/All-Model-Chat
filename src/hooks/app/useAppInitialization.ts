import { useEffect } from 'react';
import { logService } from '../../utils/appUtils';

export const useAppInitialization = () => {
  useEffect(() => {
    logService.info('App initialized.');
  }, []);
};
