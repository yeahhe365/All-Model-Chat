import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { APP_SETTINGS_KEY, DEFAULT_APP_SETTINGS } from './constants/appConstants';
import { AppSettings } from './types';

// --- API URL Override Patch ---
try {
  const settingsStr = localStorage.getItem(APP_SETTINGS_KEY);
  if (settingsStr) {
    const settings: AppSettings = { ...DEFAULT_APP_SETTINGS, ...JSON.parse(settingsStr) };
    if (settings.useCustomApiConfig && settings.apiUrl) {
      const originalFetch = window.fetch;
      const customApiUrl = settings.apiUrl.trim().replace(/\/$/, '');
      const defaultApiUrl = 'https://generativelanguage.googleapis.com';
      
      console.log(`[API Patch] Intercepting fetch calls to '${defaultApiUrl}' and redirecting to '${customApiUrl}'.`);

      window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        let newUrl: string;

        if (typeof input === 'string') {
          newUrl = input.startsWith(defaultApiUrl) ? input.replace(defaultApiUrl, customApiUrl) : input;
          return originalFetch(newUrl, init);
        }

        if (input instanceof URL) {
            newUrl = input.href.startsWith(defaultApiUrl) ? input.href.replace(defaultApiUrl, customApiUrl) : input.href;
            return originalFetch(new URL(newUrl), init);
        }

        // It's a Request object
        if (input.url.startsWith(defaultApiUrl)) {
            newUrl = input.url.replace(defaultApiUrl, customApiUrl);
            const newRequest = new Request(newUrl, input);
            return originalFetch(newRequest, init);
        }

        return originalFetch(input, init);
      };
    }
  }
} catch (error) {
  console.error('Failed to apply API override patch:', error);
}
// --- End of Patch ---


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