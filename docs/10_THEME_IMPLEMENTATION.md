# Theme System Implementation Guide
## Light & Dark Theme Support

### Version: 1.0

---

## 1. Overview

The application supports **three theme modes**:
- **Light Theme**: Default bright interface
- **Dark Theme**: Dark interface for low-light environments
- **System Default**: Automatically follows OS theme preference

**Key Features:**
- ✅ Smooth transitions between themes
- ✅ Persistent user preference (localStorage)
- ✅ System theme detection
- ✅ CSS variables for easy theming
- ✅ All components theme-aware

---

## 2. Architecture

### 2.1 Theme System Structure

```
Theme System
├── CSS Variables (Color Tokens)
│   ├── Light Theme Variables
│   └── Dark Theme Variables
├── Theme Hook (useTheme)
│   ├── State Management
│   ├── System Detection
│   └── LocalStorage Persistence
├── Theme Toggle Component
│   ├── Header Toggle (Quick Switch)
│   └── Settings Page (Full Options)
└── Theme Context (Optional)
    └── Global Theme State
```

### 2.2 Implementation Approach

**CSS Variables Method** (Recommended):
- Define all colors as CSS custom properties
- Switch theme by changing `data-theme` attribute on `:root`
- Components automatically inherit new colors
- No component-level theme logic needed

---

## 3. CSS Variables Setup

### 3.1 Global Theme File

```css
/* styles/themes.css */

:root {
  /* Transition for smooth theme changes */
  --theme-transition: background-color 0.2s ease, 
                      color 0.2s ease, 
                      border-color 0.2s ease,
                      box-shadow 0.2s ease;
  
  /* Apply transitions globally */
  * {
    transition: var(--theme-transition);
  }
}

/* Light Theme - Charming Seaside (Default) */
:root[data-theme="light"],
:root:not([data-theme]) {
  /* Primary Colors - Ocean Teal */
  --primary: #0891b2;
  --primary-hover: #06b6d4;
  --primary-light: #cffafe;
  --primary-dark: #0e7490;

  /* Secondary Color - Sky Blue */
  --secondary: #38bdf8;
  --secondary-hover: #0ea5e9;

  /* Accent Colors - Seaside Theme */
  --accent-coral: #f97316;
  --accent-seafoam: #2dd4bf;
  --accent-sand: #fef3c7;

  /* Background Colors - Seaside Inspired */
  --bg-primary: #ffffff;
  --bg-secondary: #f0f9ff;
  --bg-tertiary: #e0f2fe;
  --bg-hover: #bae6fd;
  --bg-active: #7dd3fc;
  --bg-overlay: rgba(8, 145, 178, 0.5);

  /* Text Colors */
  --text-primary: #0c4a6e;
  --text-secondary: #075985;
  --text-tertiary: #0891b2;
  --text-disabled: #67e8f9;
  --text-inverse: #ffffff;

  /* Border Colors */
  --border-primary: #cffafe;
  --border-secondary: #a5f3fc;
  --border-focus: #0891b2;

  /* Status Colors */
  --status-pending: #f59e0b;
  --status-received: #fbbf24;
  --status-notified-call: #10b981;
  --status-notified-whatsapp: #059669;

  /* Semantic Colors - Seaside Theme */
  --success: #10b981;
  --success-light: #d1fae5;
  --warning: #f59e0b;
  --warning-light: #fef3c7;
  --error: #ef4444;
  --error-light: #fee2e2;
  --info: #0891b2;
  --info-light: #cffafe;

  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

/* Dark Theme - Seaside Night */
:root[data-theme="dark"] {
  /* Primary Colors - Bright Ocean Teal */
  --primary: #06b6d4;
  --primary-hover: #22d3ee;
  --primary-light: #0e7490;
  --primary-dark: #155e75;

  /* Secondary Color - Sky Blue */
  --secondary: #38bdf8;
  --secondary-hover: #7dd3fc;

  /* Accent Colors - Seaside Theme */
  --accent-coral: #fb923c;
  --accent-seafoam: #5eead4;
  --accent-sand: #fcd34d;

  /* Background Colors - Deep Ocean Night */
  --bg-primary: #0c4a6e;
  --bg-secondary: #075985;
  --bg-tertiary: #0369a1;
  --bg-hover: #0284c7;
  --bg-active: #0ea5e9;
  --bg-overlay: rgba(6, 182, 212, 0.7);

  /* Text Colors */
  --text-primary: #f0f9ff;
  --text-secondary: #e0f2fe;
  --text-tertiary: #bae6fd;
  --text-disabled: #7dd3fc;
  --text-inverse: #0c4a6e;

  /* Border Colors */
  --border-primary: #0369a1;
  --border-secondary: #0284c7;
  --border-focus: #06b6d4;

  /* Status Colors (Brighter) */
  --status-pending: #fbbf24;
  --status-received: #fcd34d;
  --status-notified-call: #34d399;
  --status-notified-whatsapp: #10b981;

  /* Semantic Colors - Seaside Theme */
  --success: #34d399;
  --success-light: #065f46;
  --warning: #fbbf24;
  --warning-light: #78350f;
  --error: #f87171;
  --error-light: #7f1d1d;
  --info: #06b6d4;
  --info-light: #155e75;

  /* Shadows (Darker) */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
}

/* System Theme Detection */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme]) {
    /* Apply dark theme when system prefers dark and no theme set */
  }
}
```

