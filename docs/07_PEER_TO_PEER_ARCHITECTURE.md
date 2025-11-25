# Peer-to-Peer Desktop Architecture
## Distributed Server-Client Model

### Version: 1.0

---

## 1. Architecture Overview

### 1.1 Concept
Instead of a centralized server, **one desktop application acts as the server**, and other desktop applications connect to it as clients. This eliminates the need for a separate server deployment.

```
┌─────────────────────────────────────────┐
│  Desktop App #1 (SERVER MODE)          │
│  ┌───────────────────────────────────┐  │
│  │  Electron Main Process            │  │
│  │  ├─ Express.js Server             │  │
│  │  ├─ SQLite Database               │  │
│  │  └─ React UI (Server Dashboard)   │  │
│  └───────────────────────────────────┘  │
│  Running on: 192.168.1.100:3000        │
└─────────────────────────────────────────┘
              ▲
              │ HTTP Connection
              │
┌─────────────┴───────────────────────────┐
│  Desktop App #2 (CLIENT MODE)          │
│  ┌───────────────────────────────────┐  │
│  │  Electron Main Process            │  │
│  │  └─ React UI (Client)             │  │
│  └───────────────────────────────────┘  │
│  Configured: Server IP: 192.168.1.100  │
└─────────────────────────────────────────┘
              ▲
              │ HTTP Connection
              │
┌─────────────┴───────────────────────────┐
│  Desktop App #3 (CLIENT MODE)          │
│  ┌───────────────────────────────────┐  │
│  │  Electron Main Process            │  │
│  │  └─ React UI (Client)             │  │
│  └───────────────────────────────────┘  │
│  Configured: Server IP: 192.168.1.100  │
└─────────────────────────────────────────┘
```

---

## 2. Key Design Decisions

### 2.1 Database Solution: Multi-Database Support

**Default: SQLite** (Recommended for desktop apps)
- ✅ File-based database (no separate server needed)
- ✅ Single file contains entire database
- ✅ Works perfectly for desktop applications
- ✅ Supports concurrent reads/writes (with proper configuration)
- ✅ Prisma has excellent SQLite support
- ✅ Easy to backup (just copy the file)
- ✅ Zero configuration required

**Optional: MySQL / PostgreSQL** (For advanced users)
- ✅ Better for high-volume scenarios
- ✅ Advanced features and scalability
- ✅ Requires separate database server installation
- ✅ Network database connection required
- ✅ More complex setup and configuration

**Database Configuration:**
- User can select database type in settings
- Default: SQLite (works out of the box)
- Advanced: MySQL or PostgreSQL (requires connection string)

**SQLite Database File Location (Default):**
```
Windows: C:\Users\{username}\AppData\Roaming\OrderApp\database.db
macOS:   ~/Library/Application Support/OrderApp/database.db
Linux:   ~/.config/OrderApp/database.db
```

### 2.2 Server Mode vs Client Mode

**Server Mode:**
- Runs Express.js server on a configurable port (default: 3000)
- Hosts the SQLite database file
- Can also have UI for server management
- Other clients connect to this instance

**Client Mode:**
- Connects to configured server IP address
- Only has UI (React frontend)
- Makes API calls to the server instance
- Cannot function without server connection

### 2.3 Application Mode Configuration

Each desktop app can operate in two modes:
1. **Server Mode**: Runs the backend + database
2. **Client Mode**: Only UI, connects to server

**Mode Selection:**
- Auto-detect on first launch (prompt user)
- Manual selection in settings
- Settings stored in local config file

---

## 3. Implementation Architecture

### 3.1 Project Structure (Updated)

```
Order_WhatsApp_Desktop_App/
├── shared/                    # Shared code between server/client
│   ├── types/                # TypeScript types
│   ├── constants/            # Shared constants
│   └── utils/                # Shared utilities
│
├── server/                    # Server-side code
│   ├── src/
│   │   ├── api/              # Express.js API routes
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── middleware/
│   │   ├── database/         # Prisma client setup
│   │   └── server.ts         # Express server setup
│   ├── prisma/
│   │   └── schema.prisma     # SQLite schema
│   └── package.json
│
├── client/                    # Client-side UI code
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/         # API client
│   │   ├── store/            # State management
│   │   └── App.tsx
│   └── package.json
│
├── electron/                  # Electron main process
│   ├── main.ts               # Main Electron process
│   ├── server-manager.ts     # Server lifecycle management
│   ├── config-manager.ts     # Configuration management
│   └── ipc-handlers.ts       # IPC communication
│
├── app/                      # Electron app (packaged)
│   └── (packaged application)
│
└── package.json              # Root package.json
```

