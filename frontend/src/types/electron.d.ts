/**
 * Electron API Type Definitions
 * These types match the API exposed in electron/preload.ts
 */

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

declare global {
  interface Window {
    electron: {
      getVersion: () => Promise<string>;
      config: {
        get: () => Promise<AppConfig>;
        save: (config: Partial<AppConfig>) => Promise<void>;
      };
    };
  }
}

export {};

