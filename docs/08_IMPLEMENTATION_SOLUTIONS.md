# Implementation Solutions Guide
## Quick Reference for Key Implementation Patterns

### Version: 1.0

---

## 🎯 Overview

This document provides quick reference implementations for the key architectural decisions and patterns used in the Order Management Desktop Application.

---

## 📦 Database Solution

### Multi-Database Support (SQLite Default)

The application supports SQLite (default), MySQL, and PostgreSQL. The database provider is configured dynamically based on user settings.

#### Prisma Schema Configuration

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = env("DATABASE_PROVIDER") // "sqlite" | "mysql" | "postgresql"
  url      = env("DATABASE_URL")
}
```

#### Dynamic Database Connection

```typescript
// backend/src/config/database.ts
import { PrismaClient } from '@prisma/client';

const databaseUrl = process.env.DATABASE_URL;
const provider = process.env.DATABASE_PROVIDER || 'sqlite';

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
});
```

---

## 🖥️ Server in Electron

### Server Manager Implementation

```typescript
// electron/server-manager.ts
import express from 'express';
import { PrismaClient } from '@prisma/client';

export class ServerManager {
  private server: http.Server | null = null;
  private app: express.Application;
  
  async start(port: number = 3000) {
    const app = express();
    
    // Middleware
    app.use(express.json());
    
    // Setup routes
    // Connect to Prisma
    
    this.server = app.listen(port, '0.0.0.0');
  }
  
  async stop() {
    this.server?.close();
  }
}
```

### Step 3: Create Config Manager

```typescript
// electron/config-manager.ts
export class ConfigManager {
  async load(): Promise<AppConfig> {
    // Read from config.json
  }
  
  async save(config: Partial<AppConfig>) {
    // Write to config.json
  }
}
```

### Step 4: Create Settings Page

```tsx
// client/src/pages/SettingsPage.tsx
export const SettingsPage = () => {
  const [mode, setMode] = useState('server');
  const [serverIP, setServerIP] = useState('');
  
  return (
    <div>
      <RadioGroup value={mode} onChange={setMode}>
        <Radio value="server">Server Mode</Radio>
        <Radio value="client">Client Mode</Radio>
      </RadioGroup>
      
      {mode === 'server' && <ServerConfig />}
      {mode === 'client' && <ClientConfig />}
      
      <button onClick={handleSave}>Save & Restart</button>
    </div>
  );
};
```

### Step 5: Update Electron Main Process

```typescript
// electron/main.ts
app.whenReady().async () => {
  const config = await configManager.load();
  
  if (config.mode === 'server') {
    await serverManager.start(config.serverPort || 3000);
    mainWindow.loadURL('http://localhost:3000');
  } else {
    mainWindow.loadURL(`http://${config.serverAddress}:3000`);
  }
});
```

---

## 🎨 Settings Page UI Design

### Server Mode View

```
┌─────────────────────────────────────────┐
│  Settings                               │
├─────────────────────────────────────────┤
│                                         │
│  Application Mode                       │
│  ● Server Mode                          │
│  ○ Client Mode                          │
│                                         │
│  Server Configuration                   │
│  ┌───────────────────────────────────┐ │
│  │ Local IP Address: 192.168.1.100   │ │
│  │ Port: [3000]                      │ │
│  │                                   │ │
│  │ Share with other users:           │ │
│  │ 192.168.1.100:3000                │ │
│  └───────────────────────────────────┘ │
│                                         │
│  Database Configuration                 │
│  Database Type: [SQLite ▼]             │
│  ○ SQLite (Default - Recommended)      │
│  ○ MySQL                                │
│  ○ PostgreSQL                           │
│                                         │
│  [For SQLite]                           │
│  Database Path: [Auto]                  │
│                                         │
│  [For MySQL/PostgreSQL]                 │
│  Host: [localhost]                      │
│  Port: [3306]                           │
│  Database: [order_db]                   │
│  Username: [root]                       │
│  Password: [••••••••]                   │
│  [Test Connection]                      │
│                                         │
│  [Save Settings & Restart]             │
└─────────────────────────────────────────┘
```

### Client Mode View

```
┌─────────────────────────────────────────┐
│  Settings                               │
├─────────────────────────────────────────┤
│                                         │
│  Application Mode                       │
│  ○ Server Mode                          │
│  ● Client Mode                          │
│                                         │
│  Client Configuration                   │
│  ┌───────────────────────────────────┐ │
│  │ Server IP Address:                │ │
│  │ [192.168.1.100]                   │ │
│  │                                   │ │
│  │ Server Port:                      │ │
│  │ [3000]                            │ │
│  │                                   │ │
│  │ [Test Connection]                 │ │
│  │ Status: ✅ Connected              │ │
│  └───────────────────────────────────┘ │
│                                         │
│  [Save Settings & Restart]             │
└─────────────────────────────────────────┘
```

---

## 🎨 Theme Implementation

### 1. CSS Variables Setup

```css
/* frontend/src/styles/index.css */

