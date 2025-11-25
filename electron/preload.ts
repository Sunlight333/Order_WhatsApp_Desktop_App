import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  getVersion: () => ipcRenderer.invoke('get-app-version'),
});

// Type definitions for TypeScript
declare global {
  interface Window {
    electron: {
      getVersion: () => Promise<string>;
    };
  }
}

