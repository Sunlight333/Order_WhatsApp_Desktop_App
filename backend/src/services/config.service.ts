import { getPrismaClient } from '../config/database';

const prisma = getPrismaClient();

/**
 * Default configuration values
 */
const DEFAULT_CONFIGS: Record<string, string> = {
  whatsapp_default_message: 'Hola, tu pedido está listo para recoger.',
};

/**
 * Get configuration value by key
 * Auto-creates default configs if they don't exist
 */
export async function getConfigValue(key: string) {
  let config = await prisma.config.findUnique({
    where: { key },
  });

  // If config doesn't exist and we have a default, create it
  if (!config && DEFAULT_CONFIGS[key]) {
    config = await prisma.config.create({
      data: {
        key,
        value: DEFAULT_CONFIGS[key],
      },
    });
  }

  return config;
}

/**
 * Update configuration value
 */
export async function updateConfigValue(key: string, value: string) {
  const config = await prisma.config.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });

  return config;
}

/**
 * Order status configuration interface
 */
export interface OrderStatusConfig {
  color: string; // Hex color code
  backgroundColor?: string; // Hex color code for background
  fontFamily?: string; // Font family
  fontSize?: string; // Font size (e.g., "14px", "1rem")
  fontWeight?: string; // Font weight (e.g., "normal", "bold", "600")
  text: string; // Display text for the status
}

export interface OrderStatusesConfig {
  [status: string]: OrderStatusConfig;
}

/**
 * Default order status configurations
 */
const DEFAULT_ORDER_STATUSES: OrderStatusesConfig = {
  PENDING: {
    color: '#f59e0b',
    backgroundColor: '#fef3c7',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    fontWeight: 'normal',
    text: 'Pendiente',
  },
  RECEIVED: {
    color: '#16a34a',
    backgroundColor: '#dcfce7',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    fontWeight: 'normal',
    text: 'Recibido',
  },
  NOTIFIED_CALL: {
    color: '#16a34a',
    backgroundColor: '#dcfce7',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    fontWeight: 'normal',
    text: 'Avisado (Llamada)',
  },
  NOTIFIED_WHATSAPP: {
    color: '#16a34a',
    backgroundColor: '#dcfce7',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    fontWeight: 'normal',
    text: 'Avisado (WhatsApp)',
  },
  CANCELLED: {
    color: '#dc2626',
    backgroundColor: '#fee2e2',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    fontWeight: 'normal',
    text: 'Cancelado',
  },
  INCOMPLETO: {
    color: '#dc2626',
    backgroundColor: '#fee2e2',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    fontWeight: 'normal',
    text: 'Incompleto',
  },
  DELIVERED_COUNTER: {
    color: '#16a34a',
    backgroundColor: '#dcfce7',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    fontWeight: 'normal',
    text: 'Entregado en Mostrador',
  },
};

/**
 * Get order status configuration
 */
export async function getOrderStatusConfig(): Promise<OrderStatusesConfig> {
  const config = await getConfigValue('order_statuses_config');
  
  if (!config || !config.value) {
    // Return defaults and save them
    await updateConfigValue('order_statuses_config', JSON.stringify(DEFAULT_ORDER_STATUSES));
    return DEFAULT_ORDER_STATUSES;
  }

  try {
    const parsed = JSON.parse(config.value) as OrderStatusesConfig;
    // Merge with defaults to ensure all statuses are present
    return { ...DEFAULT_ORDER_STATUSES, ...parsed };
  } catch (error) {
    console.error('Failed to parse order status config:', error);
    return DEFAULT_ORDER_STATUSES;
  }
}

/**
 * Update order status configuration
 */
export async function updateOrderStatusConfig(config: OrderStatusesConfig): Promise<OrderStatusesConfig> {
  // Validate that all required statuses are present
  const validStatuses = ['PENDING', 'RECEIVED', 'NOTIFIED_CALL', 'NOTIFIED_WHATSAPP', 'CANCELLED', 'INCOMPLETO', 'DELIVERED_COUNTER'];
  const mergedConfig: OrderStatusesConfig = { ...DEFAULT_ORDER_STATUSES };

  // Only update statuses that are valid
  for (const status of validStatuses) {
    if (config[status]) {
      mergedConfig[status] = {
        ...DEFAULT_ORDER_STATUSES[status],
        ...config[status],
      };
    }
  }

  await updateConfigValue('order_statuses_config', JSON.stringify(mergedConfig));
  return mergedConfig;
}