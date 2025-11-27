import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object

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

contextBridge.exposeInMainWorld('electron', {
  getVersion: () => ipcRenderer.invoke('get-app-version'),
  config: {
    get: (): Promise<AppConfig> => ipcRenderer.invoke('config:get'),
    save: (config: Partial<AppConfig>): Promise<void> => ipcRenderer.invoke('config:save', config),
  },
  openExternal: (url: string): Promise<{ success: boolean }> => ipcRenderer.invoke('open-external', url),
  dialog: {
    showSaveDialog: (options: Electron.SaveDialogOptions): Promise<Electron.SaveDialogReturnValue> => 
      ipcRenderer.invoke('dialog:showSaveDialog', options),
    showOpenDialog: (options: Electron.OpenDialogOptions): Promise<Electron.OpenDialogReturnValue> => 
      ipcRenderer.invoke('dialog:showOpenDialog', options),
    showErrorDialog: (options: { title: string; message: string; detail?: string }): Promise<Electron.MessageBoxReturnValue> =>
      ipcRenderer.invoke('dialog:showErrorDialog', options),
    showWarningDialog: (options: { title: string; message: string; detail?: string }): Promise<Electron.MessageBoxReturnValue> =>
      ipcRenderer.invoke('dialog:showWarningDialog', options),
  },
});

// Type definitions for TypeScript
declare global {
  interface Window {
    electron: {
      getVersion: () => Promise<string>;
      config: {
        get: () => Promise<AppConfig>;
        save: (config: Partial<AppConfig>) => Promise<void>;
      };
      openExternal: (url: string) => Promise<{ success: boolean }>;
      dialog: {
        showSaveDialog: (options: Electron.SaveDialogOptions) => Promise<Electron.SaveDialogReturnValue>;
        showOpenDialog: (options: Electron.OpenDialogOptions) => Promise<Electron.OpenDialogReturnValue>;
        showErrorDialog: (options: { title: string; message: string; detail?: string }) => Promise<Electron.MessageBoxReturnValue>;
        showWarningDialog: (options: { title: string; message: string; detail?: string }) => Promise<Electron.MessageBoxReturnValue>;
      };
    };
  }
}

