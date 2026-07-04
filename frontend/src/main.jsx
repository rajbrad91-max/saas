import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles/index.css';
import { polyfillCountryFlagEmojis } from 'country-flag-emoji-polyfill';

// Makes flag emojis (🇨🇦 🇺🇸 …) render on Windows
polyfillCountryFlagEmojis();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
