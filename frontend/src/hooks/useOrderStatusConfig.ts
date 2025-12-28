import { useState, useEffect } from 'react';
import api from '../lib/api';

export interface OrderStatusConfig {
  color: string;
  backgroundColor?: string;
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string;
  text: string;
}

export interface OrderStatusesConfig {
  [status: string]: OrderStatusConfig;
}

const defaultConfig: OrderStatusesConfig = {
  PENDING: {
    color: '#f59e0b',
    backgroundColor: '#fef3c7',
    text: 'Pendiente de Recibir',
  },
  RECEIVED: {
    color: '#16a34a',
    backgroundColor: '#dcfce7',
    text: 'Pendiente de avisar',
  },
  NOTIFIED_CALL: {
    color: '#16a34a',
    backgroundColor: '#dcfce7',
    text: 'Avisado (Llamada)',
  },
  NOTIFIED_WHATSAPP: {
    color: '#16a34a',
    backgroundColor: '#dcfce7',
    text: 'Avisado (WhatsApp)',
  },
  CANCELLED: {
    color: '#dc2626',
    backgroundColor: '#fee2e2',
    text: 'Cancelado',
  },
  INCOMPLETO: {
    color: '#dc2626',
    backgroundColor: '#fee2e2',
    text: 'Incompleto',
  },
  DELIVERED_COUNTER: {
    color: '#16a34a',
    backgroundColor: '#dcfce7',
    text: 'Entregado en Mostrador',
  },
  READY_TO_SEND: {
    color: '#3b82f6',
    backgroundColor: '#dbeafe',
    text: 'Preparado para enviar',
  },
};

let cachedConfig: OrderStatusesConfig | null = null;
let configPromise: Promise<OrderStatusesConfig> | null = null;
let cacheVersion = 0; // Version counter to force reloads

/**
 * Hook to get order status configuration
 * Caches the config to avoid multiple API calls
 */
export function useOrderStatusConfig() {
  const [config, setConfig] = useState<OrderStatusesConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(cacheVersion);

  useEffect(() => {
    const loadConfig = () => {
    // If we have cached config, use it immediately
    if (cachedConfig) {
      setConfig(cachedConfig);
      setLoading(false);
      return;
    }

    // If there's already a request in progress, wait for it
    if (configPromise) {
      configPromise.then((loadedConfig) => {
        setConfig(loadedConfig);
        setLoading(false);
      }).catch(() => {
        setConfig(defaultConfig);
        setLoading(false);
      });
      return;
    }

    // Load config from API
    configPromise = api.get<{ success: boolean; data: OrderStatusesConfig }>('/config/order-statuses')
      .then((response) => {
        if (response.data.success) {
          const loadedConfig = { ...defaultConfig, ...response.data.data };
          cachedConfig = loadedConfig;
          return loadedConfig;
        }
        return defaultConfig;
      })
      .catch((error) => {
        console.error('Failed to load order status config:', error);
        return defaultConfig;
      });

    configPromise.then((loadedConfig) => {
      setConfig(loadedConfig);
      setLoading(false);
        configPromise = null; // Clear promise after use
      });
    };

    loadConfig();
  }, [version]); // Re-run when version changes

  // Listen for cache clear events
  useEffect(() => {
    const handleCacheClear = () => {
      setVersion(cacheVersion);
    };

    // Check version periodically (every 2 seconds) to detect cache clears
    const interval = setInterval(() => {
      if (cacheVersion !== version) {
        setVersion(cacheVersion);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [version]);

  return { config, loading };
}

/**
 * Get status configuration for a specific status
 */
export function getStatusConfig(status: string, config: OrderStatusesConfig): OrderStatusConfig {
  return config[status] || {
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    text: status,
  };
}

/**
 * Clear cached config (useful after updating)
 */
export function clearStatusConfigCache() {
  cachedConfig = null;
  configPromise = null;
  cacheVersion++; // Increment version to trigger reloads
}

