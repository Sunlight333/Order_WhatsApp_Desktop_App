import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';

// Apply theme immediately from localStorage before React renders (prevents flash)
(function applyInitialTheme() {
  const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'system' | null;
  const root = document.documentElement;
  
  if (savedTheme === 'system' || !savedTheme) {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  } else {
    root.setAttribute('data-theme', savedTheme);
  }
})();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