### 3.2 Electron Main Process Architecture

```typescript
// electron/main.ts
import { app, BrowserWindow, ipcMain } from 'electron';
import { ServerManager } from './server-manager';
import { ConfigManager } from './config-manager';
import path from 'path';

class Application {
  private mainWindow: BrowserWindow | null = null;
  private serverManager: ServerManager;
  private configManager: ConfigManager;
  private isServerMode: boolean = false;

  constructor() {
    this.configManager = new ConfigManager();
    this.serverManager = new ServerManager();
  }

  async initialize() {
    // Check if app should run as server or client
    const config = await this.configManager.load();
    
    if (config.mode === 'server' || !config.serverAddress) {
      // Start in server mode
      await this.startServerMode();
    } else {
      // Start in client mode
      await this.startClientMode(config.serverAddress);
    }
    
    this.createWindow();
  }

  async startServerMode() {
    this.isServerMode = true;
    
    // Get server port from config (default: 3000)
    const port = this.configManager.getServerPort();
    
    // Start Express.js server
    await this.serverManager.startServer(port);
    
    console.log(`Server started on port ${port}`);
  }

  async startClientMode(serverAddress: string) {
    this.isServerMode = false;
    // Client mode - no server needed
    // Just make sure serverAddress is accessible
    await this.validateServerConnection(serverAddress);
  }

  createWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
      },
    });

    // Load app based on mode
    if (this.isServerMode) {
      this.mainWindow.loadURL('http://localhost:3000');
    } else {
      const serverAddress = this.configManager.getServerAddress();
      this.mainWindow.loadURL(`http://${serverAddress}:3000`);
    }
  }
}

// Initialize app
const application = new Application();
app.whenReady().then(() => application.initialize());
```

---

## 4. Configuration Management

### 4.1 Configuration File Structure

```typescript
// electron/config-manager.ts
import { app } from 'electron';
import fs from 'fs';
import path from 'path';

interface AppConfig {
  mode: 'server' | 'client';
  serverAddress?: string;      // IP address (e.g., "192.168.1.100")
  serverPort?: number;         // Port (default: 3000)
  database: {
    type: 'sqlite' | 'mysql' | 'postgresql';  // Database type
    // For SQLite
    path?: string;             // Path to SQLite database file
    // For MySQL/PostgreSQL
    host?: string;             // Database host
    port?: number;             // Database port
    username?: string;         // Database username
    password?: string;         // Database password (encrypted)
    database?: string;         // Database name
    connectionString?: string; // Full connection string (alternative)
  };
}

export class ConfigManager {
  private configPath: string;
  private config: AppConfig;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.configPath = path.join(userDataPath, 'config.json');
    this.config = this.loadDefaultConfig();
  }

  private loadDefaultConfig(): AppConfig {
    return {
      mode: 'server',
      serverPort: 3000,
      database: {
        type: 'sqlite',
        path: this.getDefaultDatabasePath(),
      },
    };
  }

  private getDefaultDatabasePath(): string {
    const userDataPath = app.getPath('userData');
    return path.join(userDataPath, 'database.db');
  }

  async load(): Promise<AppConfig> {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf-8');
        this.config = { ...this.loadDefaultConfig(), ...JSON.parse(data) };
      }
      return this.config;
    } catch (error) {
      console.error('Error loading config:', error);
      return this.loadDefaultConfig();
    }
  }

  async save(config: Partial<AppConfig>): Promise<void> {
    try {
      this.config = { ...this.config, ...config };
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
    } catch (error) {
      console.error('Error saving config:', error);
      throw error;
    }
  }

  getServerAddress(): string | undefined {
    return this.config.serverAddress;
  }

  getServerPort(): number {
    return this.config.serverPort || 3000;
  }

  getDatabaseConfig() {
    return this.config.database || { type: 'sqlite', path: this.getDefaultDatabasePath() };
  }

  getDatabasePath(): string {
    const dbConfig = this.getDatabaseConfig();
    return dbConfig.path || this.getDefaultDatabasePath();
  }

  getDatabaseConnectionString(): string {
    const dbConfig = this.getDatabaseConfig();
    
    switch (dbConfig.type) {
      case 'sqlite':
        return `file:${dbConfig.path || this.getDefaultDatabasePath()}`;
      case 'mysql':
        return `mysql://${dbConfig.username}:${dbConfig.password}@${dbConfig.host}:${dbConfig.port || 3306}/${dbConfig.database}`;
      case 'postgresql':
        return `postgresql://${dbConfig.username}:${dbConfig.password}@${dbConfig.host}:${dbConfig.port || 5432}/${dbConfig.database}`;
      default:
        throw new Error(`Unsupported database type: ${dbConfig.type}`);
    }
  }
}
```

### 4.2 Settings Page UI

```typescript
// client/src/pages/SettingsPage.tsx
import React, { useState, useEffect } from 'react';
import { ConfigService } from '../services/config.service';