:root {
  /* Transitions */
  --theme-transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}

/* Light Theme */
:root[data-theme="light"],
:root:not([data-theme]) {
  --primary: #0891b2;      /* Ocean Teal */
  --secondary: #38bdf8;    /* Sky Blue */
  --accent: #2dd4bf;       /* Seafoam Green */
  /* ... other colors */
}

/* Dark Theme */
:root[data-theme="dark"] {
  --primary: #06b6d4;      /* Brighter Ocean Teal */
  --secondary: #0ea5e9;    /* Bright Sky Blue */
  --accent: #14b8a6;       /* Bright Seafoam */
  /* ... other colors */
}
```

### 2. Theme Hook Implementation

```typescript
// hooks/useTheme.ts
import { useState, useEffect } from 'react';

type Theme = 'light' | 'dark' | 'system';

export const useTheme = () => {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme');
    return (saved as Theme) || 'system';
  });

  useEffect(() => {
    const root = document.documentElement;
    
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      root.setAttribute('data-theme', theme);
    }

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

  return { theme, changeTheme };
};
```

#### 5. Theme Toggle Component

```tsx
// components/common/ThemeToggle.tsx
import { useTheme } from '../../hooks/useTheme';
import { Sun, Moon, Monitor } from 'lucide-react';

export const ThemeToggle = () => {
  const { theme, changeTheme } = useTheme();

  return (
    <div className="theme-toggle">
      <button
        onClick={() => changeTheme('light')}
        className={theme === 'light' ? 'active' : ''}
        aria-label="Light theme"
      >
        <Sun size={20} />
      </button>
      <button
        onClick={() => changeTheme('dark')}
        className={theme === 'dark' ? 'active' : ''}
        aria-label="Dark theme"
      >
        <Moon size={20} />
      </button>
      <button
        onClick={() => changeTheme('system')}
        className={theme === 'system' ? 'active' : ''}
        aria-label="System theme"
      >
        <Monitor size={20} />
      </button>
    </div>
  );
};
```

#### 6. Theme Configuration in Settings Page

```tsx
// pages/SettingsPage.tsx - Add theme section
<div className="settings-section">
  <h2>Appearance</h2>
  <label>
    Theme:
    <RadioGroup value={theme} onChange={setTheme}>
      <Radio value="light">Light</Radio>
      <Radio value="dark">Dark</Radio>
      <Radio value="system">System Default</Radio>
    </RadioGroup>
  </label>
  <p className="help-text">
    Choose your preferred color theme. System Default follows your OS theme.
  </p>
