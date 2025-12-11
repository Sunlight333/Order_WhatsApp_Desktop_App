import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import os from 'os';

dotenv.config();

/**
 * Get the Electron config file path
 * In Electron, config is stored in userData/config.json
 * When running standalone, try to find it in the same location
 */
function getElectronConfigPath(): string | null {
  try {
    // Try to get from environment variable first (set by Electron)
    if (process.env.ELECTRON_USER_DATA) {
      return path.join(process.env.ELECTRON_USER_DATA, 'config.json');
    }
    
    // Try common Electron userData locations
    const platform = process.platform;
    let userDataPath: string;
    
    if (platform === 'win32') {
      userDataPath = path.join(os.homedir(), 'AppData', 'Roaming', 'order-whatsapp-desktop-app');
    } else if (platform === 'darwin') {
      userDataPath = path.join(os.homedir(), 'Library', 'Application Support', 'order-whatsapp-desktop-app');
    } else {
      // Linux
      userDataPath = path.join(os.homedir(), '.config', 'order-whatsapp-desktop-app');
    }
    
    const configPath = path.join(userDataPath, 'config.json');
    if (fs.existsSync(configPath)) {
      return configPath;
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Read port from Electron config file
 */
function getPortFromConfig(): number | null {
  try {
    const configPath = getElectronConfigPath();
    if (!configPath) {
      return null;
    }
    
    const configData = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(configData);
    
    // Check if serverPort is set and mode is 'server'
    if (config.mode === 'server' && config.serverPort) {
      return parseInt(String(config.serverPort), 10);
    }
    
    return null;
  } catch (error) {
    // Config file doesn't exist or is invalid, that's okay
    return null;
  }
}

// Get port priority: 1. process.env.PORT, 2. Electron config.json, 3. default 3000
const portFromEnv = process.env.PORT ? parseInt(process.env.PORT, 10) : null;
const portFromConfig = getPortFromConfig();
const defaultPort = 3000;

const finalPort = portFromEnv || portFromConfig || defaultPort;

if (portFromConfig && !portFromEnv) {
  console.log(`📋 Using port ${finalPort} from Electron config file`);
} else if (portFromEnv) {
  console.log(`🔌 Using port ${finalPort} from environment variable`);
} else {
  console.log(`🔌 Using default port ${finalPort}`);
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: finalPort,
  database: {
    provider: (process.env.DATABASE_PROVIDER || 'sqlite') as 'sqlite' | 'mysql' | 'postgresql',
    url: process.env.DATABASE_URL || 'file:./database.db',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'change-me-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
};

