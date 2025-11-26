// All imports - environment variables are already loaded in electron-main.js
import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import { createServer } from '../backend/src/server';
import { env } from '../backend/src/config/env';

let mainWindow: BrowserWindow | null = null;
let server: any = null;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function getPreloadPath() {
  // Electron requires a JavaScript file for preload
  // __dirname points to the electron/ directory
  const preloadPath = path.join(__dirname, 'preload.js');
  
  // Verify file exists
  const fs = require('fs');
  if (!fs.existsSync(preloadPath)) {
    console.error(`❌ Preload file not found at: ${preloadPath}`);
    console.error('Please ensure electron/preload.js exists');
  }
  
  return preloadPath;
}

function getIconPath() {
  if (isDev) {
    // In development, use the icon from frontend/public
    return path.join(__dirname, '../frontend/public/assets/images/logo.png');
  } else {
    // In production, icon should be in the resources folder
    return path.join(process.resourcesPath, 'assets/images/logo.png');
  }
}

function createWindow() {
  const iconPath = getIconPath();
  
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    icon: iconPath,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: getPreloadPath(),
      // Allow loading TypeScript files in development
      webSecurity: true,
    },
    autoHideMenuBar: !isDev,
    backgroundColor: '#ffffff',
    show: false,
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../frontend/dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

async function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const net = require('net');
    const tester = net.createServer()
      .once('error', () => resolve(false))
      .once('listening', () => {
        tester.once('close', () => resolve(true)).close();
      })
      .listen(port);
  });
}

async function startServer() {
  try {
    const port = env.port;
    
    // In development mode, check if server is already running
    // (started separately via npm run dev:backend)
    if (isDev) {
      const portAvailable = await isPortAvailable(port);
      if (!portAvailable) {
        console.log(`ℹ️  Server already running on port ${port} (started separately)`);
        console.log(`ℹ️  Electron will connect to existing server`);
        return; // Don't start another server
      }
    }
    
    // Start server if port is available or in production mode
    const result = createServer(port);
    server = result.server;
    console.log(`✅ Server started on port ${port}`);
  } catch (error: any) {
    // If error is EADDRINUSE, server is already running (development mode)
    if (error?.code === 'EADDRINUSE') {
      console.log(`ℹ️  Port ${env.port} is already in use`);
      console.log(`ℹ️  Electron will connect to existing server`);
      return;
    }
    console.error('❌ Failed to start server:', error);
  }
}

app.whenReady().then(async () => {
  // Set app user model ID for Windows (helps with taskbar icon)
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.orderwhatsapp.desktop');
  }
  
  // Start Express server
  await startServer();
  
  // Create window
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (server) {
    server.close();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handlers will be added here
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

// App Configuration IPC Handlers
interface AppConfig {
  mode: 'server' | 'client';
  serverAddress?: string;
  serverPort?: number;
  database: {
    type: 'sqlite' | 'mysql' | 'postgresql';
    path?: string;
    host?: string;
    port?: number;
    username?: string;
    password?: string;
    database?: string;
    url?: string;
  };
  theme?: 'light' | 'dark' | 'system';
}

function getConfigPath(): string {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'config.json');
}

function getDefaultConfig(): AppConfig {
  const userDataPath = app.getPath('userData');
  return {
    mode: 'server',
    serverPort: 3000,
    database: {
      type: 'sqlite',
      path: path.join(userDataPath, 'database.db'),
    },
    theme: 'system',
  };
}

// Get app configuration
ipcMain.handle('config:get', async (): Promise<AppConfig> => {
  try {
    const configPath = getConfigPath();
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf-8');
      const config = JSON.parse(data);
      // Merge with defaults to ensure all fields exist
      return { ...getDefaultConfig(), ...config };
    }
    return getDefaultConfig();
  } catch (error: any) {
    console.error('Error reading config:', error);
    return getDefaultConfig();
  }
});

// Save app configuration
ipcMain.handle('config:save', async (_event, config: Partial<AppConfig>): Promise<void> => {
  try {
    const configPath = getConfigPath();
    const currentConfig = await (async () => {
      try {
        if (fs.existsSync(configPath)) {
          const data = fs.readFileSync(configPath, 'utf-8');
          return { ...getDefaultConfig(), ...JSON.parse(data) };
        }
      } catch (error) {
        console.error('Error reading existing config:', error);
      }
      return getDefaultConfig();
    })();

    const newConfig: AppConfig = { ...currentConfig, ...config };
    
    // Ensure directory exists
    const configDir = path.dirname(configPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    // Write config file
    fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2), 'utf-8');
    console.log('Config saved successfully');
  } catch (error: any) {
    console.error('Error saving config:', error);
    throw new Error(`Failed to save config: ${error.message}`);
  }
});

