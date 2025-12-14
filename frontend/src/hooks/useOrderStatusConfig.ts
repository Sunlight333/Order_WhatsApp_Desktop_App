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
    text: 'Pendiente',
  },
  RECEIVED: {
    color: '#16a34a',
    backgroundColor: '#dcfce7',
    text: 'Recibido',
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
};

let cachedConfig: OrderStatusesConfig | null = null;
let configPromise: Promise<OrderStatusesConfig> | null = null;

/**
 * Hook to get order status configuration
 * Caches the config to avoid multiple API calls
 */
export function useOrderStatusConfig() {
  const [config, setConfig] = useState<OrderStatusesConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
    });
  }, []);

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
}

