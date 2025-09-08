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
