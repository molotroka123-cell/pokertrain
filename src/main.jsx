import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

// Opened as a Telegram Mini App: tell Telegram the app is ready and take the full height.
try { window.Telegram?.WebApp?.ready(); window.Telegram?.WebApp?.expand(); } catch { /* plain browser */ }

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
);