### 3.2 Component Usage

```css
/* Example: Button Component */
.button {
  background-color: var(--primary);
  color: var(--text-inverse);
  border: 1px solid var(--border-primary);
  box-shadow: var(--shadow-sm);
}

.button:hover {
  background-color: var(--primary-hover);
}

/* Example: Card Component */
.card {
  background-color: var(--bg-primary);
  border: 1px solid var(--border-primary);
  color: var(--text-primary);
}

/* Example: Input Component */
.input {
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  color: var(--text-primary);
}

.input:focus {
  border-color: var(--border-focus);
  box-shadow: 0 0 0 3px var(--primary-light);
}
```

---

## 4. React Implementation

### 4.1 Theme Hook

```typescript
// hooks/useTheme.ts
import { useState, useEffect, useCallback } from 'react';

export type Theme = 'light' | 'dark' | 'system';

export const useTheme = () => {
  const [theme, setTheme] = useState<Theme>(() => {
    // Load from localStorage or default to 'system'
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme') as Theme;
      if (saved && ['light', 'dark', 'system'].includes(saved)) {
        return saved;
      }
    }
    return 'system';
  });

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    }
    return theme;
  });

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
      setResolvedTheme(prefersDark ? 'dark' : 'light');
    } else {
      root.setAttribute('data-theme', theme);
      setResolvedTheme(theme);
    }
  }, [theme]);

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      const root = document.documentElement;
      root.setAttribute('data-theme', e.matches ? 'dark' : 'light');
      setResolvedTheme(e.matches ? 'dark' : 'light');
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } 
    // Fallback for older browsers
    else {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, [theme]);

  // Change theme function
  const changeTheme = useCallback((newTheme: Theme) => {
    setTheme(newTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', newTheme);
    }
  }, []);

  return {
    theme,
    resolvedTheme,
    changeTheme,
    isDark: resolvedTheme === 'dark',
    isLight: resolvedTheme === 'light',
  };
};
```

### 4.2 Theme Context (Optional, for complex apps)

```typescript
// context/ThemeContext.tsx
import React, { createContext, useContext, ReactNode } from 'react';
import { useTheme, Theme } from '../hooks/useTheme';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  changeTheme: (theme: Theme) => void;
  isDark: boolean;
  isLight: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const theme = useTheme();

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useThemeContext = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext must be used within ThemeProvider');
  }
  return context;
};
```

---

## 5. Theme Toggle Components

### 5.1 Simple Theme Toggle (Header)

```tsx
// components/common/ThemeToggle.tsx
import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import './ThemeToggle.css';

export const ThemeToggle: React.FC = () => {
  const { theme, changeTheme, resolvedTheme } = useTheme();

  const getIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun size={20} />;
      case 'dark':
        return <Moon size={20} />;
      case 'system':
        return <Monitor size={20} />;
    }
  };

  const cycleTheme = () => {
    switch (theme) {
      case 'light':
        changeTheme('dark');
        break;
      case 'dark':
        changeTheme('system');
        break;
      case 'system':
        changeTheme('light');
        break;
    }
  };

  return (
    <button
      className="theme-toggle"
      onClick={cycleTheme}
      aria-label={`Current theme: ${theme}. Click to change theme.`}
      title={`Theme: ${theme}`}
    >
      {getIcon()}
    </button>
  );
};
```

```css
/* components/common/ThemeToggle.css */
.theme-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  border: 1px solid var(--border-primary);
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  cursor: pointer;
  transition: var(--theme-transition);
}

.theme-toggle:hover {
  background-color: var(--bg-hover);
  border-color: var(--border-focus);
}

.theme-toggle:focus {
  outline: none;
  box-shadow: 0 0 0 3px var(--primary-light);
}
```

### 5.2 Advanced Theme Selector (Settings Page)

```tsx
// components/settings/ThemeSelector.tsx
import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme, Theme } from '../../hooks/useTheme';
import './ThemeSelector.css';

export const ThemeSelector: React.FC = () => {
  const { theme, changeTheme } = useTheme();

  const themes: Array<{ value: Theme; label: string; icon: React.ReactNode; description: string }> = [
    {
      value: 'light',
      label: 'Light',
      icon: <Sun size={24} />,
      description: 'Bright interface',
    },
    {
      value: 'dark',
      label: 'Dark',
      icon: <Moon size={24} />,
      description: 'Dark interface for low-light',
    },
    {
      value: 'system',
      label: 'System',
      icon: <Monitor size={24} />,
      description: 'Follow OS theme',
    },
  ];

  return (
    <div className="theme-selector">
      <h3>Theme</h3>
      <p className="description">Choose your preferred color theme</p>
      <div className="theme-options">
        {themes.map((option) => (
          <button
            key={option.value}
            className={`theme-option ${theme === option.value ? 'active' : ''}`}
            onClick={() => changeTheme(option.value)}
            aria-label={`Select ${option.label} theme`}
          >
            <div className="theme-icon">{option.icon}</div>
            <div className="theme-info">
              <div className="theme-label">{option.label}</div>
              <div className="theme-description">{option.description}</div>
            </div>
            {theme === option.value && (
              <div className="theme-checkmark">✓</div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
```

