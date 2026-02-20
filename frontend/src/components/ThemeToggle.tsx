import { Sun, Moon, Monitor } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { configService } from '../services/config.service';

type Theme = 'light' | 'dark' | 'system';

export default function ThemeToggle() {
  const { t } = useTranslation();
  const [theme, setTheme] = useState<Theme>(() => {
    // Try to get theme from config service first, then fallback to localStorage
    const config = configService.getConfig();
    if (config?.theme) {
      return config.theme;
    }
    const saved = localStorage.getItem('theme') as Theme;
    return saved || 'system';
  });

  useEffect(() => {
    // Load theme from config on mount
    const loadTheme = async () => {
      try {
        const config = await configService.loadConfig();
        if (config?.theme) {
          setTheme(config.theme);
        }
      } catch (error) {
        console.error('Failed to load theme from config:', error);
      }
    };
    loadTheme();

    // Subscribe to config changes
    const unsubscribe = configService.subscribe(() => {
      const config = configService.getConfig();
      if (config?.theme) {
        setTheme(config.theme);
      }
    });

    return unsubscribe;
  }, []);

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

  const changeTheme = async (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Save to config service
    try {
      await configService.saveConfig({ theme: newTheme });
    } catch (error) {
      console.error('Failed to save theme to config:', error);
    }
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
        title={t('settings.light')}
        aria-label={t('settings.light')}
      >
        <Sun size={18} />
      </button>
      <button
        type="button"
        onClick={() => changeTheme('dark')}
        className={`theme-btn ${theme === 'dark' ? 'active' : ''}`}
        title={t('settings.dark')}
        aria-label={t('settings.dark')}
      >
        <Moon size={18} />
      </button>
      <button
        type="button"
        onClick={() => changeTheme('system')}
        className={`theme-btn ${theme === 'system' ? 'active' : ''}`}
        title={t('settings.system')}
        aria-label={t('settings.system')}
      >
        <Monitor size={18} />
      </button>
    </div>
  );
}