export const SettingsPage: React.FC = () => {
  const [mode, setMode] = useState<'server' | 'client'>('server');
  const [serverAddress, setServerAddress] = useState('');
  const [serverPort, setServerPort] = useState(3000);
  const [localIP, setLocalIP] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');

  useEffect(() => {
    loadConfiguration();
    detectLocalIP();
    checkConnection();
  }, []);

  const loadConfiguration = async () => {
    const config = await ConfigService.getConfig();
    setMode(config.mode);
    setServerAddress(config.serverAddress || '');
    setServerPort(config.serverPort || 3000);
  };

  const detectLocalIP = async () => {
    const ip = await ConfigService.getLocalIP();
    setLocalIP(ip);
  };

  const checkConnection = async () => {
    if (mode === 'client' && serverAddress) {
      const isConnected = await ConfigService.testConnection(serverAddress, serverPort);
      setConnectionStatus(isConnected ? 'connected' : 'disconnected');
    }
  };

  const handleSave = async () => {
    try {
      await ConfigService.updateConfig({
        mode,
        serverAddress: mode === 'client' ? serverAddress : undefined,
        serverPort,
      });
      
      // Show success message
      alert('Settings saved! Application will restart.');
      
      // Restart application
      window.electron.restartApp();
    } catch (error) {
      alert('Error saving settings: ' + error);
    }
  };

  return (
    <div className="settings-page">
      <h1>Application Settings</h1>
      
      <div className="settings-section">
        <h2>Application Mode</h2>
        <div className="radio-group">
          <label>
            <input
              type="radio"
              value="server"
              checked={mode === 'server'}
              onChange={(e) => setMode(e.target.value as 'server')}
            />
            Server Mode (This computer hosts the database)
          </label>
          <label>
            <input
              type="radio"
              value="client"
              checked={mode === 'client'}
              onChange={(e) => setMode(e.target.value as 'client')}
            />
            Client Mode (Connect to another computer)
          </label>
        </div>
      </div>

      {mode === 'server' && (
        <>
          <div className="settings-section">
            <h2>Server Configuration</h2>
            <div className="info-box">
              <p><strong>Local IP Address:</strong> {localIP}</p>
              <p><strong>Port:</strong> {serverPort}</p>
              <p className="help-text">
                Share this IP address with other users: <code>{localIP}:{serverPort}</code>
              </p>
            </div>
            <label>
              Server Port:
              <input
                type="number"
                value={serverPort}
                onChange={(e) => setServerPort(parseInt(e.target.value))}
                min="1024"
                max="65535"
              />
            </label>
          </div>

          <div className="settings-section">
            <h2>Database Configuration</h2>
            <label>
              Database Type:
              <select
                value={databaseType}
                onChange={(e) => setDatabaseType(e.target.value as 'sqlite' | 'mysql' | 'postgresql')}
              >
                <option value="sqlite">SQLite (Default - Recommended)</option>
                <option value="mysql">MySQL</option>
                <option value="postgresql">PostgreSQL</option>
              </select>
            </label>

            {databaseType === 'sqlite' && (
              <div>
                <label>
                  Database File Path:
                  <input
                    type="text"
                    value={databasePath}
                    onChange={(e) => setDatabasePath(e.target.value)}
                    placeholder="Auto (Recommended)"
                  />
                </label>
                <p className="help-text">
                  Leave empty to use default location. File will be created automatically.
                </p>
              </div>
            )}

            {(databaseType === 'mysql' || databaseType === 'postgresql') && (
              <div>
                <label>
                  Host:
                  <input
                    type="text"
                    value={dbHost}
                    onChange={(e) => setDbHost(e.target.value)}
                    placeholder={databaseType === 'mysql' ? 'localhost' : 'localhost'}
                  />
                </label>
                <label>
                  Port:
                  <input
                    type="number"
                    value={dbPort}
                    onChange={(e) => setDbPort(parseInt(e.target.value))}
                    placeholder={databaseType === 'mysql' ? '3306' : '5432'}
                  />
                </label>
                <label>
                  Database Name:
                  <input
                    type="text"
                    value={dbName}
                    onChange={(e) => setDbName(e.target.value)}
                    placeholder="order_db"
                  />
                </label>
                <label>
                  Username:
                  <input
                    type="text"
                    value={dbUsername}
                    onChange={(e) => setDbUsername(e.target.value)}
                    placeholder="root"
                  />
                </label>
                <label>
                  Password:
                  <input
                    type="password"
                    value={dbPassword}
                    onChange={(e) => setDbPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </label>
                <button onClick={testDatabaseConnection}>Test Database Connection</button>
                {dbConnectionStatus && (
                  <span className={dbConnectionStatus === 'connected' ? 'success' : 'error'}>
                    {dbConnectionStatus === 'connected' ? '✓ Connected' : '✗ Connection failed'}
                  </span>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {mode === 'client' && (
        <div className="settings-section">
          <h2>Client Configuration</h2>
          <label>
            Server IP Address:
            <input
              type="text"
              value={serverAddress}
              onChange={(e) => setServerAddress(e.target.value)}
              placeholder="192.168.1.100"
              onBlur={checkConnection}
            />
          </label>
          <label>
            Server Port:
            <input
              type="number"
              value={serverPort}
              onChange={(e) => setServerPort(parseInt(e.target.value))}
              min="1024"
              max="65535"
            />
          </label>
          <div className="connection-status">
            {connectionStatus === 'checking' && <span>Checking connection...</span>}
            {connectionStatus === 'connected' && <span className="success">✓ Connected</span>}
            {connectionStatus === 'disconnected' && (
              <span className="error">✗ Cannot connect to server</span>
            )}
          </div>
          <button onClick={checkConnection}>Test Connection</button>
        </div>
      )}

      <div className="settings-actions">
        <button onClick={handleSave} className="btn-primary">
          Save Settings & Restart
        </button>
      </div>
    </div>
  );
};
```

---

## 5. Server Manager Implementation

### 5.1 Server Lifecycle Management

```typescript
// electron/server-manager.ts
import express from 'express';
import { Server } from 'http';
import { ConfigManager } from './config-manager';

export class ServerManager {
  private server: Server | null = null;
  private app: express.Application;
  private configManager: ConfigManager;
  private isRunning: boolean = false;

  constructor() {
    this.configManager = new ConfigManager();
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  async startServer(port: number): Promise<void> {
    if (this.isRunning) {
      throw new Error('Server is already running');
    }

    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(port, '0.0.0.0', () => {
          // Listen on all network interfaces
          this.isRunning = true;
          console.log(`Server started on port ${port}`);
          resolve();
        });

        this.server.on('error', (error: NodeJS.ErrnoException) => {
          if (error.code === 'EADDRINUSE') {
            reject(new Error(`Port ${port} is already in use`));
          } else {
            reject(error);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async stopServer(): Promise<void> {
    if (!this.server || !this.isRunning) {
      return;
    }

    return new Promise((resolve) => {
      this.server!.close(() => {
        this.isRunning = false;
        this.server = null;
        console.log('Server stopped');
        resolve();
      });
    });
  }

  private setupMiddleware() {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    
    // CORS for client connections
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      next();
    });

    // Authentication middleware
    // ... (your auth middleware)
  }

  private setupRoutes() {
    // API routes
    this.app.use('/api/v1/auth', authRoutes);
    this.app.use('/api/v1/orders', orderRoutes);
    this.app.use('/api/v1/suppliers', supplierRoutes);
    // ... other routes

    // Serve React app (for server mode)
    // In production, serve built React app
    // In development, proxy to React dev server
  }

  getServerAddress(): string {
    // Get local IP address
    const interfaces = require('os').networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
    return 'localhost';
  }
}
```

---

## 6. Prisma Configuration for Multiple Databases

### 6.1 Prisma Schema with Multi-Database Support

**Strategy**: Use environment variable for database provider, generate schema dynamically based on config.

```prisma
// server/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

// Database provider determined by DATABASE_PROVIDER env var
// Options: sqlite, mysql, postgresql
datasource db {
  provider = env("DATABASE_PROVIDER")
  url      = env("DATABASE_URL")
}

// Schema works for all three databases
// Prisma handles differences automatically

model User {
  id        String   @id @default(uuid())  // Works on all DBs
  username  String   @unique
  password  String
  role      UserRole @default(USER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // ... relations
}

enum UserRole {
  SUPER_ADMIN
  USER
}

// Note: For SQLite compatibility:
// - UUIDs stored as strings (works on all DBs)
// - Enums work on MySQL/PostgreSQL, stored as strings in SQLite
// - Prisma handles type conversion automatically
```

### 6.2 Dynamic Prisma Client Initialization

```typescript
// server/src/database/prisma.ts
import { PrismaClient } from '@prisma/client';
import { ConfigManager } from '../../../electron/config-manager';

let prisma: PrismaClient;

export function getPrismaClient(configManager: ConfigManager): PrismaClient {
  if (!prisma) {
    const dbConfig = configManager.getDatabaseConfig();
    const connectionString = configManager.getDatabaseConnectionString();
    
    // Set environment variables for Prisma
    process.env.DATABASE_PROVIDER = dbConfig.type;
    process.env.DATABASE_URL = connectionString;
    
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: connectionString,
        },
      },
      log: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
    });

    // SQLite-specific optimizations (only if using SQLite)
    if (dbConfig.type === 'sqlite') {
      prisma.$executeRaw`PRAGMA journal_mode = WAL;`;
      prisma.$executeRaw`PRAGMA synchronous = NORMAL;`;
      prisma.$executeRaw`PRAGMA foreign_keys = ON;`;
    }
  }

  return prisma;
}
```

### 6.3 Database Migration Strategy

**For SQLite (Default):**
```bash
# Generate migrations
npx prisma migrate dev --name init

# Migrations stored in prisma/migrations/
```

**For MySQL/PostgreSQL:**
```bash
# Set provider in .env first
DATABASE_PROVIDER=mysql
DATABASE_URL=mysql://user:pass@host:port/db

# Generate migrations
npx prisma migrate dev --name init
```

**Important Notes:**
- Different migration folders needed for different providers
- Or use separate Prisma schema files (schema.sqlite.prisma, schema.mysql.prisma)
- Or handle migrations programmatically based on provider

### 6.2 Database Connection Setup

```typescript
// server/src/database/prisma.ts
import { PrismaClient } from '@prisma/client';
import { ConfigManager } from '../../../electron/config-manager';

let prisma: PrismaClient;

export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    const databasePath = process.env.DATABASE_URL || getDatabasePath();
    
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: `file:${databasePath}`,
        },
      },
      log: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
    });

    // Enable SQLite WAL mode for better concurrency
    prisma.$executeRaw`PRAGMA journal_mode = WAL;`;
    prisma.$executeRaw`PRAGMA synchronous = NORMAL;`;
    prisma.$executeRaw`PRAGMA foreign_keys = ON;`;
  }

  return prisma;
}

function getDatabasePath(): string {
  // Get from config manager or use default
  // This runs in the Electron main process context
  return process.env.DATABASE_PATH || './database.db';
}
```

**Important SQLite Configuration:**
- **WAL Mode**: Enables better concurrent reads/writes
- **Foreign Keys**: Ensures referential integrity
- **Synchronous Mode**: Balance between safety and performance

---

## 7. Network Configuration

### 7.1 Getting Local IP Address

```typescript
// shared/utils/network.util.ts
import { networkInterfaces } from 'os';

export function getLocalIPAddress(): string {
  const interfaces = networkInterfaces();
  
  for (const interfaceName in interfaces) {
    const addresses = interfaces[interfaceName];
    if (!addresses) continue;
    
    for (const address of addresses) {
      // Skip internal (loopback) and non-IPv4 addresses
      if (address.family === 'IPv4' && !address.internal) {
        return address.address;
      }
    }
  }
  
  return '127.0.0.1';
}
```

### 7.2 Connection Testing

```typescript
// client/src/services/config.service.ts
export class ConfigService {
  static async testConnection(serverAddress: string, port: number): Promise<boolean> {
    try {
      const response = await fetch(`http://${serverAddress}:${port}/api/v1/health`, {
        method: 'GET',
        timeout: 5000, // 5 second timeout
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  static async getLocalIP(): Promise<string> {
    // Call Electron IPC to get local IP
    return window.electron.getLocalIP();
  }
}
```

---

## 8. First Launch Experience

### 8.1 Mode Selection Dialog

```typescript
// electron/main.ts - First launch logic

async function handleFirstLaunch() {
  const config = await configManager.load();
  
  if (!config.mode) {
    // First launch - show mode selection dialog
    const result = await dialog.showMessageBox({
      type: 'question',
      buttons: ['Server Mode', 'Client Mode'],
      defaultId: 0,
      title: 'Application Mode',
      message: 'How would you like to run this application?',
      detail: 'Server Mode: This computer will host the database.\n' +
              'Client Mode: Connect to another computer running as server.',
    });

    const mode = result.response === 0 ? 'server' : 'client';
    
    if (mode === 'client') {
      // Prompt for server address
      const { response, value } = await showServerAddressDialog();
      await configManager.save({
        mode: 'client',
        serverAddress: value,
      });
    } else {
      await configManager.save({ mode: 'server' });
    }
  }
}
```

---

## 9. Best Practices & Considerations

### 9.1 Server Availability

**Challenge**: What happens when server user closes their app?

**Solutions:**
1. **Warning Dialog**: Warn server user before closing
2. **Auto-reconnect**: Client apps automatically retry connection
3. **Status Indicator**: Show connection status in client apps
4. **Graceful Shutdown**: Server waits for active requests before closing

### 9.2 Firewall Configuration

**Automatic Firewall Rules (Windows):**
```typescript
// electron/firewall-manager.ts
import { exec } from 'child_process';

export async function configureFirewall(port: number): Promise<void> {
  if (process.platform === 'win32') {
    // Add Windows Firewall rule
    const command = `netsh advfirewall firewall add rule name="Order App Server" dir=in action=allow protocol=TCP localport=${port}`;
    exec(command, (error) => {
      if (error) {
        console.warn('Could not configure firewall automatically');
      }
    });
  }
}
```

### 9.3 Database Backup

**Automatic Backup Strategy:**
```typescript
// electron/backup-manager.ts
import fs from 'fs';
import path from 'path';

export class BackupManager {
  async createBackup(databasePath: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(
      path.dirname(databasePath),
      `backup-${timestamp}.db`
    );
    
    fs.copyFileSync(databasePath, backupPath);
    return backupPath;
  }

  // Schedule automatic backups (daily)
  scheduleBackups(databasePath: string, intervalHours: number = 24) {
    setInterval(() => {
      this.createBackup(databasePath);
      this.cleanOldBackups(path.dirname(databasePath));
    }, intervalHours * 60 * 60 * 1000);
  }
}
```

### 9.4 Port Conflict Handling

```typescript
// If port is in use, try next available port
async function findAvailablePort(startPort: number): Promise<number> {
  const net = require('net');
  
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    
    server.listen(startPort, () => {
      const port = (server.address() as any).port;
      server.close(() => resolve(port));
    });
    
    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        // Try next port
        findAvailablePort(startPort + 1).then(resolve);
      } else {
        reject(err);
      }
    });
  });
}
```

---

## 10. Deployment Considerations

### 10.1 Single Executable

Both server and client code packaged into **one executable**:
- User chooses mode on first launch
- Same installer for all users
- Smaller distribution size

### 10.2 Network Requirements

- **Same Local Network**: Server and clients must be on same LAN
- **Port Forwarding**: Not required (local network only)
- **Dynamic IP**: Handle IP changes gracefully
- **Network Discovery**: Optional enhancement (Bonjour/Zeroconf)

### 10.3 Installation Guide

Include in user documentation:
1. Install application on all computers
2. One computer runs as server (first launch selection)
3. Note the server computer's IP address
4. Configure client computers with server IP address
5. Ensure firewall allows connections on port 3000

---

## 11. Advantages of This Architecture

✅ **No Server Deployment**: No need to set up separate server  
✅ **Simple Setup**: Just install desktop app  
✅ **Local Network**: Fast, low latency  
✅ **Data Control**: Database stays on user's network  
✅ **Cost Effective**: No hosting costs  
✅ **Easy Backup**: Just copy database file  

---

## 12. Limitations & Mitigations

| Limitation | Mitigation |
|------------|------------|
| Server must be running | Warning dialogs, auto-reconnect |
| IP address changes | Show current IP in settings, easy to update |
| Firewall blocking | Auto-configure or clear instructions |
| Single point of failure | Regular backups, document backup process |
| Network issues | Clear error messages, retry logic |

---

## Document Control

**Version**: 1.0  
**Last Updated**: November 2025  
**Status**: Ready for Implementation

