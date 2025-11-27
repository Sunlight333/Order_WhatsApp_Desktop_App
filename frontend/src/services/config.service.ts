/**
 * App Configuration Service
 * Manages application-level settings (server IP, port, database, etc.)
 * These settings are stored in a JSON file via Electron IPC
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

class ConfigService {
  private config: AppConfig | null = null;
  private listeners: Set<() => void> = new Set();

  /**
   * Load configuration from Electron
   */
  async loadConfig(): Promise<AppConfig> {
    try {
      let loadedConfig: any;
      
      if (window.electron?.config) {
        loadedConfig = await window.electron.config.get();
      } else {
        // Fallback to localStorage if Electron is not available (web mode)
        const stored = localStorage.getItem('app_config');
        if (stored) {
          loadedConfig = JSON.parse(stored);
        } else {
          return this.getDefaultConfig();
        }
      }

      // Normalize config: handle both "provider" and "type" for backward compatibility
      if (loadedConfig?.database) {
        if (loadedConfig.database.provider && !loadedConfig.database.type) {
          loadedConfig.database.type = loadedConfig.database.provider;
          delete loadedConfig.database.provider;
        }
      }

      this.config = loadedConfig as AppConfig;
      this.notifyListeners();
      return this.config;
    } catch (error) {
      console.error('Failed to load config:', error);
      return this.getDefaultConfig();
    }
  }

  /**
   * Save configuration via Electron
   */
  async saveConfig(config: Partial<AppConfig>): Promise<void> {
    try {
      if (window.electron?.config) {
        await window.electron.config.save(config);
        // Reload config after saving
        await this.loadConfig();
      } else {
        // Fallback to localStorage if Electron is not available
        const current = await this.loadConfig();
        const updated = { ...current, ...config };
        localStorage.setItem('app_config', JSON.stringify(updated));
        this.config = updated;
        this.notifyListeners();
      }
    } catch (error: any) {
      console.error('Failed to save config:', error);
      throw new Error(error.message || 'Failed to save configuration');
    }
  }

  /**
   * Get current configuration (cached)
   */
  getConfig(): AppConfig | null {
    return this.config;
  }

  /**
   * Get default configuration
   */
  getDefaultConfig(): AppConfig {
    return {
      mode: 'server',
      serverPort: 3000,
      database: {
        type: 'sqlite',
        path: './database.db',
      },
      theme: 'system',
    };
  }

  /**
   * Get API base URL from configuration
   */
  getApiBaseUrl(): string {
    const config = this.config || this.getDefaultConfig();
    
    if (config.mode === 'client' && config.serverAddress) {
      const port = config.serverPort || 3000;
      return `http://${config.serverAddress}:${port}/api/v1`;
    }
    
    // Server mode or fallback
    const port = config.serverPort || 3000;
    return `http://localhost:${port}/api/v1`;
  }

  /**
   * Subscribe to config changes
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener());
  }
}

export const configService = new ConfigService();

// Export types
export type { AppConfig };

