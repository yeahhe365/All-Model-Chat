import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { logService } from './services/logService';

// Register the service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(registration => {
      logService.info('Service Worker registered successfully.', { scope: registration.scope });
      // Listen for updates
      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (installingWorker) {
          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                // New content is available and will be used when all
                // tabs for this page are closed. We can prompt the user to reload.
                logService.info('New or updated content is available.');
              } else {
                // Content is cached for the first time.
                logService.info('Content is cached for offline use.');
              }
            }
          };
        }
      };
    }).catch(error => {
      logService.error('Service Worker registration failed.', { error });
    });
  });
}


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