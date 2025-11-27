// All imports - environment variables are already loaded in electron-main.js
import { app, BrowserWindow, ipcMain, shell, dialog, protocol } from 'electron';
import path from 'path';
import fs from 'fs';

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// Register custom protocol for serving static files in production
// This must be called before app.whenReady()
if (!isDev) {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: 'app',
      privileges: {
        secure: true,
        standard: true,
        corsEnabled: true,
        supportFetchAPI: true,
      },
    },
  ]);
}

// App Configuration Interface
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

// Resolve backend path - works in both dev and production
function getBackendDistPath() {
  if (app.isPackaged) {
    // In production (packaged app), files are in app.asar or app directory
    // __dirname will be in resources/app/electron/dist or similar
    // Backend is at resources/app/backend/dist
    return path.join(app.getAppPath(), 'backend', 'dist');
  } else {
    // In development, backend is relative to electron directory
    return path.join(__dirname, '..', 'backend', 'dist');
  }
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

// Load backend modules at runtime with correct path resolution
let createServer: any;
let env: any;

function loadConfigFromFile(): AppConfig {
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
}

function setupDatabaseFromConfig(config: AppConfig): void {
  const dbConfig = config.database;
  
  // Ensure user data directory exists
  const userDataPath = app.getPath('userData');
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }
  
  if (dbConfig.type === 'sqlite') {
    // For SQLite, use path or construct from URL
    let dbPath: string;
    
    if (dbConfig.path) {
      // Path is specified directly
      dbPath = dbConfig.path;
      // If relative path, resolve relative to userDataPath
      if (!path.isAbsolute(dbPath)) {
        dbPath = path.resolve(userDataPath, dbPath);
      }
    } else if (dbConfig.url) {
      // Extract path from URL (file:...)
      const urlMatch = dbConfig.url.match(/^file:(.+)$/);
      if (urlMatch) {
        dbPath = urlMatch[1];
        // Resolve relative paths
        if (!path.isAbsolute(dbPath)) {
          dbPath = path.resolve(process.cwd(), dbPath);
        }
      } else {
        // Fallback to default
        dbPath = path.join(userDataPath, 'database.db');
      }
    } else {
      // Default path
      dbPath = path.join(userDataPath, 'database.db');
    }
    
    // Ensure directory exists
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    
    // Set environment variables
    process.env.DATABASE_URL = `file:${dbPath}`;
    process.env.DATABASE_PROVIDER = 'sqlite';
    
    console.log('📁 Database configured (SQLite):', dbPath);
  } else if (dbConfig.type === 'mysql' || dbConfig.type === 'postgresql') {
    // For MySQL/PostgreSQL, use the URL directly
    if (dbConfig.url) {
      process.env.DATABASE_URL = dbConfig.url;
      process.env.DATABASE_PROVIDER = dbConfig.type;
      console.log(`📁 Database configured (${dbConfig.type}):`, dbConfig.url.replace(/:[^:@]+@/, ':****@')); // Hide password
    } else {
      // Construct URL from individual components
      const host = dbConfig.host || 'localhost';
      const port = dbConfig.port || (dbConfig.type === 'mysql' ? 3306 : 5432);
      const database = dbConfig.database || 'order_db';
      const username = dbConfig.username || 'root';
      const password = dbConfig.password || '';
      
      if (dbConfig.type === 'mysql') {
        process.env.DATABASE_URL = `mysql://${username}:${password}@${host}:${port}/${database}`;
      } else {
        process.env.DATABASE_URL = `postgresql://${username}:${password}@${host}:${port}/${database}?schema=public`;
      }
      process.env.DATABASE_PROVIDER = dbConfig.type;
      console.log(`📁 Database configured (${dbConfig.type}):`, `${username}@${host}:${port}/${database}`);
    }
  }
}

function loadBackendModules(): boolean {
  const backendDistPath = getBackendDistPath();
  console.log('Loading backend from:', backendDistPath);
  
  try {
    // Load config from file and set up database
    const config = loadConfigFromFile();
    setupDatabaseFromConfig(config);
    
    const serverPath = path.join(backendDistPath, 'server');
    const envPath = path.join(backendDistPath, 'config', 'env');
    
    // Check if files exist before requiring
    if (!fs.existsSync(serverPath + '.js')) {
      throw new Error(`Server file not found at: ${serverPath}.js`);
    }
    if (!fs.existsSync(envPath + '.js')) {
      throw new Error(`Env file not found at: ${envPath}.js`);
    }
    
    const serverModule = require(serverPath);
    const envModule = require(envPath);
    
    createServer = serverModule.createServer;
    env = envModule.env;
    
    console.log('✅ Backend modules loaded successfully');
    return true;
  } catch (error: any) {
    console.error('❌ Failed to load backend modules:', error);
    console.error('Backend path:', backendDistPath);
    console.error('Error details:', error.message);
    console.error('Stack:', error.stack);
    // Don't throw, just return false so window can still show
    return false;
  }
}

let mainWindow: BrowserWindow | null = null;
let server: any = null;

