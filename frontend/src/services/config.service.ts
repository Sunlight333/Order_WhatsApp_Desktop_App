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
  language?: 'es' | 'en';
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
   * Returns information about whether server restart is needed
   */
  async saveConfig(config: Partial<AppConfig>): Promise<{ needsRestart: boolean; newPort?: number }> {
    try {
      if (window.electron?.config) {
        const result = await window.electron.config.save(config);
        // Reload config after saving
        await this.loadConfig();
        return result || { needsRestart: false };
      } else {
        // Fallback to localStorage if Electron is not available
        const current = await this.loadConfig();
        const updated = { ...current, ...config };
        localStorage.setItem('app_config', JSON.stringify(updated));
        this.config = updated;
        this.notifyListeners();
        return { needsRestart: false };
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
      language: 'es', // Spanish is default
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
    
    // Server mode or fallback - use 127.0.0.1 instead of localhost to avoid IPv6 (::1) issues
    const port = config.serverPort || 3000;
    return `http://127.0.0.1:${port}/api/v1`;
  }

  /**
   * Get base server URL (without /api/v1) for static assets like avatars
   */
  getServerBaseUrl(): string {
    const config = this.config || this.getDefaultConfig();
    
    if (config.mode === 'client' && config.serverAddress) {
      const port = config.serverPort || 3000;
      return `http://${config.serverAddress}:${port}`;
    }
    
    // Server mode or fallback - use 127.0.0.1 instead of localhost to avoid IPv6 (::1) issues
    const port = config.serverPort || 3000;
    return `http://127.0.0.1:${port}`;
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