```css
/* components/settings/ThemeSelector.css */
.theme-selector {
  margin-bottom: 2rem;
}

.theme-selector h3 {
  margin-bottom: 0.5rem;
  color: var(--text-primary);
}

.description {
  margin-bottom: 1rem;
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.theme-options {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.theme-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1.5rem;
  border: 2px solid var(--border-primary);
  border-radius: 12px;
  background-color: var(--bg-secondary);
  cursor: pointer;
  transition: var(--theme-transition);
  position: relative;
}

.theme-option:hover {
  border-color: var(--border-focus);
  background-color: var(--bg-hover);
}

.theme-option.active {
  border-color: var(--primary);
  background-color: var(--primary-light);
}

.theme-icon {
  margin-bottom: 0.75rem;
  color: var(--text-primary);
}

.theme-info {
  text-align: center;
}

.theme-label {
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
}

.theme-description {
  font-size: 0.75rem;
  color: var(--text-tertiary);
}

.theme-checkmark {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: var(--primary);
  color: var(--text-inverse);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: bold;
}
```

---

## 6. Component Examples

### 6.1 Themed Button

```tsx
// components/common/Button.tsx
import React from 'react';
import './Button.css';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}) => {
  return (
    <button
      className={`btn btn-${variant} btn-${size} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
```

```css
/* components/common/Button.css */
.btn {
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: var(--theme-transition);
}

.btn-primary {
  background-color: var(--primary);
  color: var(--text-inverse);
}

.btn-primary:hover {
  background-color: var(--primary-hover);
}

.btn-secondary {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-primary);
}

.btn-secondary:hover {
  background-color: var(--bg-hover);
}

.btn-danger {
  background-color: var(--error);
  color: var(--text-inverse);
}

.btn-danger:hover {
  background-color: #dc2626;
}
```

### 6.2 Themed Card

```tsx
// components/common/Card.tsx
import React from 'react';
import './Card.css';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div className={`card ${className}`}>
      {children}
    </div>
  );
};
```

```css
/* components/common/Card.css */
.card {
  background-color: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: var(--shadow-sm);
  transition: var(--theme-transition);
}

.card:hover {
  box-shadow: var(--shadow-md);
}
```

---

## 7. Integration in Settings Page

```tsx
// pages/SettingsPage.tsx
import { ThemeSelector } from '../components/settings/ThemeSelector';

export const SettingsPage: React.FC = () => {
  return (
    <div className="settings-page">
      <h1>Settings</h1>
      
      <div className="settings-section">
        <ThemeSelector />
      </div>
      
      {/* Other settings... */}
    </div>
  );
};
```

---

## 8. Best Practices

### 8.1 Color Usage

✅ **Do:**
- Use CSS variables for all colors
- Test both themes during development
- Ensure sufficient contrast ratios (WCAG AA)
- Use semantic color names (--text-primary, not --gray-900)

❌ **Don't:**
- Hardcode color values
- Assume colors work in both themes
- Use only opacity for contrast
- Forget to test status colors in dark theme

### 8.2 Performance

- **CSS Variables**: No performance impact
- **Theme Switching**: Instant (just attribute change)
- **Transitions**: Smooth 200ms transition
- **System Detection**: Efficient media query listener

### 8.3 Accessibility

- Ensure WCAG AA contrast ratios in both themes
- Test with screen readers
- Provide theme toggle labels
- Support keyboard navigation

---

## 9. Testing Checklist

- [ ] Light theme displays correctly
- [ ] Dark theme displays correctly
- [ ] System theme follows OS preference
- [ ] Theme preference persists after restart
- [ ] Theme changes smoothly (no flash)
- [ ] All components respect theme
- [ ] Status colors visible in both themes
- [ ] Form inputs readable in both themes
- [ ] Modals/overlays work in both themes
- [ ] Images/illustrations adapt (if applicable)

---

## 10. Troubleshooting

### Theme Not Applying
- Check `data-theme` attribute on `:root`
- Verify CSS variables are defined
- Check localStorage for saved theme
- Clear browser cache

### Flash of Wrong Theme
- Apply theme before React hydration
- Use inline script in HTML head
- Prevent FOUC (Flash of Unstyled Content)

### System Theme Not Working
- Check browser support for `prefers-color-scheme`
- Verify media query listener setup
- Test on different OS

---

## Document Control

**Version**: 1.0  
**Last Updated**: November 2025  
**Status**: Complete

