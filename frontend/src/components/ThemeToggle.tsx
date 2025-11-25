import { Sun, Moon, Monitor } from 'lucide-react';
import { useState, useEffect } from 'react';

type Theme = 'light' | 'dark' | 'system';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme') as Theme;
    return saved || 'system';
  });

  useEffect(() => {
    const root = document.documentElement;
    
    const applyTheme = (themeValue: Theme) => {
      if (themeValue === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
      } else {
        root.setAttribute('data-theme', themeValue);
      }
    };

    applyTheme(theme);

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (theme === 'system') {
        root.setAttribute('data-theme', e.matches ? 'dark' : 'light');
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const changeTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const currentEffectiveTheme = theme === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme;

  return (
    <div className="theme-toggle">
      <button
        type="button"
        onClick={() => changeTheme('light')}
        className={`theme-btn ${theme === 'light' ? 'active' : ''}`}
        title="Light theme"
        aria-label="Light theme"
      >
        <Sun size={18} />
      </button>
      <button
        type="button"
        onClick={() => changeTheme('dark')}
        className={`theme-btn ${theme === 'dark' ? 'active' : ''}`}
        title="Dark theme"
        aria-label="Dark theme"
      >
        <Moon size={18} />
      </button>
      <button
        type="button"
        onClick={() => changeTheme('system')}
        className={`theme-btn ${theme === 'system' ? 'active' : ''}`}
        title="System theme"
        aria-label="System theme"
      >
        <Monitor size={18} />
      </button>
    </div>
  );
}

