import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

// Opened as a Telegram Mini App: tell Telegram the app is ready and take the full height.
try {
  const tg = window.Telegram?.WebApp;
  if (tg) {
    tg.ready(); tg.expand();
    // Telegram's own header/background in the game's colour: no light bar above the dark table
    tg.setHeaderColor?.('#050b18'); tg.setBackgroundColor?.('#050b18'); tg.setBottomBarColor?.('#050b18');
    tg.disableVerticalSwipes?.();   // scrolling the lobby must not close the mini app
  }
} catch { /* plain browser */ }

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
);