function showErrorToUser(message: string) {
  if (mainWindow) {
    // Wait for window to be ready
    mainWindow.webContents.once('did-finish-load', () => {
      mainWindow?.webContents.executeJavaScript(`
        document.body.innerHTML = '<div style="padding: 20px; font-family: Arial; text-align: center;">
          <h1 style="color: red;">Error Starting Application</h1>
          <p>${message}</p>
          <p>Please check the console logs for more details.</p>
        </div>';
      `).catch(err => console.error('Failed to show error:', err));
    });
  }
}

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
    // In production, use app:// protocol for proper path resolution
    if (app.isPackaged) {
      // Use custom protocol which handles relative paths correctly
      mainWindow.loadURL('app://./index.html');
    } else {
      // In development build, use file:// protocol
      const indexPath = path.join(__dirname, '../frontend/dist/index.html');
      console.log('Loading frontend from:', indexPath);
      mainWindow.loadFile(indexPath).catch((error) => {
        console.error('Failed to load index.html:', error);
        mainWindow?.webContents.loadURL('data:text/html,<h1>Failed to load application</h1><p>Error: ' + error.message + '</p>');
      });
    }
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });
  
  // Fallback: Show window after a timeout even if ready-to-show doesn't fire
  setTimeout(() => {
    if (mainWindow && !mainWindow.isVisible()) {
      console.log('Window not visible after timeout, forcing show...');
      mainWindow.show();
      mainWindow.focus();
    }
  }, 3000);
  
  // Handle window errors
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('Failed to load:', validatedURL, errorCode, errorDescription);
    if (mainWindow && !mainWindow.isVisible()) {
      mainWindow.show();
    }
  });
  
  // Handle renderer process crashes
  mainWindow.webContents.on('crashed', () => {
    console.error('Renderer process crashed');
    if (mainWindow && !mainWindow.isVisible()) {
      mainWindow.show();
    }
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
    const result = await createServer(port);
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

// Register protocol handler for serving static files
function registerProtocolHandler() {
  if (isDev) return; // Not needed in dev mode
  
  protocol.registerFileProtocol('app', (request, callback) => {
    let url = request.url.substr(6); // Remove 'app://' prefix
    
    // Remove query strings and hash
    url = url.split('?')[0].split('#')[0];
    
    // Get the frontend dist directory
    const frontendDistPath = app.isPackaged
      ? path.join(app.getAppPath(), 'frontend', 'dist')
      : path.join(__dirname, '../frontend/dist');
    
    // Handle root or index.html
    if (url === '' || url === '/' || url === '/index.html') {
      url = 'index.html';
    }
    
    // Remove leading slash if present
    if (url.startsWith('/')) {
      url = url.substring(1);
    }
    
    const filePath = path.join(frontendDistPath, url);
    
    console.log('Protocol handler:', request.url, '->', filePath);
    callback({ path: filePath });
  });
}

app.whenReady().then(async () => {
  // Register protocol handler first (after app is ready)
  registerProtocolHandler();
  
  // Set app user model ID for Windows (helps with taskbar icon)
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.orderwhatsapp.desktop');
  }
  
  // Create window first so user can see something immediately
  createWindow();
  
  // Load backend modules before starting server
  const backendLoaded = loadBackendModules();
  
  if (backendLoaded && env) {
    try {
      // Start Express server
      await startServer();
    } catch (error: any) {
      console.error('Failed to start server:', error);
      // Show error to user but keep window visible
      showErrorToUser(`Failed to start server: ${error.message}`);
    }
  } else {
    // Backend modules failed to load - show error but keep window visible
    const errorMsg = 'Failed to load backend modules. Please check console logs.';
    console.error(errorMsg);
    showErrorToUser(errorMsg);
  }
  
  // Ensure window is visible after a short delay (allows time for content to load)
  setTimeout(() => {
    if (mainWindow && !mainWindow.isVisible()) {
      console.log('Forcing window to show...');
      mainWindow.show();
      mainWindow.focus();
    }
  }, 1000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      // Show existing window if it exists but is hidden
      mainWindow?.show();
      mainWindow?.focus();
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

// Open external URL (for WhatsApp, phone calls, etc.)
ipcMain.handle('open-external', async (_event, url: string) => {
  try {
    await shell.openExternal(url);
    return { success: true };
  } catch (error: any) {
    console.error('Failed to open external URL:', error);
    throw new Error(`Failed to open URL: ${error.message}`);
  }
});

// App Configuration IPC Handlers
// (getConfigPath and getDefaultConfig are defined above)

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

// File dialog IPC handlers for backup/restore
ipcMain.handle('dialog:showSaveDialog', async (_event, options: Electron.SaveDialogOptions) => {
  if (!mainWindow) {
    throw new Error('Main window not available');
  }
  
  // Ensure window is focused and visible before showing dialog
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  mainWindow.focus();
  mainWindow.show();
  
  const result = await dialog.showSaveDialog(mainWindow, options);
  return result;
});

ipcMain.handle('dialog:showOpenDialog', async (_event, options: Electron.OpenDialogOptions) => {
  if (!mainWindow) {
    throw new Error('Main window not available');
  }
  
  // Ensure window is focused and visible before showing dialog
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  mainWindow.focus();
  mainWindow.show();
  
  const result = await dialog.showOpenDialog(mainWindow, options);
  return result;
});

