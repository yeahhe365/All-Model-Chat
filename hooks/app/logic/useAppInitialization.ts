
import { useEffect } from 'react';
import { AppSettings } from '../../../types';
import { networkInterceptor } from '../../../services/networkInterceptor';
import { logService } from '../../../utils/appUtils';

export const useAppInitialization = (appSettings: AppSettings) => {
  // Initialize Network Interceptor
  useEffect(() => {
      networkInterceptor.mount();
  }, []);

  // Update Interceptor Configuration when settings change
  useEffect(() => {
      const shouldUseProxy = appSettings.useCustomApiConfig && appSettings.useApiProxy;
      networkInterceptor.configure(!!shouldUseProxy, appSettings.apiProxyUrl);
  }, [appSettings.useCustomApiConfig, appSettings.useApiProxy, appSettings.apiProxyUrl]);

  useEffect(() => {
    logService.info('App initialized.');
  }, []);
};