</div>
```

---

## 📝 Order Creation – Supplier Input Behavior

### UI Behavior

1. **Free-Text Input with Auto-Complete**
   - Users type supplier names in a text input field.
   - Suggestions appear as a dropdown below the input (hints only).
   - Users can always type new names freely; suggestions never block input.

2. **Component Structure**
   ```
   Supplier Input Component:
   ┌─────────────────────────────┐
   │ [Type supplier name...]     │  ← Text input (always editable)
   │ ├─ Supplier ABC             │  ← Suggestions dropdown
   │ ├─ Supplier XYZ             │
   │ └─ Supplier 123             │
   └─────────────────────────────┘
   ```

3. **User Flow**
   ```
   User types "Sup" → 
   Suggestions show ["Supplier ABC", "Supplier XYZ"] → 
   User selects suggestion or presses Enter → 
   Supplier chip created with name → 
   On Save: backend matches or auto-creates supplier → 
   Order saved with supplier association.
   ```

### API Contract Updates
- `POST /api/v1/orders` supplier objects now include:
  - `name` (string, required) – always the typed text.
  - `supplierId` (string, optional) – present only when user chose an existing supplier.
- Backend behavior:
  1. If `supplierId` present → use existing supplier.
  2. Else → search by normalized name (trim + lowercase).
  3. If not found → create supplier automatically (name only, description optional later).
  4. Return newly created supplier so future hints include it.

### Implementation Steps
1. **Frontend**
   - Build `SupplierChipInput` component with auto-complete.
   - Fetch supplier suggestions from `/api/v1/suppliers?search=...`.
   - Store chips as `{ name: string; supplierId?: string }`.
   - Persist chips inside order form state.
2. **Backend**
   - Add helper `findOrCreateSupplierByName(name: string)` inside order service (transaction-safe).
   - Normalize names (trim + lowercase) to avoid duplicates.
   - Create supplier when not found.
   - Return supplier info in order response.
3. **Database**
   - Ensure supplier names are case-insensitively unique (e.g., LOWER(name) index) to prevent duplicates.
4. **Audit Trail**
   - Optionally log when supplier auto-created via order entry.
5. **Hints Only**
   - Suggestions must NEVER block typing new names (UI cannot force selection).

---

## 📝 Order Creation – Product Input Behavior

### UI Behavior

1. **Free-Text Input with Auto-Complete**
   - Users type product references in a text input field.
   - Suggestions appear as a dropdown below the input (hints only) filtered by the selected supplier.
   - Users can always type new product references freely; suggestions never block input.
   - Products are associated with suppliers (each supplier has its own product catalog).

2. **Component Structure**
   ```
   Product Reference Input Component:
   ┌─────────────────────────────┐
   │ [Type product ref...]       │  ← Text input (always editable)
   │ ├─ REF-12345                │  ← Suggestions dropdown (for this supplier)
   │ ├─ REF-67890                │
   │ └─ REF-11111                │
   └─────────────────────────────┘
   ```

3. **User Flow**
   ```
   User selects supplier "Supplier ABC" → 
   User types "REF" in product field → 
   Suggestions show ["REF-12345", "REF-67890"] for Supplier ABC → 
   User selects suggestion or types new "REF-99999" → 
   On Save: backend finds or auto-creates product for that supplier → 
   Order saved with product association.
   ```

### API Contract Updates
- `POST /api/v1/orders` product objects now include:
  - `productRef` (string, required) – always the typed text.
  - `productId` (string, optional) – present only when user chose an existing product.
  - `supplierId` (string, required) – the supplier this product belongs to.
- Backend behavior:
  1. For each product:
     - If `productId` present → use existing product.
     - Else → search by normalized reference (trim + lowercase) for that supplier.
     - If not found → create product automatically for that supplier.
     - Return newly created product so future hints include it.

### Implementation Steps
1. **Frontend**
   - Build `ProductReferenceInput` component with auto-complete.
   - Fetch product suggestions from `/api/v1/products?supplierId=xxx&search=...` when supplier is selected.
   - Store products as `{ productRef: string; productId?: string; supplierId: string }`.
   - Update suggestions when supplier changes.
2. **Backend**
   - Add helper `findOrCreateProductByReference(supplierId: string, reference: string)` inside order service (transaction-safe).
   - Normalize references (trim + lowercase) to avoid duplicates per supplier.
   - Create product when not found, associating it with the supplier.
   - Return product info in order response.
3. **Database**
   - Ensure product references are case-insensitively unique per supplier (e.g., UNIQUE(supplierId, LOWER(reference))).
4. **Audit Trail**
   - Optionally log when product auto-created via order entry.
5. **Hints Only**
   - Suggestions must NEVER block typing new references (UI cannot force selection).
   - Suggestions are filtered by the selected supplier.

---

## 🔒 Security Considerations

### 1. **CORS Configuration**
```typescript
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});
```

**Note**: For local network only, `*` is acceptable. For production, restrict to specific origins.

### 2. **Authentication Still Required**
- Users still authenticate with username/password
- JWT tokens for API requests
- Same security as centralized server

### 3. **Database File Permissions**
- Store database in user data directory (protected)
- Set appropriate file permissions
- Don't expose database file location in UI

---

## 📋 Deployment Checklist

### Server Computer Setup:
- [ ] Install application
- [ ] Select "Server Mode" on first launch
- [ ] Note the IP address shown
- [ ] Ensure firewall allows port 3000
- [ ] Verify server is running (check system tray or status)

### Client Computer Setup:
- [ ] Install application
- [ ] Select "Client Mode" on first launch
- [ ] Enter server IP address
- [ ] Test connection
- [ ] Save settings

---

## 🚀 Advantages of This Solution

| Feature | Benefit |
|---------|---------|
| **No Server Deployment** | Users don't need server setup knowledge |
| **Simple Installation** | One installer works for all users |
| **Local Network Speed** | Fast, low latency communication |
| **Data Control** | Database stays on user's network |
| **Easy Backup** | Just copy database file |
| **Cost Effective** | No hosting costs |
| **Flexible** | Any computer can be server |

---

## ⚠️ Important Considerations

### 1. Server Availability
- **Issue**: If server computer is turned off, clients can't connect
- **Solution**: 
  - Show clear status indicator in client apps
  - Auto-retry connection with backoff
  - Warn server user before closing app

### 2. IP Address Changes
- **Issue**: If server IP changes (DHCP), clients lose connection
- **Solution**:
  - Show current IP in server settings
  - Easy to update client settings
  - Consider static IP recommendation in docs

### 3. Firewall Configuration
- **Issue**: Firewall may block incoming connections
- **Solution**:
  - Auto-configure firewall rule (Windows)
  - Clear instructions for manual setup
  - Show warning if connection fails

### 4. Network Requirements
- **Issue**: Clients must be on same network as server
- **Solution**:
  - Clear documentation
  - Connection test verifies network access
  - Error messages explain network requirements

---

## 📝 Updated Project Structure

```
OrderApp/
├── electron/
│   ├── main.ts              # Electron main process
│   ├── server-manager.ts    # Express server management
│   ├── config-manager.ts    # Configuration management
│   └── ipc-handlers.ts      # IPC communication
│
├── server/                  # Server code (runs in Electron)
│   ├── src/
│   │   ├── api/            # Express routes
│   │   ├── controllers/
│   │   ├── services/
│   │   └── database/       # Prisma setup
│   └── prisma/
│       └── schema.prisma   # SQLite schema
│
├── client/                  # React UI (same for server/client)
│   └── src/
│       ├── pages/
│       │   └── SettingsPage.tsx
│       └── services/
│
└── shared/                  # Shared utilities
    └── utils/
```

---

## 🎯 Next Steps

1. ✅ **Update Prisma schema** to use SQLite
2. ✅ **Create server manager** for Express.js in Electron
3. ✅ **Create config manager** for settings storage
4. ✅ **Build settings page** with mode selection
5. ✅ **Update Electron main process** to handle both modes
6. ✅ **Test on multiple computers** on local network
7. ✅ **Document deployment** for end users

---

## 📚 Related Documentation

- **Full Details**: See [07_PEER_TO_PEER_ARCHITECTURE.md](./07_PEER_TO_PEER_ARCHITECTURE.md)
- **System Architecture**: See [02_SYSTEM_ARCHITECTURE.md](./02_SYSTEM_ARCHITECTURE.md)
- **API Design**: See [03_API_DESIGN.md](./03_API_DESIGN.md) (endpoints remain the same)

---

**Document Version**: 1.0  
**Last Updated**: November 2025  
**Status**: Ready for Implementation
