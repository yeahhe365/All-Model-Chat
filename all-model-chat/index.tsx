
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Import Global Styles
import './styles/main.css';
import './styles/animations.css';
import './styles/markdown.css';

// Import React PDF Styles
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

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
