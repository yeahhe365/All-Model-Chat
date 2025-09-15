import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { APP_LOGO_SVG_DATA_URI } from './constants/appConstants';
import { initializeProxyInterceptor } from './utils/proxyInterceptor';

// Set dynamic icons before rendering to avoid flickering
const favicon = document.getElementById('favicon');
if (favicon) {
  favicon.setAttribute('href', APP_LOGO_SVG_DATA_URI);
}
const appleTouchIcon = document.getElementById('apple-touch-icon');
if (appleTouchIcon) {
  appleTouchIcon.setAttribute('href', APP_LOGO_SVG_DATA_URI);
}

(async () => {
  // Request persistent storage to prevent data loss on mobile devices
  if (navigator.storage && navigator.storage.persist) {
    try {
      const isPersisted = await navigator.storage.persisted();
      if (!isPersisted) {
        const wasGranted = await navigator.storage.persist();
        if (wasGranted) {
          console.log('✅ Storage persistence successfully granted.');
        } else {
          console.warn('⚠️ Storage persistence was not granted. Data may be cleared under storage pressure.');
        }
      } else {
        console.log('✅ Storage is already persistent.');
      }
    } catch (error) {
      console.error('Error checking or requesting storage persistence:', error);
    }
  }

  // 初始化代理拦截器
  await initializeProxyInterceptor();

  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error("Could not find root element to mount to");
  }

  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
})();