import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { createServer } from '../backend/src/server';
import { env } from '../backend/src/config/env';

let mainWindow: BrowserWindow | null = null;
let server: any = null;

const isDev = process.env.NODE_ENV === 'development';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
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

async function startServer() {
  try {
    const port = env.port;
    const result = createServer(port);
    server = result.server;
    console.log(`✅ Server started on port ${port}`);
  } catch (error) {
    console.error('❌ Failed to start server:', error);
  }
}

app.whenReady().then(async () => {
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

